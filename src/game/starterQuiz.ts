import type { StarterLineName } from "./creatureFactory";

export interface QuizOption {
  label: string;
  line: StarterLineName;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
}

/** Three island-themed questions, each option leaning toward one starter line. */
export const STARTER_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "ferry",
    prompt: "The ferry between the islands is about to leave. Where do you spend the crossing?",
    options: [
      { label: "Below deck, close to the engine's heat", line: "Fire" },
      { label: "At the bow, watching the waves break", line: "Water" },
      { label: "In the shade of the cargo nets, tending the potted lemon trees", line: "Grass" },
    ],
  },
  {
    id: "chore",
    prompt: "It's chore day around the harbour. Which one do you volunteer for?",
    options: [
      { label: "Mending the salt-drying racks under the midday sun", line: "Fire" },
      { label: "Hauling in the morning's fishing nets", line: "Water" },
      { label: "Weeding the terraced vineyard on the hillside", line: "Grass" },
    ],
  },
  {
    id: "festa",
    prompt: "The village festa is lighting up fireworks over the harbour tonight. Where do you want to be?",
    options: [
      { label: "Right underneath the fireworks, feeling the heat", line: "Fire" },
      { label: "Out on a little boat drifting in the harbour", line: "Water" },
      { label: "Up in the hills, among the olive groves, watching from afar", line: "Grass" },
    ],
  },
];

const LINE_PRIORITY: StarterLineName[] = ["Fire", "Water", "Grass"];

/** Tallies quiz answers into a starter line; ties break by LINE_PRIORITY order. */
export function tallyStarterLine(answers: StarterLineName[]): StarterLineName {
  const tally: Record<StarterLineName, number> = { Fire: 0, Water: 0, Grass: 0 };
  for (const line of answers) tally[line] += 1;

  let winner = LINE_PRIORITY[0];
  for (const line of LINE_PRIORITY) {
    if (tally[line] > tally[winner]) winner = line;
  }
  return winner;
}
