import { useEffect } from "react";
import { Redirect, Stack } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useAuth } from "../../src/contexts/AuthContext";

export default function StaffLayout() {
  const { ready, type } = useAuth();

  useEffect(() => {
    // Lock to landscape for all staff screens
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, []);

  if (!ready) return null;
  if (type !== "staff") return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0b0516" },
        animation: "fade",
      }}
    >
      <Stack.Screen name="pos" />
      <Stack.Screen name="store-pick" options={{ presentation: "modal" }} />
      <Stack.Screen name="cash-open" options={{ presentation: "modal" }} />
      <Stack.Screen name="cash-close" options={{ presentation: "modal" }} />
      <Stack.Screen name="payment" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="receipt" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="scan-barcode" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="scan-customer" options={{ presentation: "fullScreenModal" }} />
    </Stack>
  );
}
