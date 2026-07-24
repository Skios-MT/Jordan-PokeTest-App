import { z } from "zod";

export const TypeNameSchema = z.enum([
  "Steel",
  "Ghost",
  "Psychic",
  "Rock",
  "Water",
  "Fire",
  "Grass",
  "Electric",
  "Ground",
  "Flying",
  "Fighting",
  "Fairy",
  "Ice",
  "Bug",
  "Poison",
  "Normal",
  "Dark",
  "Dragon",
]);

export const StatBlockSchema = z.object({
  hp: z.number().int().positive(),
  atk: z.number().int().positive(),
  def: z.number().int().positive(),
  spatk: z.number().int().positive(),
  spdef: z.number().int().positive(),
  speed: z.number().int().positive(),
});

export const StarterStageSchema = z.object({
  id: z.string(),
  name: z.string(),
  stage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  types: z.array(TypeNameSchema).min(1).max(2),
  evolvesAtLevel: z.number().int().positive().nullable(),
});

export const StarterLineSchema = z.object({
  line: z.enum(["Grass", "Fire", "Water"]),
  stages: z.array(StarterStageSchema).length(3),
  baseStatsFinal: StatBlockSchema,
  signatureMove: z.string(),
  rideAbility: z.string().optional(),
});

export const StartersFileSchema = z.object({
  starters: z.array(StarterLineSchema),
});

export const LegendarySchema = z.object({
  id: z.string(),
  name: z.string(),
  types: z.array(TypeNameSchema).min(1).max(2),
  aesthetic: z.string(),
  baseStats: StatBlockSchema,
  signatureMove: z.string(),
  storyFlagRequired: z.string(),
});

export const LegendariesFileSchema = z.object({
  legendaries: z.array(LegendarySchema),
});

export const RegionalVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  types: z.array(TypeNameSchema).min(1).max(2),
  flavor: z.string(),
});

export const RegionalVariantsFileSchema = z.object({
  regionalVariants: z.array(RegionalVariantSchema),
});

export const TypeChartFileSchema = z.object({
  types: z.array(z.string()),
  coreTypes: z.array(z.string()),
  referenceOnlyTypes: z.array(z.string()),
  matrix: z.record(z.string(), z.record(z.string(), z.number())),
});

export type TypeName = z.infer<typeof TypeNameSchema>;
export type StatBlock = z.infer<typeof StatBlockSchema>;
export type StarterLine = z.infer<typeof StarterLineSchema>;
export type Legendary = z.infer<typeof LegendarySchema>;
export type RegionalVariant = z.infer<typeof RegionalVariantSchema>;
export type TypeChartFile = z.infer<typeof TypeChartFileSchema>;
