const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const root = process.cwd();
const dataDir = path.join(root, 'data');
const dbPath = path.join(dataDir, 'beers.db');
const jsonPath = path.join(root, 'beer-count.json');

function main() {
    if (!fs.existsSync(jsonPath)) {
        console.error('beer-count.json not found, skipping import');
        process.exit(0);
    }

    fs.mkdirSync(dataDir, { recursive: true });

    const raw = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(raw);
    const users = data.users || {};

    const db = new Database(dbPath);

    const insert = db.prepare('INSERT INTO beers(discordID, discordUser, count) VALUES (?, ?, ?)');
    const update = db.prepare('UPDATE beers SET discordUser = ?, count = ? WHERE discordID = ?');

    const tx = db.transaction((entries) => {
        for (const [discordID, info] of entries) {
            const username = info.username || null;
            const count = Number(info.count) || 0;
            const res = update.run(username, count, discordID);
            if (res.changes === 0) {
                insert.run(discordID, username, count);
            }
        }
    });

    const entries = Object.entries(users);
    tx(entries);

    console.log(`Imported ${entries.length} users into ${dbPath}`);
    db.close();
}

main();
