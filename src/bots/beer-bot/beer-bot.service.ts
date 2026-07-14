import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  Client,
  GatewayIntentBits,
  Message,
  Interaction,
  TextChannel,
  Collection,
  EmbedBuilder,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface UserTally {
  username: string;
  count: number;
}

interface BeerData {
  total: number;
  users: Record<string, UserTally>;
  lastUpdated: string;
}

@Injectable()
export class BeerBotService implements OnModuleInit {
  private readonly logger = new Logger(BeerBotService.name);
  private client: Client;
  private readonly dataPath = path.join(process.cwd(), 'beer-count.json');
  private channelId: string | undefined;

  /** Only this Discord user is allowed to run /beertally. */
  private readonly tallyAdminId = '179383654080970752';

  async onModuleInit() {
    const token = process.env.DISCORD_BOT_TOKEN;
    this.channelId = process.env.BEER_CHANNEL_ID;

    if (!token) {
      this.logger.warn('DISCORD_BOT_TOKEN not set. Beer bot will not start.');
      return;
    }

    if (!this.channelId) {
      this.logger.warn('BEER_CHANNEL_ID not set. Beer bot will not start.');
      return;
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.client.once('ready', () => {
      this.logger.log(`Beer bot logged in as ${this.client.user?.tag}`);
      void this.registerCommands();
    });

    this.client.on('messageCreate', (message) => this.handleMessage(message));
    this.client.on('interactionCreate', (interaction) =>
      this.handleInteraction(interaction),
    );

    await this.client.login(token);
  }

  private async registerCommands() {
    try {
      const channel = await this.client.channels.fetch(this.channelId!);
      if (!channel || !channel.isTextBased() || !('guild' in channel)) {
        this.logger.warn(
          'Could not resolve a guild text channel to register commands.',
        );
        return;
      }

      const commands = [
        new SlashCommandBuilder()
          .setName('beertally')
          .setDescription(
            'Scan this channel and tally each person’s beers and the total.',
          )
          .toJSON(),
        new SlashCommandBuilder()
          .setName('leaderboard')
          .setDescription('Show the saved beer leaderboard.')
          .toJSON(),
      ];

      await (channel as TextChannel).guild.commands.set(commands);
      this.logger.log('Registered /beertally and /leaderboard slash commands.');
    } catch (error) {
      this.logger.error('Failed to register slash commands', error);
    }
  }

  private async handleMessage(message: Message) {
    // Ignore bot messages
    if (message.author.bot) return;

    // Only respond in the specified channel
    if (message.channelId !== this.channelId) return;

    // Match "!beer" with an optional signed number, e.g. "!beer", "!beer 5",
    // "!beer -3", "!beer +2".
    const match = message.content
      .trim()
      .match(/^!beer(?:\s+([+-]?\d+))?$/i);
    if (!match) return;

    const amount = match[1] ? parseInt(match[1], 10) : 1;
    await this.incrementBeerCount(message, amount);
  }

  /**
   * Returns the most human-readable name for a message author:
   * server nickname → global display name → username. Never the raw ID.
   */
  private getDisplayName(message: Message): string {
    return (
      message.member?.displayName ??
      message.author.displayName ??
      message.author.username
    );
  }

  private async handleInteraction(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'leaderboard') {
      await this.showLeaderboard(interaction);
      return;
    }

    if (interaction.commandName !== 'beertally') return;

    if (interaction.user.id !== this.tallyAdminId) {
      await interaction.reply({
        content: '⛔ You are not allowed to run this command.',
        ephemeral: true,
      });
      return;
    }

    await this.runBeerTally(interaction);
  }

  private async showLeaderboard(interaction: ChatInputCommandInteraction) {
    try {
      const data = await this.loadBeerData();

      const sorted = Object.values(data.users).sort(
        (a, b) => b.count - a.count,
      );
      const breakdown =
        sorted.length > 0
          ? sorted
              .map((u, i) => `**${i + 1}.** ${u.username} — 🍺 ${u.count}`)
              .join('\n')
          : 'No beers recorded yet. Run /beertally first.';

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

  private async incrementBeerCount(message: Message, amount: number) {
    try {
      const data = await this.loadBeerData();
      const userId = message.author.id;
      const displayName = this.getDisplayName(message);

      if (!data.users[userId]) {
        data.users[userId] = { username: displayName, count: 0 };
      }
      data.users[userId].username = displayName;
      data.users[userId].count += amount;
      data.total += amount;
      data.lastUpdated = new Date().toISOString();
      await this.saveBeerData(data);

      const change = amount >= 0 ? `+${amount}` : `${amount}`;
      await message.reply(
        `🍺 ${change} | Total beers: ${data.total} | ${displayName}: ${data.users[userId].count}. Cheers!`,
      );

      this.logger.log(
        `Beer count changed by ${change} to ${data.total} by ${message.author.tag}`,
      );
    } catch (error) {
      this.logger.error('Failed to increment beer count', error);
      await message.reply('❌ Failed to record beer. Try again!');
    }
  }

  private async runBeerTally(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const channel = await this.client.channels.fetch(this.channelId!);
      if (!channel || !channel.isTextBased()) {
        await interaction.editReply('❌ Could not access the beer channel.');
        return;
      }

      const { total, users } = await this.tallyChannel(channel as TextChannel);

      const data: BeerData = {
        total,
        users,
        lastUpdated: new Date().toISOString(),
      };
      await this.saveBeerData(data);

      const sorted = Object.values(users).sort((a, b) => b.count - a.count);
      const breakdown =
        sorted.length > 0
          ? sorted
              .map((u, i) => `**${i + 1}.** ${u.username} — 🍺 ${u.count}`)
              .join('\n')
          : 'No beers found in this channel yet.';

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

  /**
   * Walks the entire channel history and treats each plain-number message
   * (e.g. "518", "519", "520") as the running beer total at that moment.
   *
   * Processing chronologically (oldest -> newest), each person is credited the
   * DELTA between their number and the previous one. Going 505 -> 506 credits
   * +1; going 333 -> 303 credits -30. A person's score is the sum of their
   * deltas, so it can be negative.
   *
   * The first valid number sets the baseline: if it's within the delta range
   * (e.g. the channel started at "1") its author is credited, otherwise it just
   * anchors the running total.
   *
   * Guardrails against stray/noise messages:
   *  - messages containing "+" or "-" are ignored entirely
   *  - any number whose delta exceeds +/-50 is ignored (no credit, running
   *    total unchanged)
   */
  private async tallyChannel(
    channel: TextChannel,
  ): Promise<{ total: number; users: Record<string, UserTally> }> {
    const numberPattern = /^\d+$/;
    const maxDelta = 50;

    // 1. Collect every numeric message across the whole channel history.
    const entries: {
      userId: string;
      displayName: string;
      value: number;
      timestamp: number;
    }[] = [];
    let before: string | undefined;

    for (;;) {
      const batch: Collection<string, Message> = await channel.messages.fetch({
        limit: 100,
        before,
      });

      if (batch.size === 0) break;

      for (const message of batch.values()) {
        if (message.author.bot) continue;
        const content = message.content.trim();
        // Ignore anything with a "+" or "-" (e.g. "+1", "506-2").
        if (content.includes('+') || content.includes('-')) continue;
        if (!numberPattern.test(content)) continue;

        entries.push({
          userId: message.author.id,
          displayName: this.getDisplayName(message),
          value: parseInt(content, 10),
          timestamp: message.createdTimestamp,
        });
      }

      before = batch.last()?.id;
      if (batch.size < 100) break;
    }

    // 2. Sort oldest -> newest so deltas follow the real posting order.
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // 3. Walk the sequence, crediting each author the delta they applied.
    const users: Record<string, UserTally> = {};
    let previous: number | null = null;

    for (const entry of entries) {
      // The first valid number establishes the baseline. If it's small enough
      // to be a real starting count (e.g. the channel began at "1"), credit it;
      // otherwise just anchor the running total without crediting anyone.
      if (previous === null) {
        if (entry.value <= maxDelta) {
          this.creditUser(users, entry, entry.value);
        }
        previous = entry.value;
        continue;
      }

      const delta = entry.value - previous;

      // Ignore stray numbers that jump too far from the running total.
      if (Math.abs(delta) > maxDelta) continue;

      this.creditUser(users, entry, delta);
      previous = entry.value;
    }

    // The final running value is the total beer count.
    return { total: previous ?? 0, users };
  }

  private creditUser(
    users: Record<string, UserTally>,
    entry: { userId: string; displayName: string },
    delta: number,
  ): void {
    if (!users[entry.userId]) {
      users[entry.userId] = { username: entry.displayName, count: 0 };
    }
    users[entry.userId].username = entry.displayName;
    users[entry.userId].count += delta;
  }

  private async loadBeerData(): Promise<BeerData> {
    try {
      const content = await fs.readFile(this.dataPath, 'utf-8');
      const parsed = JSON.parse(content) as Partial<BeerData>;
      return {
        total: parsed.total ?? 0,
        users: parsed.users ?? {},
        lastUpdated: parsed.lastUpdated ?? new Date().toISOString(),
      };
    } catch {
      // If file doesn't exist, return default data
      return { total: 0, users: {}, lastUpdated: new Date().toISOString() };
    }
  }

  private async saveBeerData(data: BeerData): Promise<void> {
    await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async getBeerData(): Promise<BeerData> {
    return this.loadBeerData();
  }
}
