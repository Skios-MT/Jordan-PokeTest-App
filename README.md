# Jordan-PokeTest-App

Experimental game development with Claude Code.

## Project Melita

A turn-based creature-collector set in the original archipelago region of
Melita. Full design spec: [`docs/GAME_SPEC.md`](docs/GAME_SPEC.md).

**Stack:** Expo (React Native) + TypeScript, `zustand` for state,
`@react-navigation/native-stack` for screen flow, `expo-sqlite` for
persistence, `@shopify/react-native-skia` for 2D rendering, `zod` for
runtime data validation.

### Layout

```
docs/GAME_SPEC.md      Full game design & implementation spec
src/data/              Type chart, creature/move data (JSON), and their Zod schemas
src/engine/            Battle engine: damage formula, type chart, Crux Aura,
                        turn priority, catching, and the battle state machine
src/engine/__tests__/  Unit tests for the engine
src/game/              Bridges data -> engine: move/item lookup, creature
                        factory, party model, species catalog (Codex data)
src/state/             zustand game store (party, inventory, seen/caught, zone)
src/navigation/         React Navigation stack + route param types
src/screens/            Title, Region Select, Starter Select, Home, Map,
                        Battle View, Party, Codex, Bag, Shop, Creature Detail
src/db/                SQLite persistence schema
App.tsx                Expo entry point, renders the navigator
```

### Screens implemented

Title -> New Game -> Region Select -> Starter Select -> Home, with Map,
Battle View, Party, Codex, Bag, and Shop all reachable from Home, matching
spec 4.1.

- **Map**: three connected zones (Melita Woods -> Luzzu Harbour -> Azure
  Caverns), each a walkable tile grid with a 4-directional D-pad, a player
  avatar, and one exit tile leading to the next (stronger) zone. Walking
  onto tall grass has a chance to trigger a wild battle.
- **Battle View**: pick a move, Invoke Crux, throw a ball to catch the wild
  creature, switch party members (voluntarily via the Party sheet, or for
  free when your active creature faints and a reserve remains) — all driven
  by the real engine, not mock data. Wild encounters are drawn from a
  weighted encounter table whose level range increases per zone. Winning a
  battle grants XP and gold; each combatant shows a generated, type-colored
  avatar with lunge/hit/faint animations.
- **Party**: lists every caught creature (level, HP, fainted status); tap
  one for its Creature Detail (stats, HP, XP-to-next-level, known moves).
- **Codex**: a grid of all known species; unseen ones show as "???" until
  encountered in battle, caught ones are marked. Filterable by type.
- **Bag**: Balls / Medicine / Key Items / Battle Items tabs. Balls are
  functionally wired to the catch mechanic; Medicine and Key Items are
  inventory-only (not yet consumable).
- **Shop**: buy Balls and Medicine with gold earned from catching or
  defeating wild creatures.

Starters begin at level 5; stats scale with level (`src/game/progression.ts`)
rather than staying flat. The creature roster includes one original wild
species (Fossary, Bug/Grass) plus the three regional variants, all fully
battle-ready with real stats and movesets — shared across all three zones,
since there's no real per-zone species pool yet (only the level range shifts).

Not built: an XP-bar animation or catch-prompt flourish on the result screen,
PP tracking or move tooltips, tap-to-pathfind movement (the map uses a D-pad
instead), more than 3 zones, and sprite/character art (the avatar is a
generated colored token, not illustrated art).

### Getting started

```bash
npm install
npm test         # run the engine unit tests
npm run typecheck # tsc --noEmit
npm start        # launch the Expo dev server
```
