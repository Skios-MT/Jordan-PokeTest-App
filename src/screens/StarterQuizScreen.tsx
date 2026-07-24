import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useGameStore } from "../state/gameStore";
import { STARTER_QUIZ_QUESTIONS, tallyStarterLine } from "../game/starterQuiz";
import type { StarterLineName } from "../game/creatureFactory";
import { ScreenBackground } from "./components/ScreenBackground";
import { colors } from "./theme";

type Props = NativeStackScreenProps<RootStackParamList, "StarterQuiz">;

export function StarterQuizScreen({ navigation }: Props) {
  const selectStarter = useGameStore((s) => s.selectStarter);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<StarterLineName[]>([]);

  const question = STARTER_QUIZ_QUESTIONS[step];

  function handleAnswer(line: StarterLineName) {
    const nextAnswers = [...answers, line];
    if (step + 1 < STARTER_QUIZ_QUESTIONS.length) {
      setAnswers(nextAnswers);
      setStep(step + 1);
      return;
    }
    const winningLine = tallyStarterLine(nextAnswers);
    selectStarter(winningLine);
    navigation.navigate("StarterSelect");
  }

  return (
    <ScreenBackground style={styles.container}>
      <Text style={styles.eyebrow}>
        Question {step + 1} of {STARTER_QUIZ_QUESTIONS.length}
      </Text>
      <Text style={styles.prompt}>{question.prompt}</Text>

      <View style={styles.options}>
        {question.options.map((option) => (
          <Pressable
            key={option.label}
            testID={`quiz-option-${step}-${option.line}`}
            onPress={() => handleAnswer(option.line)}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          >
            <Text style={styles.optionText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    gap: 20,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
  },
  prompt: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "700",
    lineHeight: 28,
    textAlign: "center",
  },
  options: {
    gap: 14,
    marginTop: 12,
  },
  option: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  optionPressed: {
    opacity: 0.8,
    borderColor: colors.accent,
  },
  optionText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
});
