import { useEffect } from "react";
import { Redirect, Tabs } from "expo-router";
import { View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ScreenOrientation from "expo-screen-orientation";
import { useAuth } from "../../src/contexts/AuthContext";
import { colors } from "../../src/theme/colors";

export default function ClientLayout() {
  const { ready, type } = useAuth();

  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {});
  }, []);

  if (!ready) return null;
  if (type !== "customer") return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "rgba(11,5,22,0.95)",
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.fuchsiaHi,
        tabBarInactiveTintColor: colors.slate400,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="loyalty"
        options={{
          title: "Fidélité",
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="qr"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => <QrTabIcon focused={focused} />,
          tabBarButton: (props) => <RaisedTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: "Boutique",
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="messaging" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="year-recap" options={{ href: null }} />
    </Tabs>
  );
}

function QrTabIcon({ focused }) {
  return (
    <LinearGradient
      colors={["#a855f7", "#d946ef", "#ec4899"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
        marginTop: -22,
        shadowColor: "#d946ef",
        shadowOpacity: focused ? 0.9 : 0.5,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
        borderWidth: 3,
        borderColor: "#0b0516",
      }}
    >
      <Ionicons name="qr-code" size={28} color="white" />
    </LinearGradient>
  );
}

function RaisedTabButton({ onPress, children, accessibilityState }) {
  return (
    <Pressable
      testID="tab-qr"
      onPress={onPress}
      style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}
    >
      {children}
      <Text style={{ color: colors.fuchsiaHi, fontSize: 10, fontWeight: "700", marginTop: 2 }}>Mon QR</Text>
    </Pressable>
  );
}
