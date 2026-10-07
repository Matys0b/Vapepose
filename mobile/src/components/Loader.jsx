import { View, Text, ActivityIndicator } from "react-native";
import { colors } from "../theme/colors";

export function Loader({ label }) {
  return (
    <View className="flex-1 items-center justify-center" style={{ padding: 24 }}>
      <ActivityIndicator size="large" color={colors.fuchsia} />
      {label ? <Text className="text-slate-400 mt-3 text-sm">{label}</Text> : null}
    </View>
  );
}

export function Empty({ icon, title, subtitle }) {
  return (
    <View className="items-center justify-center p-8">
      {icon ? <View className="mb-3 opacity-60">{icon}</View> : null}
      <Text className="text-slate-200 font-bold text-base">{title}</Text>
      {subtitle ? <Text className="text-slate-500 text-xs text-center mt-1">{subtitle}</Text> : null}
    </View>
  );
}
