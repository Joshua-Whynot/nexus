import { Logger } from '@nestjs/common';
import { Message } from 'discord.js';
import { MessageCommand } from './command.interface';
import { BeerStore } from '../beer-store.service';

/**
 * `!beer` — records a beer. Accepts an optional signed amount:
 *   !beer      -> +1
 *   !beer 5    -> +5
 *   !beer -3   -> -3
 */
export class BeerCommand implements MessageCommand {
  private readonly logger = new Logger(BeerCommand.name);
  private static readonly PATTERN = /^!beer(?:\s+([+-]?\d+))?$/i;

  constructor(private readonly store: BeerStore) {}

  matches(message: Message): boolean {
    return BeerCommand.PATTERN.test(message.content.trim());
  }

  async execute(message: Message): Promise<void> {
    const match = message.content.trim().match(BeerCommand.PATTERN);
    if (!match) return;

    const amount = match[1] ? parseInt(match[1], 10) : 1;

    try {
      const { data, userCount, displayName } = await this.store.applyChange(
        message,
        amount,
      );

      const change = amount >= 0 ? `+${amount}` : `${amount}`;
      await message.reply(
        `🍺 ${change} | Total beers: ${data.total} | ${displayName}: ${userCount}. Cheers!`,
      );

      this.logger.log(
        `Beer count changed by ${change} to ${data.total} by ${message.author.tag}`,
      );
    } catch (error) {
      this.logger.error('Failed to record beer', error);
      await message.reply('❌ Failed to record beer. Try again!');
    }
  }
}
