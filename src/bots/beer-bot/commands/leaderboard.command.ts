import { Logger } from '@nestjs/common';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { SlashCommand } from './command.interface';
import { BeerStore } from '../beer-store.service';

/** `/leaderboard` — shows the saved leaderboard without re-scanning. */
export class LeaderboardCommand implements SlashCommand {
  private readonly logger = new Logger(LeaderboardCommand.name);

  readonly data = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the saved beer leaderboard.')
    .toJSON();

  constructor(private readonly store: BeerStore) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const data = await this.store.load();
      const breakdown = this.store.formatLeaderboard(
        data.users,
        'No beers recorded yet. Run /beertally first.',
      );

      const embed = new EmbedBuilder()
        .setTitle('🍺 Beer Leaderboard')
        .setDescription(breakdown)
        .addFields(
          { name: 'Total beers', value: `${data.total}`, inline: true },
          {
            name: 'Last updated',
            value: `<t:${Math.floor(new Date(data.lastUpdated).getTime() / 1000)}:R>`,
            inline: true,
          },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      this.logger.error('Failed to show leaderboard', error);
      await interaction.reply('❌ Failed to load the leaderboard.');
    }
  }
}
