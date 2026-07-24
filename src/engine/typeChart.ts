import typeChartData from "../data/type_chart.json";
import { TypeChartFileSchema, type TypeName } from "../data/schemas";

const parsed = TypeChartFileSchema.parse(typeChartData);
const matrix = parsed.matrix;

/**
 * Effectiveness of a single attacking type against a single defending type.
 * Defaults to 1 (neutral) for any pair not present in the chart.
 *
 * Note: the source spec's table (section 1.4) only defines "Strong vs" (2x),
 * "Weak vs" (this type takes 2x from the listed attacker), and "Immune to" (0x)
 * relationships — there is no "Resists" column, so no pair in the initial
 * dataset currently resolves to 0.5. The damage formula supports 0.5 for when
 * resist relationships are authored in a future balance pass.
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
