const path = require('path');
const Database = require('better-sqlite3');

const dataPath = path.join(process.cwd(), 'data');
const botsDb = new Database(path.join(dataPath, 'bots.db'), { readonly: true });
const beersDb = new Database(path.join(dataPath, 'beers.db'));

try {
    const hasBeerTable = botsDb.prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'beers'",
    ).get();

    if (hasBeerTable) {
        beersDb.exec(`
      CREATE TABLE IF NOT EXISTS beers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discordID TEXT NOT NULL,
        discordUser TEXT,
        count INTEGER NOT NULL DEFAULT 0
      )
    `);
        const rows = botsDb.prepare(
            'SELECT discordID, discordUser, count FROM beers ORDER BY id',
        ).all();
        const exists = beersDb.prepare(
            'SELECT 1 FROM beers WHERE discordID = ? LIMIT 1',
        );
        const insert = beersDb.prepare(
            'INSERT INTO beers (discordID, discordUser, count) VALUES (?, ?, ?)',
        );
        const tx = beersDb.transaction((beerRows) => {
            for (const row of beerRows) {
                if (!exists.get(row.discordID)) {
                    insert.run(row.discordID, row.discordUser, row.count);
                }
            }
        });
        tx(rows);
    }

    console.log('Beer data copied back to beers.db.');
} catch (error) {
    console.error('Down migration 006 failed:', error);
    process.exitCode = 1;
} finally {
    botsDb.close();
    beersDb.close();
}