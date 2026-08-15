const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'data', 'beers.db');
const db = new Database(dbPath);

try {
    db.exec('BEGIN');

    db.exec(`CREATE TABLE IF NOT EXISTS beer_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total INTEGER NOT NULL DEFAULT 0,
    lastUpdated TEXT
  );`);

    const row = db.prepare('SELECT COALESCE(SUM(count), 0) as total FROM beers').get();
    const total = row ? row.total : 0;

    db.prepare('INSERT OR REPLACE INTO beer_stats(id, total, lastUpdated) VALUES (1, ?, NULL)').run(total);

    db.exec('COMMIT');
    console.log(`beer_stats created and populated with total=${total}`);
} catch (err) {
    console.error('Migration 002 failed:', err);
    try { db.exec('ROLLBACK'); } catch (e) { }
    process.exit(1);
} finally {
    db.close();
}
