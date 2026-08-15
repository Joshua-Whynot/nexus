import { Inject, Injectable } from '@nestjs/common';
import { SQLITE_DB } from '../../common/sqlite.provider';
import type { Operation } from './ops';

@Injectable()
export class BeerService {
    constructor(@Inject(SQLITE_DB) private readonly db: any) { }

    // Reads remain the same — service provides read helpers
    findOne(discordID: string) {
        return this.db.prepare('SELECT id, discordID, discordUser, count FROM beers WHERE discordID = ?').get(discordID);
    }

    findAll() {
        return this.db.prepare('SELECT id, discordID, discordUser, count FROM beers').all();
    }

    getStats() {
        return this.db.prepare('SELECT id, total, lastUpdated FROM beer_stats WHERE id = 1').get();
    }

    setStats(total: number, lastUpdated: string | null) {
        this.db.prepare('INSERT OR REPLACE INTO beer_stats(id, total, lastUpdated) VALUES (1, ?, ?)').run(total, lastUpdated);
        return this.getStats();
    }

    // Mutations return operation descriptors instead of executing them directly
    createOp(payload: { discordID: string; discordUser?: string; count?: number }): Operation {
        return {
            kind: 'insert',
            discordID: payload.discordID,
            discordUser: payload.discordUser ?? null,
            count: payload.count ?? 0,
        };
    }

    updateOp(discordID: string, patch: { discordUser?: string; count?: number }): Operation {
        return {
            kind: 'update',
            discordID,
            discordUser: patch.discordUser,
            count: patch.count,
        };
    }

    deleteOp(discordID: string): Operation {
        return {
            kind: 'delete',
            discordID,
        };
    }
}

export default BeerService;
