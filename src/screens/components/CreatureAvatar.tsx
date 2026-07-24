import { StyleSheet, Text, View } from "react-native";
import { typeColor, typeIcon } from "../theme";
import type { TypeName } from "../../data/schemas";

/** Deterministic small hash so the same species always gets the same pattern. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const PATTERNS = ["plain", "spots", "stripe", "ring"] as const;
type Pattern = (typeof PATTERNS)[number];

function patternFor(speciesId: string): Pattern {
  return PATTERNS[hashString(speciesId) % PATTERNS.length];
}

interface Props {
  speciesId: string;
  types: TypeName[];
  size?: number;
  faded?: boolean;
}

/**
 * A generated, no-art-asset "creature token": a type-colored circle with a
 * type glyph and a deterministic decorative pattern so same-typed species
 * still read as visually distinct. This is the "stylized placeholders"
 * approach agreed on in place of illustrated sprites/character art.
 */
export function CreatureAvatar({ speciesId, types, size = 84, faded }: Props) {
  const primary = types[0];
  const secondary = types[1];
  const pattern = patternFor(speciesId);
  const bg = typeColor(primary);
  const accent = secondary ? typeColor(secondary) : "rgba(255,255,255,0.3)";

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          opacity: faded ? 0.35 : 1,
        },
        secondary ? { borderWidth: size * 0.07, borderColor: accent } : null,
      ]}
    >
      {pattern === "spots" && (
        <>
          <View
            style={[
              styles.deco,
              {
                backgroundColor: accent,
                width: size * 0.16,
                height: size * 0.16,
                borderRadius: size * 0.08,
                top: size * 0.14,
                left: size * 0.18,
              },
            ]}
          />
          <View
            style={[
              styles.deco,
              {
                backgroundColor: accent,
                width: size * 0.12,
                height: size * 0.12,
                borderRadius: size * 0.06,
                bottom: size * 0.16,
                right: size * 0.2,
              },
            ]}
          />
        </>
      )}
      {pattern === "stripe" && (
        <View style={[styles.deco, styles.stripe, { backgroundColor: accent, height: size * 0.16, top: size * 0.44 }]} />
      )}
      {pattern === "ring" && (
        <View
          style={[
            styles.deco,
            styles.ring,
            { width: size * 0.6, height: size * 0.6, borderRadius: size * 0.3, borderColor: accent, borderWidth: size * 0.05 },
          ]}
        />
      )}
      <Text style={[styles.glyph, { fontSize: size * 0.42 }]}>{typeIcon(primary)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  glyph: {
    color: "rgba(13,27,42,0.85)",
  },
  deco: {
    position: "absolute",
    opacity: 0.55,
  },
  stripe: {
    left: 0,
    right: 0,
  },
  ring: {},
});
