const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'data', 'beers.db');
const db = new Database(dbPath);

try {
  db.exec('BEGIN');
  db.exec('DROP TABLE IF EXISTS beer_stats');
  db.exec('COMMIT');
  console.log('beer_stats table dropped');
} catch (err) {
  console.error('Down migration 002 failed:', err);
  try { db.exec('ROLLBACK'); } catch (e) {}
  process.exit(1);
} finally {
  db.close();
}
