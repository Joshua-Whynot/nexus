const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataPath = path.join(process.cwd(), 'data');
const botsDb = new Database(path.join(dataPath, 'bots.db'));
const beersDbPath = path.join(dataPath, 'beers.db');
const beersDb = fs.existsSync(beersDbPath)
    ? new Database(beersDbPath, { readonly: true })
    : null;

try {
    botsDb.exec('BEGIN');
    botsDb.exec(`
    CREATE TABLE IF NOT EXISTS minecraft_whitelist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discordID TEXT NOT NULL,
      discordUser TEXT,
      minecraftUser TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_minecraft_whitelist_username
      ON minecraft_whitelist (minecraftUser COLLATE NOCASE);
  `);

    const hasLegacyTable = beersDb?.prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'minecraft_whitelist'",
    ).get();

    if (hasLegacyTable) {
        const insert = botsDb.prepare(`
      INSERT OR IGNORE INTO minecraft_whitelist (discordID, discordUser, minecraftUser)
      VALUES (?, ?, ?)
    `);
        const legacyRows = beersDb.prepare(`
      SELECT discordID, discordUser, minecraftUser
      FROM minecraft_whitelist
      ORDER BY id
    `).all();

        for (const row of legacyRows) {
            insert.run(row.discordID, row.discordUser, row.minecraftUser);
        }
    }

    botsDb.exec('COMMIT');
    console.log('Whitelist table created in bots.db and legacy rows copied.');
} catch (error) {
    try { botsDb.exec('ROLLBACK'); } catch { }
    console.error('Migration 005 failed:', error);
    process.exitCode = 1;
} finally {
    beersDb?.close();
    botsDb.close();
}