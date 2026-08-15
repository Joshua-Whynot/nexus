import { Injectable, Inject } from '@nestjs/common';
import { SQLITE_DB } from './sqlite.provider';
import type { Operation } from '../graphql/beer_bot/ops';

@Injectable()
export class DbExecutor {
  constructor(@Inject(SQLITE_DB) private readonly db: any) {}

  apply(ops: Operation[]) {
    const results: any[] = [];
    this.db.exec('BEGIN');
    try {
      for (const op of ops) {
        if (op.kind === 'insert') {
          const info = this.db
            .prepare('INSERT INTO beers(discordID, discordUser, count) VALUES (?, ?, ?)')
            .run(op.discordID, op.discordUser ?? null, op.count ?? 0);
          const row = this.db.prepare('SELECT id, discordID, discordUser, count FROM beers WHERE id = ?').get(info.lastInsertRowid);
          results.push(row);
        } else if (op.kind === 'update') {
          const updateParts: string[] = [];
          const params: any[] = [];
          if (typeof op.discordUser !== 'undefined') {
            updateParts.push('discordUser = ?');
            params.push(op.discordUser);
          }
          if (typeof op.count !== 'undefined') {
            updateParts.push('count = ?');
            params.push(Number(op.count));
          }
          if (updateParts.length > 0) {
            params.push(op.discordID);
            this.db.prepare(`UPDATE beers SET ${updateParts.join(', ')} WHERE discordID = ?`).run(...params);
          }
          const row = this.db.prepare('SELECT id, discordID, discordUser, count FROM beers WHERE discordID = ?').get(op.discordID);
          results.push(row);
        } else if (op.kind === 'delete') {
          const info = this.db.prepare('DELETE FROM beers WHERE discordID = ?').run(op.discordID);
          results.push(info.changes > 0);
        }
      }
      this.db.exec('COMMIT');
    } catch (err) {
      try { this.db.exec('ROLLBACK'); } catch (e) {}
      throw err;
    }
    return results;
  }
}

export default DbExecutor;
