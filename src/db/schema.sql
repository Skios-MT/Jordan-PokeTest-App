-- Project Melita persistence schema (spec 5.2). Applied via expo-sqlite on first launch.

CREATE TABLE IF NOT EXISTS player_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  player_name TEXT NOT NULL,
  current_zone TEXT NOT NULL,
  playtime_seconds INTEGER DEFAULT 0,
  currency INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS owned_creatures (
  uid TEXT PRIMARY KEY,           -- uuid, unique per individual creature
  species_id TEXT NOT NULL,
  nickname TEXT,
  level INTEGER NOT NULL,
  xp INTEGER NOT NULL,
  ivs TEXT NOT NULL,              -- JSON blob: {hp,atk,def,spatk,spdef,speed} 0-31
  evs TEXT NOT NULL,              -- JSON blob, 0-252 per stat, 510 total cap
  current_hp INTEGER NOT NULL,
  status_condition TEXT,
  moveset TEXT NOT NULL,          -- JSON array of up to 4 move_ids
  held_item TEXT,
  party_slot INTEGER,             -- 1-6 if in active party, NULL if boxed
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
