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
src/game/              Bridges data -> engine: move lookup, creature factory
src/state/             zustand game store (selected starter, zone, etc.)
src/navigation/         React Navigation stack + route param types
src/screens/            Title, Region Select, Starter Select, Home, Battle View
src/db/                SQLite persistence schema
App.tsx                Expo entry point, renders the navigator
```

### Screens implemented

Title -> New Game -> Region Select -> Starter Select -> Home -> Battle View
(a full-screen modal), matching spec 4.1. Battle View is wired to the real
engine: pick a move, Invoke Crux, or open the Party sheet; HP bars, type
badges, and the Crux Aura state all update live. Party Management, Codex,
and Bag are stubbed ("coming soon") from Home since spec 4.1 lists them as
Home's children but they weren't asked for in this pass. There's no
XP/leveling or wild-encounter table yet — the Battle screen always builds a
demo encounter (your starter vs. a fixed-level stage-1 of a different
starter line) at a hardcoded level.

### Getting started

```bash
npm install
npm test         # run the engine unit tests
npm run typecheck # tsc --noEmit
npm start        # launch the Expo dev server
```
