const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(process.cwd(), 'data', 'bots.db'));

try {
    db.exec('DROP TABLE IF EXISTS minecraft_whitelist');
    console.log('Whitelist table dropped from bots.db.');
} catch (error) {
    console.error('Down migration 005 failed:', error);
    process.exitCode = 1;
} finally {
    db.close();
}