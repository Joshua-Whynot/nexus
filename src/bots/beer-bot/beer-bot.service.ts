import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  Client,
  GatewayIntentBits,
  Message,
  Interaction,
  TextChannel,
} from 'discord.js';
import { BeerStore } from './beer-store.service';
import { MessageCommand, SlashCommand } from './commands/command.interface';
import { BeerCommand } from './commands/beer.command';
import { LeaderboardCommand } from './commands/leaderboard.command';
import { BeerTallyCommand } from './commands/beertally.command';

@Injectable()
export class BeerBotService implements OnModuleInit {
  private readonly logger = new Logger(BeerBotService.name);
  private client: Client;
  private channelId: string | undefined;

  /** Only this Discord user is allowed to run /beertally. */
  private readonly tallyAdminId = '179383654080970752';

  private messageCommands: MessageCommand[] = [];
  private slashCommands: SlashCommand[] = [];
  private slashByName = new Map<string, SlashCommand>();

  constructor(private readonly store: BeerStore) {}

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

    this.registerCommandHandlers();

    this.client.once('clientReady', () => {
      this.logger.log(`Beer bot logged in as ${this.client.user?.tag}`);
      void this.registerSlashCommands();
    });

    this.client.on('messageCreate', (message) => {
      void this.handleMessage(message);
    });
    this.client.on('interactionCreate', (interaction) => {
      void this.handleInteraction(interaction);
    });

    await this.client.login(token);
  }

  /** Instantiates all commands with their dependencies. */
  private registerCommandHandlers() {
    this.messageCommands = [new BeerCommand(this.store)];
    this.slashCommands = [
      new LeaderboardCommand(this.store),
      new BeerTallyCommand(
        this.store,
        this.client,
        this.channelId!,
        this.tallyAdminId,
      ),
    ];
    this.slashByName = new Map(
      this.slashCommands.map((command) => [command.data.name, command]),
    );
  }

  /** Pushes the slash command definitions to the channel's guild. */
  private async registerSlashCommands() {
    try {
      const channel = await this.client.channels.fetch(this.channelId!);
      if (!channel || !channel.isTextBased() || !('guild' in channel)) {
        this.logger.warn(
          'Could not resolve a guild text channel to register commands.',
        );
        return;
      }

      await (channel as TextChannel).guild.commands.set(
        this.slashCommands.map((command) => command.data),
      );
      this.logger.log(
        `Registered slash commands: ${this.slashCommands
          .map((c) => `/${c.data.name}`)
          .join(', ')}.`,
      );
    } catch (error) {
      this.logger.error('Failed to register slash commands', error);
    }
  }

  private async handleMessage(message: Message) {
    if (message.author.bot) return;
    if (message.channelId !== this.channelId) return;

    for (const command of this.messageCommands) {
      if (command.matches(message)) {
        await command.execute(message);
        return;
      }
    }
  }

  private async handleInteraction(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = this.slashByName.get(interaction.commandName);
    if (!command) return;

    await command.execute(interaction);
  }

  getBeerData() {
    return this.store.load();
  }
}
