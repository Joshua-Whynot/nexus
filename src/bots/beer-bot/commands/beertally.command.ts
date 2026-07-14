import { Logger } from '@nestjs/common';
import {
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  TextChannel,
} from 'discord.js';
import { SlashCommand } from './command.interface';
import { BeerStore } from '../beer-store.service';

/**
 * `/beertally` — re-scans the channel history, recomputes the delta-based
 * tally, and overwrites the saved data. Restricted to a single admin user.
 */
export class BeerTallyCommand implements SlashCommand {
  private readonly logger = new Logger(BeerTallyCommand.name);

  readonly data = new SlashCommandBuilder()
    .setName('beertally')
    .setDescription(
      'Scan this channel and tally each person’s beers and the total.',
    )
    .toJSON();

  constructor(
    private readonly store: BeerStore,
    private readonly client: Client,
    private readonly channelId: string,
    private readonly adminId: string,
  ) {}

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (interaction.user.id !== this.adminId) {
      await interaction.reply({
        content: '⛔ You are not allowed to run this command.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const channel = await this.client.channels.fetch(this.channelId);
      if (!channel || !channel.isTextBased()) {
        await interaction.editReply('❌ Could not access the beer channel.');
        return;
      }

      const { total, users } = await this.store.tallyChannel(
        channel as TextChannel,
      );

      await this.store.save({
        total,
        users,
        lastUpdated: new Date().toISOString(),
      });

      const breakdown = this.store.formatLeaderboard(
        users,
        'No beers found in this channel yet.',
      );

      const embed = new EmbedBuilder()
        .setTitle('🍺 Beer Tally')
        .setDescription(breakdown)
        .addFields({ name: 'Total beers', value: `${total}`, inline: true })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      this.logger.log(`Beer tally complete: ${total} total beers.`);
    } catch (error) {
      this.logger.error('Failed to run beer tally', error);
      await interaction.editReply('❌ Failed to tally beers. Try again!');
    }
  }
}
