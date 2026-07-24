import startersData from "../data/starters.json";
import legendariesData from "../data/legendaries.json";
import regionalVariantsData from "../data/regionalVariants.json";
import {
  StartersFileSchema,
  LegendariesFileSchema,
  RegionalVariantsFileSchema,
  type StatBlock,
  type TypeName,
} from "../data/schemas";

export type DexCategory = "starter" | "legendary" | "regional";

export interface DexEntry {
  speciesId: string;
  name: string;
  types: TypeName[];
  category: DexCategory;
  /** Undefined where the source data doesn't define stats yet (see GAME_SPEC.md gaps). */
  stats?: StatBlock;
  flavor?: string;
  signatureMove?: string;
  storyFlagRequired?: string;
}

const starters = StartersFileSchema.parse(startersData).starters;
const legendaries = LegendariesFileSchema.parse(legendariesData).legendaries;
const regionalVariants = RegionalVariantsFileSchema.parse(regionalVariantsData).regionalVariants;

const starterEntries: DexEntry[] = starters.flatMap((line) =>
  line.stages.map((stage) => ({
    speciesId: stage.id,
    name: stage.name,
    types: stage.types,
    category: "starter" as const,
    // Only the final stage has an authored stat block (spec 3.1 gap) — stage 1/2 show as unrecorded.
    stats: stage.stage === 3 ? line.baseStatsFinal : undefined,
    signatureMove: stage.stage === 3 ? line.signatureMove : undefined,
  }))
);

const legendaryEntries: DexEntry[] = legendaries.map((l) => ({
  speciesId: l.id,
  name: l.name,
  types: l.types,
  category: "legendary" as const,
  stats: l.baseStats,
  flavor: l.aesthetic,
  signatureMove: l.signatureMove,
  storyFlagRequired: l.storyFlagRequired,
}));

const regionalEntries: DexEntry[] = regionalVariants.map((v) => ({
  speciesId: v.id,
  name: v.name,
  types: v.types,
  category: "regional" as const,
  flavor: v.flavor,
}));

export const DEX_ENTRIES: DexEntry[] = [...starterEntries, ...regionalEntries, ...legendaryEntries];

export function getDexEntry(speciesId: string): DexEntry | undefined {
  return DEX_ENTRIES.find((e) => e.speciesId === speciesId);
}
