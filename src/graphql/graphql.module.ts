import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { BeerResolver } from './beer_bot/beer.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot({
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      sortSchema: true,
    }),
  ],
  providers: [BeerResolver],
  exports: [BeerResolver],
})
export class GraphqlModule {}

export default GraphqlModule;
