import { View, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme/colors";

export function Screen({ children, scroll = false, padded = true, bg = "deep", edges = ["top", "left", "right"] }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      {bg === "deep" && (
        <>
          <LinearGradient
            colors={["#1a0b3a", "#0b0516"]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, height: 400 }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -80,
              right: -60,
              width: 260,
              height: 260,
              borderRadius: 260,
              backgroundColor: "rgba(217,70,239,0.18)",
            }}
          />
        </>
      )}
      <SafeAreaView edges={edges} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: padded ? 16 : 0 }}>{children}</View>
      </SafeAreaView>
    </View>
  );
}
