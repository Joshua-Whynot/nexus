import { Logger } from '@nestjs/common';
import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
} from 'discord.js';
import { WhitelistService } from '../../../graphql/whitelist/whitelist.service';
import { WhitelistSyncService } from '../whitelist-sync.service';

export class WhitelistCommand {
    private readonly logger = new Logger(WhitelistCommand.name);

    readonly data = new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Add a Minecraft username to the whitelist queue.')
        .addStringOption((option) =>
            option
                .setName('username')
                .setDescription('Minecraft username to add')
                .setRequired(true),
        )
        .toJSON();

    constructor(
        private readonly whitelistService: WhitelistService,
        private readonly syncService: WhitelistSyncService,
    ) { }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();

        const minecraftUser = interaction.options.getString('username', true).trim();
        if (!minecraftUser) {
            await interaction.editReply('Please provide a valid Minecraft username.');
            return;
        }

        try {
            const row = this.whitelistService.createWhitelist({
                discordID: interaction.user.id,
                discordUser: interaction.user.username,
                minecraftUser,
            });

            await this.syncService.syncUser(row.minecraftUser);

            await interaction.editReply(
                `✅ Added ${row.minecraftUser} to the whitelist queue for ${interaction.user.tag}.`,
            );
        } catch (error) {
            this.logger.error('Failed to add whitelist entry from slash command.', error);
            await interaction.editReply(
                '❌ I could not add that username to the whitelist queue.',
            );
        }
    }
}
