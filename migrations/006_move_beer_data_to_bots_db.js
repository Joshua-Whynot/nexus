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
    if (!beersDb) {
        console.log('No legacy beers.db found; skipping beer data copy.');
        process.exitCode = 0;
    } else {
        const hasLegacyBeers = beersDb.prepare(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'beers'",
        ).get();

        if (!hasLegacyBeers) {
            console.log('No legacy beers table found; skipping beer data copy.');
        } else {
            botsDb.exec('BEGIN');
            const legacyRows = beersDb.prepare(
                'SELECT discordID, discordUser, count FROM beers ORDER BY id',
            ).all();
            const exists = botsDb.prepare(
                'SELECT 1 FROM beers WHERE discordID = ? LIMIT 1',
            );
            const insert = botsDb.prepare(
                'INSERT INTO beers (discordID, discordUser, count) VALUES (?, ?, ?)',
            );

            for (const row of legacyRows) {
                if (!exists.get(row.discordID)) {
                    insert.run(row.discordID, row.discordUser, row.count);
                }
            }

            const hasLegacyStats = beersDb.prepare(
                "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'beer_stats'",
            ).get();
            const legacyStats = hasLegacyStats
                ? beersDb.prepare(
                    'SELECT lastUpdated FROM beer_stats WHERE id = 1',
                ).get()
                : null;

            botsDb.prepare(`
        INSERT OR IGNORE INTO beer_stats (id, total, lastUpdated)
        VALUES (1, (SELECT COALESCE(SUM(count), 0) FROM beers), ?)
      `).run(legacyStats?.lastUpdated ?? null);
            botsDb.prepare(`
        UPDATE beer_stats
        SET total = (SELECT COALESCE(SUM(count), 0) FROM beers),
            lastUpdated = COALESCE(lastUpdated, ?)
        WHERE id = 1
      `).run(legacyStats?.lastUpdated ?? null);

            botsDb.exec('COMMIT');
            console.log(`Merged legacy beer rows into bots.db from ${beersDbPath}.`);
        }
    }
} catch (error) {
    try { botsDb.exec('ROLLBACK'); } catch { }
    console.error('Migration 006 failed:', error);
    process.exitCode = 1;
} finally {
    beersDb?.close();
    botsDb.close();
}