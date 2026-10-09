import { WhitelistStoreService } from './whitelist-store.service';

describe('WhitelistStoreService', () => {
    let service: WhitelistStoreService;

    beforeEach(() => {
        service = new WhitelistStoreService();
        service.clearAll();
    });

    afterEach(() => {
        service.clearAll();
    });

    it('stores and returns a minecraft username for a discord user', () => {
        const row = service.addUser({
            discordID: 'discord-123',
            discordUser: 'Alice',
            minecraftUser: 'alice',
        });

        expect(row).toMatchObject({
            discordID: 'discord-123',
            discordUser: 'Alice',
            minecraftUser: 'alice',
        });
        expect(row.id).toEqual(expect.any(Number));

        expect(service.listUsers()).toEqual([
            expect.objectContaining({
                id: row.id,
                discordID: 'discord-123',
                discordUser: 'Alice',
                minecraftUser: 'alice',
            }),
        ]);
    });
});
