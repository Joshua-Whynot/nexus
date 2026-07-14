import { Module } from '@nestjs/common';
import { BeerBotService } from './beer-bot.service';
import { BeerStore } from './beer-store.service';

@Module({
  providers: [BeerBotService, BeerStore],
  exports: [BeerBotService],
})
export class BeerBotModule {}
