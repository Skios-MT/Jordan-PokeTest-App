import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

const HOVER_DELAY_MS = 2000;

/**
 * Wraps a button-like child with a tooltip that appears after the mouse has
 * hovered for HOVER_DELAY_MS. Web-only affordance (RN's onHoverIn/onHoverOut
 * are no-ops on native/touch, so this is inert but harmless there).
 */
export function HoverTip({ text, children, style }: { text: string; children: React.ReactNode; style?: any }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleHoverIn() {
    timerRef.current = setTimeout(() => setVisible(true), HOVER_DELAY_MS);
  }

  function handleHoverOut() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }

  return (
    <Pressable onHoverIn={handleHoverIn} onHoverOut={handleHoverOut} style={[styles.wrapper, style]}>
      {children}
      {visible && (
        <View pointerEvents="none" style={styles.tooltip}>
          <Text style={styles.tooltipText}>{text}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  tooltip: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    right: 0,
    marginBottom: 6,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    padding: 8,
    zIndex: 20,
  },
  tooltipText: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 15,
  },
});
