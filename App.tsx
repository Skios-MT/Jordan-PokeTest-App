import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

/**
 * Splash/Title placeholder — the real screen flow (spec 4.1) hangs off
 * react-navigation once Region Select / Starter Select / HOME are built.
 */
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Project Melita</Text>
      <Text style={styles.subtitle}>Chivalry & Antiquity</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1b2a",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#e0e1dd",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#778da9",
    fontSize: 16,
    marginTop: 8,
  },
});
