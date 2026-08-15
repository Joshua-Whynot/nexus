-- Migration 000 DOWN: drop beers table

BEGIN TRANSACTION;

DROP TABLE IF EXISTS beers;

COMMIT;
