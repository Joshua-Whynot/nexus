import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { WhitelistSyncService } from '../whitelist-sync.service';
import { WhitelistForceUpdateCommand } from './whitelist-force-update.command';

describe('WhitelistForceUpdateCommand', () => {
    const adminDiscordId = '179383654080970752';
    let syncService: jest.Mocked<Pick<WhitelistSyncService, 'syncAll'>>;
    let command: WhitelistForceUpdateCommand;

    beforeEach(() => {
        syncService = {
            syncAll: jest.fn(),
        };
        command = new WhitelistForceUpdateCommand(
            syncService as unknown as WhitelistSyncService,
            adminDiscordId,
        );
    });

    it('does not sync when invoked by another Discord user', async () => {
        const reply = jest.fn();
        const interaction = {
            user: { id: 'different-user' },
            reply,
        } as unknown as ChatInputCommandInteraction;

        await command.execute(interaction);

        expect(syncService.syncAll).not.toHaveBeenCalled();
        expect(reply).toHaveBeenCalledWith({
            content: 'You are not allowed to run this command.',
            flags: MessageFlags.Ephemeral,
        });
    });

    it('force-syncs the queue for the configured owner', async () => {
        const interaction = {
            user: { id: adminDiscordId },
            deferReply: jest.fn(),
            editReply: jest.fn(),
        } as unknown as ChatInputCommandInteraction;
        syncService.syncAll.mockResolvedValue({
            usernameCount: 2,
            serverCount: 2,
            synced: 4,
            failed: 0,
        });

        await command.execute(interaction);

        expect(syncService.syncAll).toHaveBeenCalledTimes(1);
        expect(interaction.editReply).toHaveBeenCalledWith(
            'Whitelist force update finished: 4 server entries sent, 0 failed.',
        );
    });
});
