import { Pressable, Text, ActivityIndicator, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients, colors } from "../theme/colors";
import { tapLight } from "../lib/haptics";

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  icon,
  testID,
  style,
  fullWidth = true,
}) {
  const paddings = size === "lg" ? "py-5 px-6" : size === "sm" ? "py-2 px-3" : "py-3.5 px-5";
  const text = size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";
  const content = (
    <View className={`flex-row items-center justify-center ${paddings}`}>
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <>
          {icon ? <View className="mr-2">{icon}</View> : null}
          <Text className={`${text} font-bold text-white tracking-wide`} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </View>
  );

  const handle = () => {
    if (disabled || loading) return;
    tapLight();
    onPress?.();
  };

  if (variant === "primary") {
    return (
      <Pressable
        onPress={handle}
        testID={testID}
        disabled={disabled || loading}
        style={({ pressed }) => [
          { opacity: disabled ? 0.5 : pressed ? 0.9 : 1, width: fullWidth ? "100%" : undefined, borderRadius: 18 },
          style,
        ]}
      >
        <LinearGradient
          colors={gradients.button}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 18 }}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === "success") {
    return (
      <Pressable
        onPress={handle}
        testID={testID}
        disabled={disabled || loading}
        style={({ pressed }) => [
          { opacity: disabled ? 0.5 : pressed ? 0.9 : 1, width: fullWidth ? "100%" : undefined, borderRadius: 18 },
          style,
        ]}
      >
        <LinearGradient
          colors={gradients.success}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 18 }}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  // ghost / outline / dark
  const bg =
    variant === "ghost"
      ? "transparent"
      : variant === "dark"
      ? colors.bgCard
      : "rgba(139,92,246,0.1)";
  const borderColor =
    variant === "ghost" ? "transparent" : variant === "dark" ? "#2a1b4a" : colors.borderHi;

  return (
    <Pressable
      onPress={handle}
      testID={testID}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor,
          borderRadius: 18,
          width: fullWidth ? "100%" : undefined,
        },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}
