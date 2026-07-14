import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BeerBotModule } from '../bots/beer-bot/beer-bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BeerBotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
