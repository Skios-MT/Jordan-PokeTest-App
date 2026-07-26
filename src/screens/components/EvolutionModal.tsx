import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { EvolutionReveal } from "../../game/party";
import { CreatureAvatar } from "./CreatureAvatar";
import { TypeBadge } from "./TypeBadge";
import { colors } from "../theme";

export type EvolutionRevealData = EvolutionReveal;

const AVATAR_SIZE = 96;
/** How long the old form holds still with the "is evolving!" text before the flash starts. */
const INTRO_HOLD_MS = 700;
/** A longer, more dramatic flash burst than the map's encounter-transition flash — this is the
 * bigger moment. The avatar swaps from old to new species exactly at the midpoint, so the cut
 * lands while the screen is flashed white rather than as a visible jump-cut. */
const FLASH_SEQUENCE = [1, 0, 1, 0, 1, 0, 1, 0, 1];
const FLASH_STEP_MS = 90;

type Phase = "intro" | "flashing" | "revealed";

/**
 * Full-screen evolution transformation reveal: the old form holds ("What? X is evolving!"), then
 * a rapid white-flash burst (with the avatar pulsing in scale) plays while the species swaps
 * underneath it, then the new form bounces in ("...X evolved into Y!") with its new type badges
 * and a tap-to-continue hint — only tappable once the reveal has actually finished, so the
 * transformation always gets seen rather than being skippable mid-flash.
 */
export function EvolutionModal({ data, onDismiss }: { data: EvolutionRevealData; onDismiss: () => void }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [showNewForm, setShowNewForm] = useState(false);
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const introTimer = setTimeout(() => {
      setPhase("flashing");
      const midpoint = Math.floor(FLASH_SEQUENCE.length / 2);
      const swapTimer = setTimeout(() => setShowNewForm(true), midpoint * FLASH_STEP_MS);

      const steps = FLASH_SEQUENCE.map((toValue) =>
        Animated.parallel([
          Animated.timing(flashOpacity, { toValue, duration: FLASH_STEP_MS, useNativeDriver: false }),
          Animated.timing(avatarScale, {
            toValue: toValue ? 0.85 : 1.05,
            duration: FLASH_STEP_MS,
            useNativeDriver: false,
          }),
        ])
      );
      Animated.sequence(steps).start(() => {
        setPhase("revealed");
        flashOpacity.setValue(0);
        avatarScale.setValue(0.5);
        Animated.sequence([
          Animated.timing(avatarScale, { toValue: 1.18, duration: 220, useNativeDriver: false }),
          Animated.timing(avatarScale, { toValue: 1, duration: 160, useNativeDriver: false }),
        ]).start();
      });

      return () => clearTimeout(swapTimer);
    }, INTRO_HOLD_MS);

    return () => clearTimeout(introTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentSpeciesId = showNewForm ? data.newSpeciesId : data.oldSpeciesId;
  const currentTypes = showNewForm ? data.newTypes : data.oldTypes;
  const revealed = phase === "revealed";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <Pressable testID="evolution-modal" style={styles.backdrop} onPress={revealed ? onDismiss : undefined}>
        <View style={styles.card}>
          <View style={styles.avatarWrap}>
            <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
              <CreatureAvatar speciesId={currentSpeciesId} types={currentTypes} size={AVATAR_SIZE} />
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.flashOverlay, { opacity: flashOpacity }]} />
          </View>

          <Text style={styles.title}>
            {revealed
              ? `${data.oldDisplayName} evolved into ${data.newDisplayName}!`
              : `What? ${data.oldDisplayName} is evolving!`}
          </Text>

          {revealed && (
            <View style={styles.badgeRow}>
              {data.newTypes.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </View>
          )}

          {revealed && <Text style={styles.tapHint}>Tap anywhere to continue</Text>}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(13,27,42,0.95)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: 14,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  flashOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "#ffffff",
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  tapHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: "italic",
  },
});
