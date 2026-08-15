import { Module } from '@nestjs/common';
import { GraphqlModule } from '../../graphql/graphql.module';
import { BeerBotService } from './beer-bot.service';
import { BeerStore } from './beer-store.service';

@Module({
  imports: [GraphqlModule],
  providers: [BeerBotService, BeerStore],
  exports: [BeerBotService],
})
export class BeerBotModule { }
