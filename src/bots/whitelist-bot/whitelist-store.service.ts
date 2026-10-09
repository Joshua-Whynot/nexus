import { Injectable } from '@nestjs/common';
import Database from 'better-sqlite3';
import { join } from 'path';

export type WhitelistRow = {
    id: number;
    discordID: string;
    discordUser?: string | null;
    minecraftUser: string;
};

@Injectable()
export class WhitelistStoreService {
    private readonly db = new Database(join(process.cwd(), 'data', 'beers.db'));

    constructor() {
        this.ensureSchema();
    }

    private ensureSchema() {
        this.db
            .prepare(`
        CREATE TABLE IF NOT EXISTS minecraft_whitelist (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          discordID TEXT NOT NULL,
          discordUser TEXT,
          minecraftUser TEXT NOT NULL
        )
      `)
            .run();
    }

    addUser(payload: {
        discordID: string;
        discordUser?: string | null;
        minecraftUser: string;
    }): WhitelistRow {
        const minecraftUser = payload.minecraftUser.trim();

        if (!minecraftUser) {
            throw new Error('minecraftUser is required.');
        }

        const info = this.db
            .prepare(
                'INSERT INTO minecraft_whitelist (discordID, discordUser, minecraftUser) VALUES (?, ?, ?)',
            )
            .run(payload.discordID, payload.discordUser ?? null, minecraftUser);

        const row = this.db
            .prepare(
                'SELECT id, discordID, discordUser, minecraftUser FROM minecraft_whitelist WHERE id = ?',
            )
            .get(info.lastInsertRowid) as WhitelistRow | undefined;

        if (!row) {
            throw new Error('Failed to insert whitelist record.');
        }

        return row;
    }

    listUsers(): WhitelistRow[] {
        return this.db
            .prepare(
                'SELECT id, discordID, discordUser, minecraftUser FROM minecraft_whitelist ORDER BY id DESC',
            )
            .all() as WhitelistRow[];
    }

    clearAll() {
        this.db.prepare('DELETE FROM minecraft_whitelist').run();
    }
}
