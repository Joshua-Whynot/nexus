import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Database from 'better-sqlite3';
import { join } from 'path';

export type WhitelistRow = {
    id: number;
    discordID: string;
    discordUser?: string | null;
    minecraftUser: string;
};

export class MinecraftUsernameAlreadyWhitelistedError extends Error {
    constructor() {
        super('Minecraft username is already whitelisted.');
        this.name = MinecraftUsernameAlreadyWhitelistedError.name;
    }
}

@Injectable()
export class WhitelistStoreService implements OnModuleDestroy {
    private readonly db = new Database(join(process.cwd(), 'data', 'bots.db'));

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
        this.db
            .prepare(
                'CREATE UNIQUE INDEX IF NOT EXISTS idx_minecraft_whitelist_username ON minecraft_whitelist (minecraftUser COLLATE NOCASE)',
            )
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

        let info: Database.RunResult;
        try {
            info = this.db
                .prepare(
                    'INSERT INTO minecraft_whitelist (discordID, discordUser, minecraftUser) VALUES (?, ?, ?)',
                )
                .run(payload.discordID, payload.discordUser ?? null, minecraftUser);
        } catch (error) {
            if (
                error instanceof Error &&
                'code' in error &&
                error.code === 'SQLITE_CONSTRAINT_UNIQUE'
            ) {
                throw new MinecraftUsernameAlreadyWhitelistedError();
            }
            throw error;
        }

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

    onModuleDestroy() {
        this.db.close();
    }
}
