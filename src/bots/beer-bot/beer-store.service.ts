import { Injectable, Logger } from '@nestjs/common';
import { Collection, Message, TextChannel } from 'discord.js';
import { DbExecutor } from '../../common/db.executor';
import { BeerService } from '../../graphql/beer_bot/beer.service';

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
 * Owns all beer state for the bot and delegates persistence to the GraphQL
 * `BeerService` / `DbExecutor` stack. Commands continue to depend on this
 * service for in-memory formatting and applying `!beer` changes.
 */
@Injectable()
export class BeerStore {
  private readonly logger = new Logger(BeerStore.name);

  constructor(
    private readonly beerService: BeerService,
    private readonly executor: DbExecutor,
  ) { }

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
  formatLeaderboard(users: Record<string, UserTally>, emptyMessage: string): string {
    const sorted = Object.values(users).sort((a, b) => b.count - a.count);
    if (sorted.length === 0) return emptyMessage;
    return sorted.map((u, i) => `**${i + 1}.** ${u.username} — 🍺 ${u.count}`).join('\n');
  }

  /** Applies a (positive or negative) change for a `!beer` message. */
  async applyChange(
    message: Message,
    amount: number,
  ): Promise<{ data: BeerData; userCount: number; displayName: string }> {
    const userId = message.author.id;
    const displayName = this.getDisplayName(message);

    // Load current user row (if any)
    const existing = this.beerService.findOne(userId);

    let op;
    if (!existing) {
      // create new user row with initial count = amount
      op = this.beerService.createOp({ discordID: userId, discordUser: displayName, count: amount });
    } else {
      // compute new count
      const newCount = (existing.count ?? 0) + amount;
      op = this.beerService.updateOp(userId, { discordUser: displayName, count: newCount });
    }

    // apply the operation
    this.executor.apply([op]);

    // recompute totals from DB and update stats
    const rows = this.beerService.findAll();
    let total = 0;
    const users: Record<string, UserTally> = {};
    for (const r of rows) {
      users[r.discordID] = { username: r.discordUser ?? r.discordID, count: r.count };
      total += Number(r.count) || 0;
    }

    const lastUpdated = new Date().toISOString();
    this.beerService.setStats(total, lastUpdated);

    const data: BeerData = { total, users, lastUpdated };
    const userCount = users[userId]?.count ?? 0;
    return { data, userCount, displayName };
  }

  async load(): Promise<BeerData> {
    const rows = this.beerService.findAll();
    const users: Record<string, UserTally> = {};
    let total = 0;
    for (const r of rows) {
      users[r.discordID] = { username: r.discordUser ?? r.discordID, count: r.count };
      total += Number(r.count) || 0;
    }
    const stats = this.beerService.getStats();
    const lastUpdated = stats?.lastUpdated ?? new Date().toISOString();
    return { total, users, lastUpdated };
  }

  // `save` is a no-op because operations are applied via DbExecutor
  async save(_: BeerData): Promise<void> {
    return;
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

    for (; ;) {
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
