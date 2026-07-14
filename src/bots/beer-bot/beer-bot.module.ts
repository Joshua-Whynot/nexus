import { Module } from '@nestjs/common';
import { BeerBotService } from './beer-bot.service';

@Module({
  providers: [BeerBotService],
  exports: [BeerBotService],
})
export class BeerBotModule {}
