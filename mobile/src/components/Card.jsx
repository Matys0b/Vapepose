import { View } from "react-native";
import { colors } from "../theme/colors";

export function Card({ children, style, tone = "default", padding = true }) {
  const bg =
    tone === "hi" ? "rgba(26,15,48,0.9)" :
    tone === "glass" ? "rgba(26,15,48,0.6)" :
    "rgba(15,10,32,0.75)";
  const borderColor = tone === "hi" ? colors.borderHi : colors.border;
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: 1,
          borderRadius: 24,
          padding: padding ? 16 : 0,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 4,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
