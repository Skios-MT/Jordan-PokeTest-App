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

Two implementation notes/gaps carried over from this table as authored:

- `Ice`, `Bug`, `Poison`, `Normal`, `Dark`, and `Dragon` are referenced above only as attack/defense targets (e.g. "Immune to Poison", "weak vs Bug"), not as one of the 12 named types with their own row. The JSON matrix includes all 18 types that appear anywhere in the table, but the 6 reference-only types default to a neutral (1x) offensive row until a creature/move is actually authored with one of those types.
- The table only defines "Strong vs" (2x), "Weak vs" (the listed type takes 2x from this type), and "Immune to" (0x) — there's no "Resists" column, so the initial `type_chart.json` has no 0.5 entries yet even though the damage formula (1.3) supports them. Resistances are a follow-up balance-data task, not something inferred here.

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
Splash → Title → (New Game: Region Select → Starter Select) / (Continue: Load Save)
   └─▶ HOME (Overworld HUD)
         ├─▶ Party Management (drag-reorder, held items, move-relearn)
         ├─▶ Creature Index (Codex — grid view, filter by type/zone/caught-status)
         ├─▶ Bag/Inventory (categorized tabs: Balls, Medicine, Key Items, Battle Items)
         └─▶ BATTLE VIEW (modal, full-screen)
               ├─▶ Move Select (swipe-up quick menu, 4 moves + type icon + PP)
               ├─▶ Party Switch (bottom-sheet)
               └─▶ Result Screen (XP bar animation, catch prompt, level-up moves)
```

### 4.2 Touch Controls

- **Overworld:** virtual joystick (left-thumb zone, auto-hide when idle) OR tap-to-pathfind (recommended primary — better one-handed mobile ergonomics); interact button context-sensitive (bottom-right thumb zone).
- **Battle:** swipe-up quick-menu for moves (avoids deep menu nesting); long-press a move for a tooltip (power/accuracy/effect) before committing — prevents mis-taps on small screens.
- **One-thumb mode:** optional setting that collapses joystick + action button into a single bottom-right radial control cluster reachable without repositioning grip.

### 4.3 Maltese Cultural Touches (flavor layer, non-mechanical unless noted)

- **Pastizzi** — consumable item, restores stamina/PP (mechanical).
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
