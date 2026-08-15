-- Migration 000: create beers table
-- Creates table `beers` with columns:
--   discordID   TEXT NOT NULL
--   discordUser TEXT
--   count       INTEGER DEFAULT 0

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS beers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discordID TEXT NOT NULL,
  discordUser TEXT,
  count INTEGER NOT NULL DEFAULT 0
);

COMMIT;
