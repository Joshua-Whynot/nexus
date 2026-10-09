-- Migration 003 DOWN: drop minecraft_whitelist table

BEGIN TRANSACTION;

DROP TABLE IF EXISTS minecraft_whitelist;

COMMIT;