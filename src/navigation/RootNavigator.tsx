import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import { TitleScreen } from "../screens/TitleScreen";
import { RegionSelectScreen } from "../screens/RegionSelectScreen";
import { StarterSelectScreen } from "../screens/StarterSelectScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { BattleScreen } from "../screens/BattleScreen";
import { colors } from "../screens/theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="Title" component={TitleScreen} />
        <Stack.Screen name="RegionSelect" component={RegionSelectScreen} />
        <Stack.Screen name="StarterSelect" component={StarterSelectScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Battle" component={BattleScreen} options={{ presentation: "fullScreenModal" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
