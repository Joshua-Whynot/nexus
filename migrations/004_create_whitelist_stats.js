//Migration 004, adds whitelist_stats table

const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'data', 'beers.db');
const db = new Database(dbPath);

try {
    db.exec('BEGIN');

    db.exec(`CREATE TABLE IF NOT EXISTS whitelist_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total INTEGER NOT NULL DEFAULT 0,
    lastUpdated TEXT
  );`);
    db.exec('COMMIT');
} catch (err) {
    console.error('Migration 004 failed:', err);
    try { db.exec('ROLLBACK'); } catch (e) { }
    process.exit(1);
} finally {
    db.close();
}