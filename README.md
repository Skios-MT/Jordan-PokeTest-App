# Jordan-PokeTest-App

Experimental game development with Claude Code.

## Chivalry & Antiquity (Project Melita)

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
                        Battle View, Party, Codex, Bag, Shop, Help,
                        Creature Detail
src/db/                SQLite persistence schema
App.tsx                Expo entry point, renders the navigator
```

### Screens implemented

Title ("Chivalry & Antiquity") -> New Game -> Name Entry -> Region Select ->
Starter Quiz -> Starter Reveal -> **Map** (the default/root screen from then
on), with Home (party HUD + quick links), Battle View, Party, Codex, Bag,
Shop, and Help all reachable from Map/Home, matching spec 4.1.

- **Name Entry**: the player types their own name, stored in the game store
  and used in narrative text (e.g. the starter reveal screen).
- **Starter Quiz**: 3 island-themed multiple-choice questions (a ferry
  crossing, a harbour chore, a festa night); the majority answer assigns a
  Grass/Fire/Water starter automatically, shown on a reveal/confirm screen —
  no more direct tap-to-choose.
- **Map**: four connected zones (Melita Woods -> Luzzu Harbour -> Azure
  Caverns -> Ramla Dunes), each a large, irregularly-shaped tile grid of its
  own size (a diamond clearing, a harbour with a pier, a zigzag cave, a
  dune atoll — not a uniform square). A camera viewport follows the player
  and scrolls/clamps at the map's edges, since the zones are bigger than one
  screen. A 4-directional D-pad (or arrow keys) moves the avatar. Each zone
  mixes (at least) two **biome tile types** — Grass 🌿, Rock 🪨, Water 🌊, and
  Sand 🏜️ — visually distinct from Path and from each other; walking onto
  any biome tile (never Path or Exit) has a 19.5% chance to trigger a wild
  battle drawn from that *specific biome's own* creature pool (a Rock tile
  and a Water tile spawn completely different species — see "Creatures"
  below), which plays a screen-flash transition before cutting to Battle
  View. Each zone has one **Healing Center** (✚) tile that fully revives any
  KO'd party members, and one **Entrance** tile (🚪, where you spawn on
  arrival) that walks you straight back to the previous zone, landing
  exactly on the exit tile you used to leave it — so a zone is never a
  one-way trip.
- **Battle View**: a Pokemon-Yellow-style layout — the wild creature stands
  upper-right with its info box upper-left, your creature stands lower-left
  (larger, "closer to camera") with its info box lower-right, on a sky/ground
  battle stage. Pick a move, Invoke Crux, throw a ball to catch the wild
  creature, switch party members (voluntarily via the Party sheet, or for
  free when your active creature faints and a reserve remains), use an item
  to heal or level up, or run away — all driven by the real engine, not mock
  data. Turns resolve genuinely one attacker at a time in real speed order
  (an engine callback fires once per actor that actually acts, so a one-hit
  KO correctly shows only one attack, not two), moves can miss based on
  accuracy (higher-power moves have lower accuracy), and the log shows the
  real numbers: damage dealt, crits, and type-effectiveness commentary
  ("It's super effective!" / "It's not very effective..."). Every move fires
  a type-colored projectile (reusing each type's color/icon — red 🔥 for
  Fire, blue 💧 for Water, and so on) that visibly travels from attacker to
  defender before the hit lands; throwing a ball arcs it the same path with
  a spin. Wild encounters are drawn from the triggering tile's biome-specific
  weighted table, whose level range increases per zone, plus a vanishingly
  rare chance (the three story legendaries, `src/data/legendaries.json`,
  available from every biome) of a legendary encounter at a hard-floor level
  (25 in Melita Woods, rising in later zones) far above the zone's normal
  range. Winning or catching grants
  gold/XP and a 10% chance to drop a rare **Kinnie** item; each combatant
  shows a generated, type-colored avatar with lunge/hit/faint/heal/crux-glow
  animations and a flash tint on big hits. The win/lose/caught/fled screen
  is a real fade-in pop-up (`Modal`), and any level-up — from battle XP or a
  Kinnie — pauses on a tap-to-continue stat comparison screen (old stats vs.
  new, with the delta) before the pop-up or turn continues.
- **Party**: lists every caught creature (level, HP, fainted status); tap
  one for its Creature Detail (stats, HP, XP-to-next-level, known moves, a
  **Rename** control for a custom nickname, and its own Use Item button for
  healing/leveling up outside of battle). Release any creature (except your
  last one) with an inline confirm step. The first party slot is always who
  leads your next battle; any other non-fainted member shows a **Set as
  Main** button that moves it to the front of the party (the current lead
  shows a "Main" tag instead).
- **Codex**: a grid of all known species; unseen ones show as "???" until
  encountered in battle, caught ones are marked. Filterable by type.
- **Bag**: Balls / Medicine / Key Items / Battle Items tabs, each showing
  only the items you actually own (zero-quantity items are hidden rather
  than listed as "x0"). The starting Bag is small on purpose — 3 Pastizz and
  3 Greca Traps only; everything else (Melitan Ball, Festa Trap, Qassata,
  Ftira biz-Zejt) starts at 0 and must be bought in the Shop. Pastizz/Qassata/
  Ftira biz-Zejt restore a flat 15/40/80 HP; Kinnie instantly grants +1 level
  and is never sold — drop-only.
- **Shop**: buy Balls and Medicine with gold earned from catching or
  defeating wild creatures.
- **Help**: reachable from the Home menu — explains the goal, battling,
  Crux Aura (trigger, duration, per-alignment effects, and the Aura-Spent
  decay), catching, Healing Centers, party order, items, and controls.

**Keyboard controls** (web only): arrow keys move on the Map, `B` opens the
Bag, `P` opens Party, `M` opens/returns-to the Home menu, and `R` flees a
battle. Hovering a button for 2+ seconds shows an explanatory tooltip.

Starters begin at level 5; stats scale with level (`src/game/progression.ts`)
rather than staying flat.

**Creatures**: each biome tile type draws only from its own themed wild
species pool (`src/game/encounterTable.ts`), not one shared list for the
whole game:
- **Grass** 🌿 — Fossary (Bug/Grass), plus the Grass starter line when it's
  not your own.
- **Rock** 🪨 — Qortong, Xrobbog, Karkarun, Bulqajra, and Santwarr, plus the
  regional variants Ferrocane and Katakomba, and the Fire starter line
  (paired with Rock for its volcanic/mountain flavor).
- **Water** 🌊 — Luzzitt, Marsupp, Kalanka, Vurjenn, and Ondallus, plus the
  regional variant Zavorra, and the Water starter line when it's not yours.
- **Sand** 🏜️ — Ramliet, Xemxun, Dunkorr, Sirokk, and Ossijan (all
  Ground-types, sharing the new Sand Blast move).

The three story legendaries (Aegilord, Megalithos, Siroccus) remain a
vanishingly rare (~1-in-50) universal tier layered on top of every biome
rather than being biome-locked, since there are too few of them to split
four ways meaningfully.

**Progress saves automatically** (`src/state/gameStore.ts`, via zustand's
`persist` middleware backed by AsyncStorage, which uses `localStorage` on
web and the native module on iOS/Android) — every action that changes game
state is written to disk immediately, so there's no separate save button.
The Title screen's **Continue** unlocks once a save exists and drops you
back onto the Map exactly where you left off; **New Game** always starts
clean, wiping any existing save first.

Not built: an XP-bar animation or catch-prompt flourish on the result screen,
PP tracking or move tooltips, tap-to-pathfind movement (the map uses a D-pad
instead), more than 4 zones, and sprite/character art (the avatar is a
generated colored token, not illustrated art).

### Getting started

```bash
npm install
npm test         # run the engine unit tests
npm run typecheck # tsc --noEmit
npm start        # launch the Expo dev server
```

### Testing on a phone (web build, no install needed)

The web export is also published to the `gh-pages` branch so it can be opened
directly in a phone's browser, no Expo Go or cable required:

```bash
npx expo export --platform web   # produces dist/
```

The exported `dist/index.html` and JS bundle reference assets with
absolute (`/...`) paths, which only work when hosted at a domain root. Since
GitHub Pages serves a project page at a subpath (`/<repo-name>/`), those
references are rewritten to relative (`./...`) paths before publishing to
`gh-pages`, so the same export works unmodified when run locally at
`localhost` and when hosted under a subpath. Once GitHub Pages is enabled for
this repo (Settings -> Pages -> Deploy from a branch -> `gh-pages` / `/`
(root)), the build is reachable at
`https://skios-mt.github.io/Jordan-PokeTest-App/`.
