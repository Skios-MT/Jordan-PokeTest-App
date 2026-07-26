import movesData from "../data/moves.json";
import { MovesFileSchema } from "../data/schemas";
import type { Move } from "../engine/types";

const parsed = MovesFileSchema.parse(movesData);

const movesById: Record<string, Move> = Object.fromEntries(
  parsed.moves.map((move) => [move.id, move])
);

export function getMove(id: string): Move {
  const move = movesById[id];
  if (!move) throw new Error(`Unknown move id: ${id}`);
  return move;
}

export function getMoves(ids: string[]): Move[] {
  return ids.map(getMove);
}

/**
 * Starter-line -> starting moveset. Only `tackle` plus one type move exist in
 * the initial dataset (spec 3.1 doesn't define full learnsets yet), so every
 * starter opens with exactly these two moves.
 */
export const STARTER_MOVESETS: Record<"Grass" | "Fire" | "Water", string[]> = {
  Grass: ["vine_lash", "tackle"],
  Fire: ["ember", "tackle"],
  Water: ["water_jet", "tackle"],
};
