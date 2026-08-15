// Boilerplate GraphQL types for BeerBot
// Types are plain TypeScript interfaces and may be converted to GraphQL types later.

export interface Beer {
    id: number;
    discordID: string;
    discordUser?: string | null;
    count: number;
}

export interface BeerStats {
    id: 1;
    total: number;
    lastUpdated: string | null;
}
