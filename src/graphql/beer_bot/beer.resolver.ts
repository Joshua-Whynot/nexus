import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Beer, BeerStats } from './beer.types';
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'beers.db');

@Resolver(() => Beer)
export class BeerResolver {
    @Query(() => Beer, { nullable: true })
    beer(@Args('discordID') discordID: string): any {
        const db = new Database(dbPath);
        const row = db.prepare('SELECT id, discordID, discordUser, count FROM beers WHERE discordID = ?').get(discordID);
        db.close();
        return row || null;
    }

    @Query(() => [Beer])
    beers(): any[] {
        const db = new Database(dbPath);
        const rows = db.prepare('SELECT id, discordID, discordUser, count FROM beers').all();
        db.close();
        return rows;
    }

    @Query(() => BeerStats, { nullable: true })
    beerStats(): any {
        const db = new Database(dbPath);
        const row = db.prepare('SELECT id, total, lastUpdated FROM beer_stats WHERE id = 1').get();
        db.close();
        return row || null;
    }

    @Mutation(() => Beer)
    createBeer(
        @Args('discordID') discordID: string,
        @Args('discordUser') discordUser?: string,
        @Args('count') count?: number,
    ): any {
        const db = new Database(dbPath);
        const insert = db.prepare('INSERT INTO beers(discordID, discordUser, count) VALUES (?, ?, ?)');
        const info = insert.run(discordID, discordUser || null, Number(count) || 0);
        const row = db.prepare('SELECT id, discordID, discordUser, count FROM beers WHERE id = ?').get(info.lastInsertRowid);
        db.close();
        return row;
    }

    @Mutation(() => Beer)
    updateBeer(
        @Args('discordID') discordID: string,
        @Args('discordUser') discordUser?: string,
        @Args('count') count?: number,
    ): any {
        const db = new Database(dbPath);
        const updateParts: string[] = [];
        const params: any[] = [];
        if (typeof discordUser !== 'undefined') {
            updateParts.push('discordUser = ?');
            params.push(discordUser);
        }
        if (typeof count !== 'undefined') {
            updateParts.push('count = ?');
            params.push(Number(count));
        }
        if (updateParts.length === 0) {
            const row = db.prepare('SELECT id, discordID, discordUser, count FROM beers WHERE discordID = ?').get(discordID);
            db.close();
            return row;
        }
        params.push(discordID);
        const stmt = db.prepare(`UPDATE beers SET ${updateParts.join(', ')} WHERE discordID = ?`);
        stmt.run(...params);
        const row = db.prepare('SELECT id, discordID, discordUser, count FROM beers WHERE discordID = ?').get(discordID);
        db.close();
        return row;
    }

    @Mutation(() => Boolean)
    deleteBeer(@Args('discordID') discordID: string): boolean {
        const db = new Database(dbPath);
        const stmt = db.prepare('DELETE FROM beers WHERE discordID = ?');
        const info = stmt.run(discordID);
        db.close();
        return info.changes > 0;
    }
}

export default BeerResolver;

