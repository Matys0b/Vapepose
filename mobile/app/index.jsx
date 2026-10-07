import { useEffect } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../src/contexts/AuthContext";
import { colors } from "../src/theme/colors";

export default function Index() {
  const { ready, user, type } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.fuchsia} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (type === "staff") return <Redirect href="/(staff)/pos" />;
  return <Redirect href="/(client)/home" />;
}
