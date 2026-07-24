import { create } from "zustand";
import { buildStarterParticipant, DEMO_BATTLE_LEVEL, type StarterLineName } from "../game/creatureFactory";
import { partyMemberFromParticipant, type PartyMember } from "../game/party";
import { defaultStartingInventory } from "../game/itemsRepo";

const STARTING_ZONE = "Mainland Melita";
const DEFAULT_PLAYER_NAME = "Traveler";
const MAX_PARTY_SIZE = 6;

interface GameState {
  playerName: string;
  selectedLine: StarterLineName | null;
  currentZone: string;
  battlesWon: number;
  party: PartyMember[];
  seenSpeciesIds: string[];
  caughtSpeciesIds: string[];
  inventory: Record<string, number>;

  selectStarter: (line: StarterLineName) => void;
  recordBattleResult: (won: boolean) => void;
  updatePartyMemberHp: (uid: string, currentHp: number) => void;
  markSeen: (speciesId: string) => void;
  catchCreature: (member: PartyMember) => boolean;
  consumeItem: (itemId: string) => boolean;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  playerName: DEFAULT_PLAYER_NAME,
  selectedLine: null,
  currentZone: STARTING_ZONE,
  battlesWon: 0,
  party: [],
  seenSpeciesIds: [],
  caughtSpeciesIds: [],
  inventory: defaultStartingInventory(),

  selectStarter: (line) => {
    const participant = buildStarterParticipant(line, DEMO_BATTLE_LEVEL, "player-1");
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

  resetGame: () =>
    set({
      selectedLine: null,
      currentZone: STARTING_ZONE,
      battlesWon: 0,
      party: [],
      seenSpeciesIds: [],
      caughtSpeciesIds: [],
      inventory: defaultStartingInventory(),
    }),
}));
