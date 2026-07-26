import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { PrimaryButton } from "./components/PrimaryButton";
import { ScreenBackground } from "./components/ScreenBackground";
import { useKeyboardShortcuts } from "./components/useKeyboardShortcuts";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "Help">;

interface HelpSection {
  title: string;
  body: string;
}

const SECTIONS: HelpSection[] = [
  {
    title: "The goal",
    body:
      "Explore the islands of Melita, catch wild creatures, and battle them to grow your party. " +
      "Walking onto Dark Grass tiles (never Path or Exit) has a chance to trigger a wild battle. " +
      "Each zone leads to a tougher one beyond it.",
  },
  {
    title: "Battling",
    body:
      "Turns resolve one attacker at a time — whoever's faster acts first. Every move has a Power " +
      "and an Accuracy (stronger moves tend to have lower accuracy, so they can miss). Type " +
      "match-ups matter: a move can be super effective (2x), not very effective (0.5x), or have no " +
      "effect at all, depending on the target's type — the battle log always tells you which.",
  },
  {
    title: "Crux Aura",
    body:
      "Crux is Melita's signature battle mechanic — a burst of power awakened by resonance with the " +
      "islands' Megalithic ruins. It activates automatically once a creature's HP drops to 33% or " +
      "below, or you can trigger it yourself with the \"Invoke Crux\" button (this costs your turn). " +
      "While active (3 turns), Steel/Fighting creatures gain Attack and Speed, Rock/Psychic/Ghost " +
      "creatures gain Sp. Attack and evasion, and every other type gets a smaller all-around boost. " +
      "When it expires, the creature is briefly \"Aura-Spent\" and weaker for 2 turns — so timing " +
      "when you Invoke Crux is a real risk/reward call, not a free button to mash.",
  },
  {
    title: "Catching",
    body:
      "Throwing a ball at a wild creature has a chance to catch it — lower HP and status conditions " +
      "(like being asleep or paralyzed) both improve your odds. Caught creatures join your party if " +
      "there's room (max 6), otherwise the catch doesn't stick.",
  },
  {
    title: "Healing Centers",
    body:
      "Each zone has one Healing Center (✚ tile). Stepping onto it fully revives any party members " +
      "who have fainted — but it won't top off HP on someone who's still conscious, so it's a " +
      "blackout-recovery stop, not a full heal-up.",
  },
  {
    title: "Party order",
    body:
      "Whichever creature sits first in your party is who leads your next battle. On the Party " +
      "screen, any other conscious creature has a \"Set as Main\" button to swap it to the front.",
  },
  {
    title: "Items & shop",
    body:
      "Your Bag holds Balls, Medicine, Key Items, and Battle Items. Medicine heals a flat amount of " +
      "HP; a Kinnie instantly grants +1 level. Buy more Balls and Medicine at the Shop with gold " +
      "earned from catching or defeating wild creatures.",
  },
  {
    title: "Controls (web)",
    body:
      "Arrow keys move on the map. B opens the Bag, P opens Party, M opens (or returns to) this " +
      "menu, and R flees a battle. On touch devices, use the on-screen D-pad and buttons instead.",
  },
];

export function HelpScreen({ navigation }: Props) {
  useKeyboardShortcuts({ m: () => navigation.popToTop() });

  return (
    <ScreenBackground style={styles.container}>
      <Text style={styles.title}>Help</Text>
      <Text style={styles.subtitle}>Everything you need to know about Chivalry & Antiquity.</Text>

      <ScrollView contentContainerStyle={styles.list}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>

      <PrimaryButton testID="back-button" label="Back" variant="secondary" onPress={() => navigation.goBack()} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  list: {
    gap: 12,
    paddingVertical: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  sectionTitle: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "700",
  },
  sectionBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
