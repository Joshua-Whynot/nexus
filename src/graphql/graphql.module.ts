import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { WhitelistStoreService } from '../bots/whitelist-bot/whitelist-store.service';
import { DbExecutor } from '../common/db.executor';
import { SqliteProvider } from '../common/sqlite.provider';
import { BeerResolver } from './beer_bot/beer.resolver';
import { BeerService } from './beer_bot/beer.service';
import { WhitelistResolver } from './whitelist/whitelist.resolver';
import { WhitelistService } from './whitelist/whitelist.service';

@Module({
    imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            autoSchemaFile: join(process.cwd(), 'schema.gql'),
            sortSchema: true,
        }),
    ],
    providers: [
        SqliteProvider,
        BeerService,
        WhitelistStoreService,
        WhitelistService,
        DbExecutor,
        BeerResolver,
        WhitelistResolver,
    ],
    exports: [
        BeerResolver,
        BeerService,
        WhitelistResolver,
        WhitelistStoreService,
        WhitelistService,
        DbExecutor,
    ],
})
export class GraphqlModule { }

export default GraphqlModule;
