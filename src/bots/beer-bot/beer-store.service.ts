import { Injectable, Logger } from '@nestjs/common';
import { Message, TextChannel, Collection } from 'discord.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface UserTally {
  username: string;
  count: number;
}

export interface BeerData {
  total: number;
  users: Record<string, UserTally>;
  lastUpdated: string;
}

/**
 * Owns all beer state: reading/writing the JSON file, applying `!beer`
 * changes, and rebuilding the tally from channel history. Commands depend on
 * this rather than touching the file directly.
 */
@Injectable()
export class BeerStore {
  private readonly logger = new Logger(BeerStore.name);
  private readonly dataPath = path.join(process.cwd(), 'beer-count.json');

  /**
   * Returns the most human-readable name for a message author:
   * server nickname → global display name → username. Never the raw ID.
   */
  getDisplayName(message: Message): string {
    return (
      message.member?.displayName ??
      message.author.displayName ??
      message.author.username
    );
  }

  /** Renders a sorted "1. Name — 🍺 N" leaderboard string. */
  formatLeaderboard(
    users: Record<string, UserTally>,
    emptyMessage: string,
  ): string {
    const sorted = Object.values(users).sort((a, b) => b.count - a.count);
    if (sorted.length === 0) return emptyMessage;
    return sorted
      .map((u, i) => `**${i + 1}.** ${u.username} — 🍺 ${u.count}`)
      .join('\n');
  }

  /** Applies a (positive or negative) change for a `!beer` message. */
  async applyChange(
    message: Message,
    amount: number,
  ): Promise<{ data: BeerData; userCount: number; displayName: string }> {
    const data = await this.load();
    const userId = message.author.id;
    const displayName = this.getDisplayName(message);

    if (!data.users[userId]) {
      data.users[userId] = { username: displayName, count: 0 };
    }
    data.users[userId].username = displayName;
    data.users[userId].count += amount;
    data.total += amount;
    data.lastUpdated = new Date().toISOString();
    await this.save(data);

    return { data, userCount: data.users[userId].count, displayName };
  }

  async load(): Promise<BeerData> {
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

  async save(data: BeerData): Promise<void> {
    await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2), 'utf-8');
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
  async tallyChannel(
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
}
