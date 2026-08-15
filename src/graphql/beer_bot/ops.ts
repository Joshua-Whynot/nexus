export type InsertOp = {
  kind: 'insert';
  discordID: string;
  discordUser?: string | null;
  count?: number;
};

export type UpdateOp = {
  kind: 'update';
  discordID: string;
  discordUser?: string | null;
  count?: number;
};

export type DeleteOp = {
  kind: 'delete';
  discordID: string;
};

export type Operation = InsertOp | UpdateOp | DeleteOp;
