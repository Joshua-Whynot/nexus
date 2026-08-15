import { Provider } from '@nestjs/common';
import Database from 'better-sqlite3';
import { join } from 'path';

export const SQLITE_DB = 'SQLITE_DB';

export const SqliteProvider: Provider = {
  provide: SQLITE_DB,
  useFactory: () => {
    const dbPath = join(process.cwd(), 'data', 'beers.db');
    const db = new Database(dbPath);
    return db;
  },
};
