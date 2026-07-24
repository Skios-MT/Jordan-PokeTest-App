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
                        Battle View, Party, Codex, Bag, Creature Detail
src/db/                SQLite persistence schema
App.tsx                Expo entry point, renders the navigator
```

### Screens implemented

Title -> New Game -> Region Select -> Starter Select -> Home, with Map,
Battle View, Party, Codex, and Bag all reachable from Home, matching spec 4.1.

- **Map**: a small walkable tile grid for Melita Woods with a 4-directional
  D-pad and a player avatar. Walking onto tall grass has a chance to trigger
  a wild battle.
- **Battle View**: pick a move, Invoke Crux, throw a ball to catch the wild
  creature, or open the Party sheet — all driven by the real engine, not
  mock data. Wild encounters are drawn from a weighted encounter table
  (species and level vary) rather than always the same fight.
- **Party**: lists every caught creature; tap one for its Creature Detail
  (stats, HP, known moves).
- **Codex**: a grid of all known species; unseen ones show as "???" until
  encountered in battle, caught ones are marked. Filterable by type.
- **Bag**: Balls / Medicine / Key Items / Battle Items tabs. Balls are
  functionally wired to the catch mechanic; Medicine and Key Items are
  inventory-only (not yet consumable).

The creature roster now includes one original wild species (Fossary,
Bug/Grass) plus the three regional variants, all fully battle-ready with
real stats and movesets.

Not built: XP/leveling (so no level-up flow or XP bar on the result
screen), PP tracking or move tooltips, party reordering/switching mid-battle,
tap-to-pathfind movement (the map uses a D-pad instead), multiple zones, and
sprite/character art (the avatar is a directional glyph, not art).

### Getting started

```bash
npm install
npm test         # run the engine unit tests
npm run typecheck # tsc --noEmit
npm start        # launch the Expo dev server
```
