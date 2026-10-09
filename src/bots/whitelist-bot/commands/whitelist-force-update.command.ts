import { Logger } from '@nestjs/common';
import {
    ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
} from 'discord.js';
import { WhitelistSyncService } from '../whitelist-sync.service';

export class WhitelistForceUpdateCommand {
    private readonly logger = new Logger(WhitelistForceUpdateCommand.name);

    readonly data = new SlashCommandBuilder()
        .setName('whitelist-force-update')
        .setDescription('Force-send the saved whitelist queue to every server.')
        .toJSON();

    constructor(
        private readonly syncService: WhitelistSyncService,
        private readonly adminDiscordId: string,
    ) { }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        if (interaction.user.id !== this.adminDiscordId) {
            await interaction.reply({
                content: 'You are not allowed to run this command.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const result = await this.syncService.syncAll();
            if (result.usernameCount === 0) {
                await interaction.editReply('The whitelist queue is empty.');
                return;
            }

            await interaction.editReply(
                `Whitelist force update finished: ${result.synced} server entries sent, ${result.failed} failed.`,
            );
        } catch (error) {
            this.logger.error('Whitelist force update failed.', error);
            await interaction.editReply(
                'Whitelist force update failed. Check the bot logs for details.',
            );
        }
    }
}