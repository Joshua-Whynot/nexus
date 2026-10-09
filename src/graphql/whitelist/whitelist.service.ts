import { Injectable } from '@nestjs/common';
import { WhitelistStoreService } from '../../bots/whitelist-bot/whitelist-store.service';

@Injectable()
export class WhitelistService {
    constructor(private readonly store: WhitelistStoreService) { }

    findAll() {
        return this.store.listUsers();
    }

    createWhitelist(payload: {
        discordID: string;
        discordUser?: string | null;
        minecraftUser: string;
    }) {
        return this.store.addUser(payload);
    }
}

export default WhitelistService;
