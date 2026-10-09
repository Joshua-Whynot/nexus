import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BeerBotModule } from '../bots/beer-bot/beer-bot.module';
import { WhitelistBotModule } from '../bots/whitelist-bot/whitelist-bot.module';
import { GraphqlModule } from '../graphql/graphql.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    GraphqlModule,
    BeerBotModule,
    WhitelistBotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
