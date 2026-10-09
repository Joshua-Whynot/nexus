import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
    ChatInputCommandInteraction,
    Client,
    GatewayIntentBits,
    Guild,
    Interaction,
} from 'discord.js';
import { WhitelistService } from '../../graphql/whitelist/whitelist.service';
import { SlashCommand } from '../beer-bot/commands/command.interface';
import { WhitelistForceUpdateCommand } from './commands/whitelist-force-update.command';
import { WhitelistCommand } from './commands/whitelist.command';
import { WhitelistSyncService } from './whitelist-sync.service';

@Injectable()
export class WhitelistBotService implements OnModuleInit {
    private readonly logger = new Logger(WhitelistBotService.name);
    private readonly client: Client;
    private readonly slashCommands: SlashCommand[] = [];
    private readonly slashByName = new Map<string, SlashCommand>();
    private readonly adminDiscordId = '179383654080970752';

    constructor(
        private readonly whitelistService: WhitelistService,
        private readonly syncService: WhitelistSyncService,
    ) {
        this.client = new Client({
            intents: [GatewayIntentBits.Guilds],
        });
    }

    async onModuleInit() {
        const token = process.env.DISCORD_WHITELIST_BOT_TOKEN;

        if (!token) {
            this.logger.warn(
                'DISCORD_WHITELIST_BOT_TOKEN is not set. Whitelist bot will not start.',
            );
            return;
        }

        this.registerCommandHandlers();

        this.client.once('clientReady', () => {
            this.logger.log(`Whitelist bot logged in as ${this.client.user?.tag}`);
            void this.registerSlashCommands();
        });

        this.client.on('interactionCreate', (interaction) => {
            void this.handleInteraction(interaction);
        });

        await this.client.login(token);
    }

    private registerCommandHandlers() {
        this.slashCommands.length = 0;
        this.slashCommands.push(
            new WhitelistCommand(this.whitelistService, this.syncService),
            new WhitelistForceUpdateCommand(this.syncService, this.adminDiscordId),
        );
        this.slashByName.clear();
        for (const command of this.slashCommands) {
            this.slashByName.set(command.data.name, command);
        }
    }

    private async registerSlashCommands() {
        const guilds = this.client.guilds.cache.values();
        for (const guild of guilds) {
            await this.registerGuildCommands(guild);
        }
    }

    private async registerGuildCommands(guild: Guild) {
        await guild.commands.set(
            this.slashCommands.map((command) => command.data),
        );
        this.logger.log(
            `Registered whitelist slash commands for guild ${guild.name}: ${this.slashCommands
                .map((command) => `/${command.data.name}`)
                .join(', ')}`,
        );
    }

    private async handleInteraction(interaction: Interaction) {
        if (!interaction.isChatInputCommand()) {
            return;
        }

        const command = this.slashByName.get(interaction.commandName);
        if (!command) {
            return;
        }

        await command.execute(interaction as ChatInputCommandInteraction);
    }
}
