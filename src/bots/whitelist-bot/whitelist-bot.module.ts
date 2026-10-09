import { Module } from '@nestjs/common';
import { GraphqlModule } from '../../graphql/graphql.module';
import { WhitelistService } from '../../graphql/whitelist/whitelist.service';
import { WhitelistBotService } from './whitelist-bot.service';
import { WhitelistSyncService } from './whitelist-sync.service';

@Module({
    imports: [GraphqlModule],
    providers: [WhitelistService, WhitelistSyncService, WhitelistBotService],
    exports: [WhitelistService, WhitelistSyncService],
})
export class WhitelistBotModule { }
