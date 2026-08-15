import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { DbExecutor } from '../common/db.executor';
import { SqliteProvider } from '../common/sqlite.provider';
import { BeerResolver } from './beer_bot/beer.resolver';
import { BeerService } from './beer_bot/beer.service';

@Module({
    imports: [
        GraphQLModule.forRoot({
            autoSchemaFile: join(process.cwd(), 'schema.gql'),
            sortSchema: true,
        }),
    ],
    providers: [SqliteProvider, BeerService, DbExecutor, BeerResolver],
    exports: [BeerResolver, BeerService, DbExecutor],
})
export class GraphqlModule { }

export default GraphqlModule;
