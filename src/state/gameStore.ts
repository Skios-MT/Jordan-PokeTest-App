import { create } from "zustand";
import type { StarterLineName } from "../game/creatureFactory";

const STARTING_ZONE = "Mainland Melita";
const DEFAULT_PLAYER_NAME = "Traveler";

interface GameState {
  playerName: string;
  selectedLine: StarterLineName | null;
  currentZone: string;
  battlesWon: number;

  selectStarter: (line: StarterLineName) => void;
  recordBattleResult: (won: boolean) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  playerName: DEFAULT_PLAYER_NAME,
  selectedLine: null,
  currentZone: STARTING_ZONE,
  battlesWon: 0,

  selectStarter: (line) => set({ selectedLine: line }),
  recordBattleResult: (won) =>
    set((state) => ({ battlesWon: won ? state.battlesWon + 1 : state.battlesWon })),
  resetGame: () => set({ selectedLine: null, currentZone: STARTING_ZONE, battlesWon: 0 }),
}));
