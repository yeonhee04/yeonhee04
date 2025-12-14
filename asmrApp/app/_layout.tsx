import { Stack } from "expo-router";
import { PresetProvider } from "../src/context/PresetContext";
import { TimerProvider } from "../src/context/TimerContext";

export default function RootLayout() {
  return (
    <TimerProvider>
      <PresetProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </PresetProvider>
    </TimerProvider>
  );
}