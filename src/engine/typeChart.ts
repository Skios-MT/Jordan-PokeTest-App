import typeChartData from "../data/type_chart.json";
import { TypeChartFileSchema, type TypeName } from "../data/schemas";

const parsed = TypeChartFileSchema.parse(typeChartData);
const matrix = parsed.matrix;

/**
 * Effectiveness of a single attacking type against a single defending type.
 * Defaults to 1 (neutral) for any pair not present in the chart.
 *
 * The matrix is the standard 18-type effectiveness chart (0x/0.5x/1x/2x),
 * including "resists" (0.5x) relationships — e.g. Fire deals 0.5x to Water,
 * Grass deals 0.5x to Fire — matching how the mainline games (Pokemon
 * Yellow's mechanics as the baseline, extended with the newer types this
 * game also uses) actually resolve type advantage.
 */
export function getSingleTypeMultiplier(attackType: TypeName, defenderType: TypeName): number {
  return matrix[attackType]?.[defenderType] ?? 1;
}

/**
 * Combined effectiveness of an attacking type against a (possibly dual-typed)
 * defender: the product across all of the defender's types. This is where the
 * spec's 0/0.5/1/2/4 range comes from (e.g. 2 * 2 = 4 for a double-weak dual type).
 */
export function getTypeMultiplier(attackType: TypeName, defenderTypes: TypeName[]): number {
  return defenderTypes.reduce((mult, defType) => mult * getSingleTypeMultiplier(attackType, defType), 1);
}
