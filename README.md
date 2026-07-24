# Jordan-PokeTest-App

Experimental game development with Claude Code.

## Project Melita

A turn-based creature-collector set in the original archipelago region of
Melita. Full design spec: [`docs/GAME_SPEC.md`](docs/GAME_SPEC.md).

**Stack:** Expo (React Native) + TypeScript, `zustand` for state,
`expo-sqlite` for persistence, `@shopify/react-native-skia` for 2D
rendering, `zod` for runtime data validation.

### Layout

```
docs/GAME_SPEC.md      Full game design & implementation spec
src/data/              Type chart + creature data (JSON) and their Zod schemas
src/engine/            Battle engine: damage formula, type chart, Crux Aura,
                        turn priority, catching, and the battle state machine
src/engine/__tests__/  Unit tests for the engine
src/db/                SQLite persistence schema
App.tsx                Expo entry point (placeholder screen)
```

### Getting started

```bash
npm install
npm test         # run the engine unit tests
npm run typecheck # tsc --noEmit
npm start        # launch the Expo dev server
```
