const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const root = process.cwd();
const dbPath = path.join(root, 'data', 'beers.db');
const jsonPath = path.join(root, 'beer-count.json');

function main() {
    if (!fs.existsSync(jsonPath)) {
        console.error('beer-count.json not found, skipping down migration');
        process.exit(0);
    }

    const raw = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(raw);
    const users = data.users || {};

    const db = new Database(dbPath);

    const del = db.prepare('DELETE FROM beers WHERE discordID = ?');

    const tx = db.transaction((ids) => {
        for (const id of ids) {
            del.run(id);
        }
    });

    const ids = Object.keys(users);
    tx(ids);

    console.log(`Removed ${ids.length} users from ${dbPath}`);
    db.close();
}

main();
