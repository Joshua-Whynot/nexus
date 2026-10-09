-- Migration 003: Add minecraft_whitelist table

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS minecraft_whitelist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discordID TEXT NOT NULL,
  discordUser TEXT,
  minecraftUser TEXT NOT NULL
);

COMMIT;