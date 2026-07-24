/**
 * Runtime copy of schema.sql (spec 5.2), kept as a TS string since Metro/tsc
 * don't resolve raw `.sql` imports out of the box. Keep the two in sync.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS player_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  player_name TEXT NOT NULL,
  current_zone TEXT NOT NULL,
  playtime_seconds INTEGER DEFAULT 0,
  currency INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS owned_creatures (
  uid TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,
  nickname TEXT,
  level INTEGER NOT NULL,
  xp INTEGER NOT NULL,
  ivs TEXT NOT NULL,
  evs TEXT NOT NULL,
  current_hp INTEGER NOT NULL,
  status_condition TEXT,
  moveset TEXT NOT NULL,
  held_item TEXT,
  party_slot INTEGER,
  box_id INTEGER,
  caught_at_zone TEXT,
  caught_at_timestamp INTEGER
);

CREATE TABLE IF NOT EXISTS inventory (
  item_id TEXT PRIMARY KEY,
  quantity INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quest_flags (
  flag_id TEXT PRIMARY KEY,
  is_set BOOLEAN NOT NULL DEFAULT 0,
  set_at_timestamp INTEGER
);

CREATE TABLE IF NOT EXISTS codex_entries (
  species_id TEXT PRIMARY KEY,
  seen BOOLEAN DEFAULT 0,
  caught BOOLEAN DEFAULT 0
);
`;
