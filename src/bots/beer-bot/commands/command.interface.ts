import {
  ChatInputCommandInteraction,
  Message,
  RESTPostAPIApplicationCommandsJSONBody,
} from 'discord.js';

/** A slash (/) command. */
export interface SlashCommand {
  /** The command definition sent to Discord during registration. */
  readonly data: RESTPostAPIApplicationCommandsJSONBody;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

/** A prefix message command such as `!beer`. */
export interface MessageCommand {
  /** Whether this command should handle the given message. */
  matches(message: Message): boolean;
  execute(message: Message): Promise<void>;
}
