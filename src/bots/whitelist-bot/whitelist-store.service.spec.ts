import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { WhitelistStoreService } from './whitelist-store.service';

describe('WhitelistStoreService', () => {
    let service: WhitelistStoreService;
    let originalCwd: string;
    let testDirectory: string;

    beforeEach(() => {
        originalCwd = process.cwd();
        testDirectory = mkdtempSync(join(tmpdir(), 'whitelist-store-'));
        mkdirSync(join(testDirectory, 'data'));
        process.chdir(testDirectory);
        service = new WhitelistStoreService();
    });

    afterEach(() => {
        service.onModuleDestroy();
        process.chdir(originalCwd);
        rmSync(testDirectory, { recursive: true, force: true });
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

    it('rejects a username that is already whitelisted, ignoring case', () => {
        service.addUser({
            discordID: 'discord-123',
            minecraftUser: 'Alice',
        });

        expect(() =>
            service.addUser({
                discordID: 'discord-456',
                minecraftUser: 'alice',
            }),
        ).toThrow('Minecraft username is already whitelisted.');
    });
});
