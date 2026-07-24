# Project Melita — Game Specification & Implementation Blueprint (v1.0)

**Working Titles:** *Chivalry & Antiquity* (region: **Melita**)
**Genre:** Turn-based creature-collector / JRPG-lite, mobile-first
**Platforms:** iOS / Android
**Status:** Pre-production spec — engine scaffold implemented in `src/`

---

## 0. Executive Summary

Melita is an original archipelago region (three islands, inspired by the geography and history of Malta/Gozo/Comino) built around a creature-collecting core loop. The central narrative tension — **Chivalry** (the Knights' fortress-tech present) vs **Antiquity** (the megalithic, folkloric past) — drives zone design, faction alignment, type theming, and the region-unique **Crux Aura** combat mechanic.

This document is split into five independently buildable specs. Sections 1–3 are engine/data specs (engineering + design). Section 4 is UX (design + frontend). Section 5 is stack + boilerplate (engineering).

---

## 1. Core Mechanics & Turn-Based Engine Spec

### 1.1 Battle State Machine

```
IDLE
 └─▶ BATTLE_INIT (load combatants, apply entry abilities/hazards)
      └─▶ TURN_START (tick field effects: weather, terrain, Crux Aura duration)
           └─▶ ACTION_SELECT (both sides submit: Move | Switch | Item | Flee)
                └─▶ PRIORITY_SORT (see 1.2)
                     └─▶ ACTION_RESOLVE (loop per actor, highest priority first)
                          ├─▶ PRE_ACTION_CHECK (flinch, paralysis, sleep, freeze, confusion)
                          ├─▶ ACTION_EXECUTE (damage / status / switch / item)
                          ├─▶ POST_ACTION_TRIGGER (abilities, held-item procs, recoil)
                          └─▶ FAINT_CHECK (if HP <= 0 → FAINT_SEQUENCE → forced switch)
                     └─▶ END_OF_TURN (DOT ticks: burn/poison/Crux decay, weather damage)
           └─▶ WIN_CHECK (all enemy fainted / all player fainted / turn cap for wild-flee)
                └─▶ (loop to TURN_START) or BATTLE_END
BATTLE_END (rewards: XP, currency, catch resolution, faction reputation delta)
```

Implemented as an explicit finite-state machine (`src/engine/battleManager.ts`), not implicit game-loop branching, so each state is independently testable and the UI can subscribe to state-change events for animation sequencing.

### 1.2 Turn Cycle — Priority & Speed

```
effective_priority = move.base_priority + priority_modifiers(status, ability, item)
effective_speed    = base_speed * stage_multiplier(speed_stat_stage) * status_multiplier
                      (e.g., "Salt-Crust" status halves speed; Crux Aura +30% speed on Water/Steel actors)

turn_order = sort_by(effective_priority DESC, effective_speed DESC, random_tiebreak)
```

Stat stages run **-6 to +6**, each stage = ±33% (matching a standard multiplier table `[2/8, 2/7, 2/6, 2/5, 2/4, 2/3, 1, 3/2, 2, 5/2, 3, 7/2, 4]` indexed by stage+6, for balance readability).

### 1.3 Damage Formula

```
base_damage = ((((2 * level / 5) + 2) * power * (atk_stat / def_stat)) / 50) + 2

final_damage = base_damage
               * stab_multiplier          // 1.5 if move type matches user type
               * type_effectiveness       // 0 / 0.5 / 1 / 2 / 4 (see 1.4)
               * crit_multiplier          // 1.5 on crit (crit_chance = base 6.25%, boosted by ability/item)
               * crux_aura_multiplier     // see 1.5
               * random_factor            // uniform(0.85, 1.00)
               * weather_multiplier       // e.g. "Sirocco Sands" +20% Ground/Rock dmg, -20% Water
```

Round down to nearest integer at each multiplication stage to avoid floating drift; minimum guaranteed damage = 1 unless immune (type_effectiveness == 0).

### 1.4 Elemental Type Chart

12 types, each with an in-world Maltese-archipelago identity:

| Type | Strong vs | Weak vs | Immune to |
|---|---|---|---|
| Steel (Chivalry) | Rock, Ice, Fairy | Fire, Fighting, Ground | Poison |
| Ghost (Antiquity) | Psychic, Ghost | Ghost, Dark | Normal, Fighting |
| Psychic (Antiquity) | Fighting, Poison | Bug, Ghost, Dark | — |
| Rock (Megalith) | Fire, Flying, Bug, Ice | Water, Grass, Fighting, Ground | — |
| Water (Maritime) | Fire, Rock, Ground | Grass, Electric | — |
| Fire (Sirocco) | Grass, Bug, Ice, Steel | Water, Rock, Ground | — |
| Grass (Woods) | Water, Rock, Ground | Fire, Bug, Flying, Poison | — |
| Electric (Fortress) | Water, Flying | Ground | — |
| Ground | Fire, Electric, Poison, Rock, Steel | Water, Grass, Ice | Electric |
| Flying | Grass, Fighting, Bug | Electric, Rock, Ice | Ground |
| Fighting | Rock, Steel, Ice, Normal | Flying, Psychic | — |
| Fairy | Fighting, Dark | Steel, Poison | Dragon |

Stored as a numeric multiplier matrix (`src/data/type_chart.json`), not nested if/else — this is the single highest-leverage data file for balance iteration.

`Ice`, `Bug`, `Poison`, `Normal`, `Dark`, and `Dragon` are referenced above only as attack/defense targets (e.g. "Immune to Poison", "weak vs Bug"), not as one of the 12 named types with their own row in this table — but the JSON matrix's actual data is the complete, standard 18-type effectiveness chart (all 18 types have a real row), extending this table's Chivalry/Antiquity-flavored 12 with the newer types on the same 0/0.5/1/2 model.

**Resists (0.5x) are implemented**, matching the mainline games (Pokemon Yellow's mechanics as the baseline): e.g. Fire deals 0.5x to Water, Grass deals 0.5x to Fire, Water deals 0.5x to Water/Grass/Dragon. An earlier revision of `type_chart.json` omitted every resist relationship entirely (every non-listed pair defaulted to neutral 1x), which silently broke the intended "Water beats Fire" advantage in practice — a Fire-type attacker took no penalty at all against a Water-type defender. Fixed; see `src/engine/__tests__/typeChart.test.ts` for regression coverage of exactly this case.

### 1.3a Accuracy & Misses

```
hit_chance = min(1, (move.accuracy / 100) * accuracy_stage_multiplier / evasion_stage_multiplier)
miss       = random() >= hit_chance
```

A move with `accuracy >= 100` is always a certain hit and never rolls — not just an optimization, this keeps the engine's deterministic test `randomSource` from ever "missing" a should-never-miss move on an unlucky boundary roll. Per the "stronger attack, lower accuracy" brief, `src/data/moves.json`'s movepool is tiered so the tradeoff is real: Tackle (40 power) is a certain hit at 100 accuracy, the elemental signature moves (55 power) sit at 90 accuracy, and Rock Throw (65 power, the hardest-hitting move in the current pool) drops to 80 accuracy.

### 1.5 Crux Aura — Regional Mechanic

Lore: the "Crux" is the eight-pointed cross motif tied to the Knights' fortresses, awakened in battle by resonance with Megalithic ruin-sites.

- **Trigger:** Activates automatically when a creature's HP drops ≤ 33%, OR manually once per battle via the "Invoke Crux" action (costs the turn).
- **Duration:** 3 turns.
- **Effect by type-alignment:**
  - Steel/Fighting (Chivalry-aligned) → +30% Attack, +30% Speed, immune to flinch.
  - Rock/Psychic/Ghost (Antiquity-aligned) → +30% Sp. Attack, +2 evasion stages, immune to confusion.
  - Off-alignment types → flat +15% all stats (weaker, to preserve faction identity as the stronger path).
- **Decay:** On expiry, the creature is "Aura-Spent" for 2 turns (-15% all stats) — a deliberate risk/reward window, not a free buff.
- **Implementation note:** modeled as a `StatusEffect` object with `onApply`, `onTurnTick`, `onExpire` hooks (`src/engine/cruxAura.ts`) rather than hardcoded into the damage formula, so future creatures/abilities can interact with it (e.g., an ability that extends Crux duration).

### 1.6 Catching Engine

```
catch_value = ((3 * max_hp - 2 * current_hp) / (3 * max_hp))
              * base_catch_rate            // per-species, 3 (legendary) to 255 (common)
              * container_multiplier       // 1.0 basic, 1.5 "Greca Trap", 2.0 "Festa Trap", 4.0 "Melitan Ball"
              * status_bonus               // sleep/freeze = 2.5x, paralysis/burn/poison = 1.5x, none = 1.0x

shake_probability = min(1.0, catch_value / 255)
shake_checks = 4   // must pass all 4 consecutive checks (each = random() < shake_probability) to catch

// Legendary/Box creatures additionally require a `story_flag_unlocked` gate —
// catch_value computation only runs if the relevant main-quest flag is true.
```

Surface `shake_probability` to the UI as an approximate percentage (rounded, with a caveat label) so players get feedback without the formula being fully exposed.

---

## 2. World Architecture & Map Progression

### 2.1 Archipelago Layout (node-graph overworld, tile-based per-zone)

```
                     ┌────────────────────┐
                     │   MAINLAND MELITA   │
                     │  (largest island)   │
                     └──────────┬──────────┘
        ┌────────────┬─────────┼─────────┬────────────┐
        ▼            ▼         ▼         ▼            ▼
 Chivalry City   Melita Woods  Luzzu   Megalith    Azure Caverns
 (Valletta)      (Buskett)    Harbour  Temples     (Blue Grotto)
                              (Marsaxlokk) (Ħaġar Qim)
        │
        ▼ (ferry, unlocked after Gym 2)
┌────────────────┐
│      GAUDOS      │──▶ Antiquity Citadel (Mdina) — fog-gated, requires "Silent Bell" key item
└────────────────┘
        │
        ▼ (boat, post-story)
┌────────────────┐
│    EPHRASTIA     │──▶ endgame island: League + post-game legendary trio hunt
└────────────────┘
```

Hybrid structure: a lightweight node-graph for inter-island/zone travel (fast, mobile-friendly, avoids long overworld treks that hurt session length on phones), with each node itself a traditional tile-based 2D map (grid size 16×16 tiles, Tiled-editor `.tmx` compatible) for exploration, hidden items, and wild encounters.

### 2.2 Key Zones

| Zone | Inspiration | Role | Type Focus | Signature Mechanic |
|---|---|---|---|---|
| Chivalry City | Valletta | Region hub, Elite League | Steel/Electric | Fortress-wall puzzle gating |
| Antiquity Citadel | Mdina | Story midpoint, catacombs | Ghost/Psychic | Fog-of-war vision radius shrinks at night |
| Luzzu Harbour | Marsaxlokk | Water Gym, trade hub | Water | Painted-boat traversal (color-matching mini-puzzle to cross channels) |
| Megalith Temples | Ħaġar Qim | Legendary gate, endgame puzzle dungeon | Rock/Psychic | Solstice-light puzzle (rotate stones to align beams — ties to real-world archaeoastronomy of the site) |
| Melita Woods | Buskett | Early-game route, first wild variety | Bug/Grass | Seasonal spawn table (in-game calendar shifts encounters) |
| Azure Caverns | Blue Grotto | Late-game ride-gated aquatic dungeon | Water/Rock | Requires "Ride Creature" (Marinedge line) to submerge |

### 2.3 Progression Gating

Standard soft-gates: HM-equivalent "Ride Abilities" (Surf → submerge → cliff-climb) tied to specific starter-line evolutions, so the final-stage water starter has traversal utility — this also nudges starter choice to matter for exploration, not just combat.

---

## 3. Creature Data Schemas (JSON)

Implemented in `src/data/starters.json`, `src/data/legendaries.json`, `src/data/regionalVariants.json`, and validated at load time via the Zod schemas in `src/data/schemas.ts`.

### 3.1 Starters

Three lines (Grass/Fire/Water), each three stages, matching the original spec's stat blocks and signature moves. The Water line's final stage (Marinedge) carries the `surf_and_submerge` ride ability referenced in Section 2.3.

### 3.2 Legendaries

Three story-gated legendaries (Aegilord — Steel/Fighting, Megalithos — Rock/Psychic, Siroccus — Flying/Ground), each requiring a `story_flag_required` quest flag before they are catchable, matching the gating described in Section 1.6.

### 3.3 Regional Variants

> **IP note (carried over from the original brief):** the original brief proposed these as "regional variants" of existing third-party creature designs (Growlithe/Arcanine, Sudowoodo, Corsola). Reusing recognizable existing character names/designs — even reskinned — carries real trademark/copyright exposure for a commercial release. `src/data/regionalVariants.json` implements them as fully original creatures instead, keeping only the flavor concept:
>
> - **Ferrocane** (Electric/Fire) — fortress guard-hound, lightning-forged. Original design, no relation to any existing IP.
> - **Katakomba** (Rock/Ghost) — petrified catacomb sentinel.
> - **Zavorra** (Water/Steel) — ballast-reef, shipwreck-adapted coral creature.

Everything else in this document is original and clear to ship.

---

## 4. UI/UX & Mobile Control Architecture

### 4.1 Screen Flow

```
Splash → Title ("Chivalry & Antiquity") →
  (New Game: Name Entry → Region Select → Starter Quiz → Starter Reveal) / (Continue: Load Save)
   └─▶ MAP (Exploring — the default/root screen)
         ├─▶ "Menu" button / M key → HOME (party HUD + quick links)
         │        ├─▶ Party Management (release, Use Item, move-relearn)
         │        ├─▶ Creature Index (Codex — grid view, filter by type/zone/caught-status)
         │        ├─▶ Bag/Inventory (categorized tabs: Balls, Medicine, Key Items, Battle Items)
         │        └─▶ Shop (buy Balls/Medicine with gold)
         └─▶ BATTLE VIEW (modal, full-screen), on stepping into dark grass
               ├─▶ Move Select / Invoke Crux / Catch / Use Item / Run Away / Party Switch
               └─▶ Result Screen (win/lose/caught/fled, gold + XP, level-up, Kinnie drop)
```

**Implementation status** (`src/screens/`, wired up via `src/navigation/RootNavigator.tsx`): Title,
Name Entry, Region Select, Starter Quiz, Starter Select (reveal/confirm), Home, Map, Battle View,
Party, Codex, Bag, Shop, and a shared Creature Detail screen all exist and are navigable end to end.
The title screen's headline is **"Chivalry & Antiquity"** (Project Melita is the dev-facing project
name, shown as a small subtitle). Region Select is a single-region confirmation screen rather than a
real choice — Melita's three islands (section 2) are one region, not several to pick between; a
second region would slot in here later.

**Map is the default/root screen**, not Home: confirming a starter resets navigation straight into
Map, and every zone transition (`MapScreen`'s exit-tile handler) resets the stack's root to the new
zone's Map rather than pushing, so there's always exactly one live Map instance and it always matches
`currentZoneId`. Home is a secondary "menu" screen, reached by tapping "Menu" on Map (or pressing
`M`) and dismissed the same way (`popToTop`) rather than being the screen you start on.

**Keyboard controls** (`src/screens/components/useKeyboardShortcuts.ts`, web-only — a no-op on
native): Map supports arrow-key movement in addition to the D-pad; `B` opens the Bag, `P` opens the
Party sheet/screen, `M` opens/returns-to the Home menu (from any secondary screen, `M` pops straight
back to the Map root), and in Battle View `R` flees the encounter. Hovering a button with a mouse for
2+ seconds shows a short explanatory tooltip (`HoverTip` component, wraps action buttons in Battle,
Shop, and Home) — a web-only affordance, inert on touch.

**Starter selection** is no longer a direct tap-to-choose grid. New Game asks the player's name
(`NameEntryScreen`, stored in `gameStore.playerName`), then after Region Select the player answers a
3-question, island-themed personality quiz (`src/game/starterQuiz.ts`, `StarterQuizScreen.tsx` —
ferry crossing / harbour chore / festa fireworks, each option leaning Fire/Water/Grass); the
majority-answer line is assigned automatically and confirmed on a reveal screen
(`StarterSelectScreen.tsx`) rather than picked by hand.

**Map** (`src/game/mapData.ts`, `src/game/zones.ts`, `src/screens/MapScreen.tsx`) is three
hand-authored irregular tile grids — Melita Woods (a 9x9 diamond-shaped clearing), Luzzu Harbour (a
7x11 harbour with a narrow pier jutting out to the exit), Azure Caverns (a 9x9 zigzag cave) — chained
in a line, each with one exit tile leading to the next zone and one entrance (where the player
arrives), matching the "one exit, one entrance" brief rather than the spec's full
node-graph-of-many-zones world. Each zone is a genuinely different size and silhouette rather than a
uniform square: trees carve the outer shape as well as blocking movement, so the walkable footprint
itself reads as an organic blob, a pier, or a winding passage (`parseMap` validates all rows in a
zone are equal length; connectivity from the entrance to every dark-grass tile and the exit was
hand-verified with a throwaway BFS script, not asserted at runtime). Movement is a 4-directional
D-pad or the arrow keys (web) rather than the spec's tap-to-pathfind (simpler to build correctly
first); the player avatar is a directional glyph, not sprite art, per the agreed "stylized
placeholders" approach.

The tall-grass tile is now called **Dark Grass** and is deliberately far apart from Path in both hue
and value — a near-black saturated green with a faint texture glyph vs. a warm, light sandy tan — so
it never reads as "maybe just more path." **Encounters only trigger in Dark Grass** (`isEncounterTile`
checks for the `"grass"` tile type only; Path and Exit tiles never roll an encounter). Walking onto a
Dark Grass tile rolls a 19.5% chance (`ENCOUNTER_CHANCE` in `MapScreen.tsx` — bumped 30% from an
original 15% baseline) to trigger a wild battle drawn from `src/game/encounterTable.ts`'s weighted
pool, whose level range is set per zone in `zones.ts` — later zones spawn stronger wild creatures.
Triggering an encounter plays a screen-flash transition (a quick burst of white flashes, the classic
"surprise encounter" cut from the mainline games — `ENCOUNTER_FLASH_SEQUENCE` in `MapScreen.tsx`)
before navigating into Battle View, instead of cutting instantly.

Each zone also has exactly one **Healing Center** tile (✚, distinct blue) reachable from the entrance
without crossing Dark Grass. Stepping onto it fully revives every currently-KO'd (`currentHp <= 0`)
party member to max HP via `gameStore.healFaintedPartyMembers()` — deliberately *only* those, not a
full-party top-up like the mainline games' Pokemon Centers; a conscious-but-damaged party member is
left as-is. This is the mechanism for recovering from a full-party blackout without needing to catch a
new lead or grind currency for medicine.

Battle View is driven by the real engine (`src/engine/battleManager.ts`), including a working Catch
action (`src/engine/catching.ts` wired to the Bag's ball items), randomized wild encounters, **party
switching** (voluntary mid-battle via the Party sheet, costing the turn; forced and free when the
active creature faints and a reserve remains — `BattleStateMachine.replacePlayerActive`), a **Run
Away** button (flees the encounter immediately, no reward, no penalty — a client-side action, since
the engine's `resolveAction` already treats a submitted `"flee"` action as a no-op and this bypasses
`submitActions` entirely rather than teaching the engine a new outcome), and a **Use Item** button
that genuinely restores HP or grants a level: it opens a sheet of the medicine/Kinnie items you're
carrying, consumes one, and either heals the active creature by that item's flat `healAmount` (see
4.3 — Pastizz/Qassata/Ftira biz-Zejt are 15/40/80 HP, not a percentage) or, for a Kinnie, bumps its
level by 1 (recomputing stats via `effectiveStats` and partially topping up HP the same way a normal
level-up does) — either way this costs the turn, matching how throwing a ball or switching does.

**Turns resolve genuinely one attacker at a time.** `BattleStateMachine.submitActions` takes an
optional `onActionResolved` callback that fires synchronously, once per actor that actually got to
act, in real speed/priority order (`src/engine/battleManager.ts`) — exactly one call if the faster
actor's hit ends the battle before the slower one can move, matching the mainline games (the second
actor never "acts" at all in that case, not just visually skipped). Battle View's reveal is driven
entirely off this callback rather than a separately-computed guess at turn order, so what's shown can
never drift from what the engine actually did; each beat plays with its own delay before the next,
so a turn always reads as "your creature attacks, then — if it's still standing — the wild creature
attacks," never both at once. The battle log now shows the real numbers behind each hit: `"Dealt N
damage!"`, `"A critical hit!"`, `"It's super effective!"` / `"It's not very effective..."` / `"It had
no effect..."` (from the real type multiplier), a fainted-this-hit line, or `"But it missed!"` for a
move that failed its accuracy roll (see 1.3a) — not just the bare "X used Y" announcement. Defeating
or catching a wild creature also rolls a 10% chance to drop a **Kinnie** (never sold, drop-only — see
4.3), noted in the Result Screen and the battle log.

**Levels/XP**: starters begin at level 5 (`STARTER_STARTING_LEVEL`), defeating a wild creature grants
XP and gold (`src/game/progression.ts`), and stats scale with level via `effectiveStats()` rather
than staying flat. Catching adds a real party member (`src/game/party.ts`), which Party, Codex
("seen"/"caught" tracking), and Creature Detail (stats, moves, HP, XP-to-next-level) all read from
the same `zustand` store (`src/state/gameStore.ts`) — no separate mock data path for these screens.
Party and Creature Detail also expose a **Release** action (with an inline "are you sure?" confirm
step, no native alert) for any party member as long as it isn't your last one. Creature Detail also
has its own **Use Item** button — the same heal/level-up items usable in battle are usable here too,
outside of battle, via `gameStore.useItemOnPartyMember` (which is how a fainted party member can be
healed back up at all, since there's no separate Revive item and Battle's Use Item only ever touches
whichever creature is currently active).
Each combatant panel shows a generated `CreatureAvatar` (type-colored token, no illustrated art) with
lunge/hit/faint/heal/crux-glow/catch-wobble/flee animations plus a hit-flash tint on big hits.
The Result Screen shows win/lose/caught/fled plus gold and XP earned (and a level-up notice) — still
no XP *bar* animation or catch-prompt flourish. Move Select shows type +
name only, no PP (PP isn't modeled in the engine) and no long-press tooltip. The Codex/Party stat and
move displays surface the same "not recorded yet" gaps flagged in section 3.1 (stage-1/2 starters
have no authored stat block) rather than inventing numbers.

**Shop** (`src/screens/ShopScreen.tsx`) sells Balls and Medicine for gold (`src/data/items.json`'s
`price` field); Key Items aren't for sale. Gold is earned from both catching and defeating wild
creatures (`currencyRewardForLevel`), starting balance 50. The starting Bag is deliberately small —
3 Pastizz and 3 Greca Traps only; Melitan Ball, Festa Trap, Qassata, and Ftira biz-Zejt all start at
0 and must be bought.

The creature roster (section 3.3) now includes one original wild species, **Fossary** (Bug/Grass,
`src/data/wildCreatures.json`), and the three regional variants are fully battle-ready with real
stats and movesets in `src/data/regionalVariants.json` — still a small roster overall (starters +
Fossary + 3 variants + 3 legendaries) shared across all three zones; only the level range shifts by
zone, not the species pool, since there's no real per-zone spawn table yet.

### 4.2 Touch Controls

- **Overworld:** virtual joystick (left-thumb zone, auto-hide when idle) OR tap-to-pathfind (recommended primary — better one-handed mobile ergonomics); interact button context-sensitive (bottom-right thumb zone).
- **Battle:** swipe-up quick-menu for moves (avoids deep menu nesting); long-press a move for a tooltip (power/accuracy/effect) before committing — prevents mis-taps on small screens.
- **One-thumb mode:** optional setting that collapses joystick + action button into a single bottom-right radial control cluster reachable without repositioning grip.

### 4.3 Maltese Cultural Touches (flavor layer, non-mechanical unless noted)

- **Pastizz** (formerly "Pastizzi") — consumable medicine, restores a flat 15 HP (mechanical, via the Use Item button in Battle or Creature Detail).
- **Qassata** — consumable medicine, restores a flat 40 HP. Shop-only, not in the starting Bag.
- **Ftira biz-Zejt** — consumable medicine, restores a flat 80 HP. Shop-only, not in the starting Bag.
- **Kinnie** — a real bittersweet Maltese soft drink, reimagined here as a rare item that instantly grants +1 level. Never sold in the Shop — the only way to get one is a 10% drop chance from defeating or catching a wild creature.
- **"Il-Għajn" ward charm** — key item cosmetic + minor passive (e.g., +1 flee-chance stage). Renamed from the original brief's "Eye of Osiris" (Egyptian, not Maltese) to draw on the real Mediterranean evil-eye protective charm for authenticity.
- **Festa events** — limited-time in-game festival triggers (fireworks minigame, bonus spawn rates, exclusive vendor stock) tied to the in-game calendar.
- **Local terms** (*Mela, Ħobż, Ċaw*) — used in NPC barks/flavor text only, not menu labels, to keep navigation universally clear for a global mobile audience.

---

## 5. Technical Stack & Implementation Architecture

### 5.1 Stack

**React Native (Expo) + TypeScript**, with a 2D canvas layer via `react-native-skia` for battle/overworld rendering.

Reasoning: the battle system here is fundamentally *data-driven turn logic*, not real-time physics/3D — a JS/TS stack ships to both app stores from one codebase with less native-build overhead than Unity, and is easier to iterate on with AI-assisted code generation (smaller, clearly-typed files). If future scope wants heavier 3D overworld exploration, Unity becomes the stronger call — flag this as a re-evaluation point at the end of the vertical-slice milestone, not before.

**Core packages:** `expo`, `zustand` (state), `react-navigation`, `expo-sqlite` (persistence), `@shopify/react-native-skia` (2D rendering/animation), `zod` (runtime schema validation for the JSON creature/move data).

### 5.2 Data Persistence Schema (SQLite)

See `src/db/schema.sql` (reference copy) and `src/db/schema.ts` (the runtime string applied via `src/db/index.ts`'s `getDb()`, since Metro/tsc don't resolve raw `.sql` imports) — implements `player_state`, `owned_creatures`, `inventory`, `quest_flags`, and `codex_entries` tables exactly as specified, including the IV/EV/moveset JSON-blob columns and the party-slot vs. box distinction.

### 5.3 Engine Implementation

The core turn-based engine is implemented under `src/engine/`:

- `types.ts` — `Creature`, `Move`, `Stats`, `BattleAction`, `BattleContext` types.
- `statStages.ts` — the -6..+6 stat-stage multiplier table.
- `typeChart.ts` — loads `type_chart.json` and exposes `getTypeMultiplier(attackType, defenderTypes[])`.
- `damage.ts` — the full damage formula (STAB, type effectiveness, crit, Crux Aura, random factor, weather), rounding down at each multiplication stage per spec.
- `cruxAura.ts` — the Crux Aura `StatusEffect` (`onApply`/`onTurnTick`/`onExpire` hooks), including alignment-based effect branching and the Aura-Spent decay debuff.
- `priority.ts` — turn-order sort (priority DESC, effective speed DESC, random tiebreak).
- `catching.ts` — the catch-value / shake-probability formula, including the story-flag gate for legendaries.
- `battleManager.ts` — the explicit finite-state machine described in Section 1.1, plus `resolveTurn()` for a single action-resolution pass.

All modules are unit-tested under `src/engine/__tests__/`.
