import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export function HpBar({ currentHp, maxHp }: { currentHp: number; maxHp: number }) {
  const ratio = Math.max(0, Math.min(1, currentHp / maxHp));
  const fillColor = ratio > 0.5 ? colors.success : ratio > 0.2 ? "#e0c458" : colors.danger;

  const animatedRatio = useRef(new Animated.Value(ratio)).current;

  useEffect(() => {
    Animated.timing(animatedRatio, {
      toValue: ratio,
      duration: 350,
      useNativeDriver: false, // animating `width` (a layout property) can't use the native driver
    }).start();
  }, [ratio, animatedRatio]);

  const width = animatedRatio.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width, backgroundColor: fillColor }]} />
      </View>
      <Text style={styles.label}>
        {Math.max(0, currentHp)} / {maxHp}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: 6,
    backgroundColor: "#0d1b2a",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  fill: {
    height: "100%",
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
});
