import { create } from "zustand";
import { buildStarterParticipant, STARTER_STARTING_LEVEL, type StarterLineName } from "../game/creatureFactory";
import { partyMemberFromParticipant, partyMemberStats, addExperience, applyLevelUp, type PartyMember } from "../game/party";
import { defaultStartingInventory, getItem } from "../game/itemsRepo";

const STARTING_ZONE_ID = "melita_woods";
const DEFAULT_PLAYER_NAME = "Traveler";
const MAX_PARTY_SIZE = 6;
const STARTING_CURRENCY = 50;

export interface ExperienceGainResult {
  member: PartyMember;
  leveledUp: boolean;
  newLevel: number;
  levelsGained: number;
}

export type UseItemResult =
  | { applied: false }
  | { applied: true; effect: "heal"; healedAmount: number }
  | { applied: true; effect: "level_up"; newLevel: number };

interface GameState {
  playerName: string;
  selectedLine: StarterLineName | null;
  currentZoneId: string;
  battlesWon: number;
  party: PartyMember[];
  seenSpeciesIds: string[];
  caughtSpeciesIds: string[];
  inventory: Record<string, number>;
  currency: number;

  selectStarter: (line: StarterLineName) => void;
  recordBattleResult: (won: boolean) => void;
  updatePartyMemberHp: (uid: string, currentHp: number) => void;
  markSeen: (speciesId: string) => void;
  catchCreature: (member: PartyMember) => boolean;
  consumeItem: (itemId: string) => boolean;
  earnCurrency: (amount: number) => void;
  spendCurrency: (amount: number) => boolean;
  addItem: (itemId: string, quantity: number) => void;
  grantExperience: (uid: string, xp: number) => ExperienceGainResult | null;
  setCurrentZone: (zoneId: string) => void;
  setPlayerName: (name: string) => void;
  releaseCreature: (uid: string) => boolean;
  /** Applies a "heal" or "level_up" item to a party member outside of battle (e.g. from Creature Detail). */
  useItemOnPartyMember: (uid: string, itemId: string) => UseItemResult;
  /** Bumps a party member's level by 1 in the store, independent of any live battle context. */
  bumpPartyMemberLevel: (uid: string) => void;
  /** Healing Center: fully revives every KO'd (currentHp <= 0) party member to max HP.
   * Deliberately leaves already-conscious members untouched, even if not at full HP —
   * this is a blackout-recovery station, not a full-party top-up. Returns how many were healed. */
  healFaintedPartyMembers: () => number;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  playerName: DEFAULT_PLAYER_NAME,
  selectedLine: null,
  currentZoneId: STARTING_ZONE_ID,
  battlesWon: 0,
  party: [],
  seenSpeciesIds: [],
  caughtSpeciesIds: [],
  inventory: defaultStartingInventory(),
  currency: STARTING_CURRENCY,

  selectStarter: (line) => {
    const participant = buildStarterParticipant(line, STARTER_STARTING_LEVEL, "player-1");
    const member = partyMemberFromParticipant(participant, "starter");
    set({
      selectedLine: line,
      party: [member],
      seenSpeciesIds: [member.speciesId],
      caughtSpeciesIds: [member.speciesId],
    });
  },

  recordBattleResult: (won) =>
    set((state) => ({ battlesWon: won ? state.battlesWon + 1 : state.battlesWon })),

  updatePartyMemberHp: (uid, currentHp) =>
    set((state) => ({
      party: state.party.map((m) => (m.uid === uid ? { ...m, currentHp: Math.max(0, currentHp) } : m)),
    })),

  markSeen: (speciesId) =>
    set((state) =>
      state.seenSpeciesIds.includes(speciesId)
        ? state
        : { seenSpeciesIds: [...state.seenSpeciesIds, speciesId] }
    ),

  catchCreature: (member) => {
    const { party, caughtSpeciesIds } = get();
    if (party.length >= MAX_PARTY_SIZE) return false;
    set({
      party: [...party, member],
      caughtSpeciesIds: caughtSpeciesIds.includes(member.speciesId)
        ? caughtSpeciesIds
        : [...caughtSpeciesIds, member.speciesId],
    });
    return true;
  },

  consumeItem: (itemId) => {
    const qty = get().inventory[itemId] ?? 0;
    if (qty <= 0) return false;
    set((state) => ({ inventory: { ...state.inventory, [itemId]: qty - 1 } }));
    return true;
  },

  earnCurrency: (amount) => set((state) => ({ currency: state.currency + Math.max(0, amount) })),

  spendCurrency: (amount) => {
    const { currency } = get();
    if (amount <= 0 || currency < amount) return false;
    set({ currency: currency - amount });
    return true;
  },

  addItem: (itemId, quantity) =>
    set((state) => ({
      inventory: { ...state.inventory, [itemId]: (state.inventory[itemId] ?? 0) + quantity },
    })),

  grantExperience: (uid, xp) => {
    const member = get().party.find((m) => m.uid === uid);
    if (!member) return null;
    const result = addExperience(member, xp);
    set((state) => ({
      party: state.party.map((m) => (m.uid === uid ? result.member : m)),
    }));
    return result;
  },

  setCurrentZone: (zoneId) => set({ currentZoneId: zoneId }),

  setPlayerName: (name) => set({ playerName: name.trim().length > 0 ? name.trim() : DEFAULT_PLAYER_NAME }),

  releaseCreature: (uid) => {
    const { party } = get();
    if (party.length <= 1) return false;
    const exists = party.some((m) => m.uid === uid);
    if (!exists) return false;
    set({ party: party.filter((m) => m.uid !== uid) });
    return true;
  },

  useItemOnPartyMember: (uid, itemId) => {
    const { party, inventory } = get();
    const member = party.find((m) => m.uid === uid);
    if (!member) return { applied: false };
    const qty = inventory[itemId] ?? 0;
    if (qty <= 0) return { applied: false };
    const item = getItem(itemId);

    if (item.effect === "heal" && item.healAmount !== undefined) {
      const maxHp = partyMemberStats(member).hp;
      const newHp = Math.min(maxHp, member.currentHp + item.healAmount);
      const healedAmount = newHp - member.currentHp;
      set({
        party: party.map((m) => (m.uid === uid ? { ...m, currentHp: newHp } : m)),
        inventory: { ...inventory, [itemId]: qty - 1 },
      });
      return { applied: true, effect: "heal", healedAmount };
    }

    if (item.effect === "level_up") {
      const leveled = applyLevelUp(member);
      set({
        party: party.map((m) => (m.uid === uid ? leveled : m)),
        inventory: { ...inventory, [itemId]: qty - 1 },
      });
      return { applied: true, effect: "level_up", newLevel: leveled.level };
    }

    return { applied: false };
  },

  bumpPartyMemberLevel: (uid) => {
    const member = get().party.find((m) => m.uid === uid);
    if (!member) return;
    const leveled = applyLevelUp(member);
    set((state) => ({ party: state.party.map((m) => (m.uid === uid ? leveled : m)) }));
  },

  healFaintedPartyMembers: () => {
    const { party } = get();
    let healedCount = 0;
    const healed = party.map((m) => {
      if (m.currentHp > 0) return m;
      healedCount += 1;
      return { ...m, currentHp: partyMemberStats(m).hp };
    });
    if (healedCount > 0) set({ party: healed });
    return healedCount;
  },

  resetGame: () =>
    set({
      playerName: DEFAULT_PLAYER_NAME,
      selectedLine: null,
      currentZoneId: STARTING_ZONE_ID,
      battlesWon: 0,
      party: [],
      seenSpeciesIds: [],
      caughtSpeciesIds: [],
      inventory: defaultStartingInventory(),
      currency: STARTING_CURRENCY,
    }),
}));
