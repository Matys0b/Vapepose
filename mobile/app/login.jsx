import { useState } from "react";
import { View, Text, TextInput, KeyboardAvoidingView, Platform, Pressable, Alert, ScrollView } from "react-native";
import { router, Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../src/components/Screen";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { useAuth } from "../src/contexts/AuthContext";
import { colors } from "../src/theme/colors";
import { success as hSuccess, error as hError } from "../src/lib/haptics";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Information", "Email et mot de passe requis.");
      return;
    }
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      hSuccess();
      if (res.type === "staff") router.replace("/(staff)/pos");
      else router.replace("/(client)/home");
    } catch (e) {
      hError();
      Alert.alert("Connexion impossible", e?.message || "Email ou mot de passe invalide.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          <View className="items-center mb-6">
            <LinearGradient
              colors={["#a855f7", "#d946ef"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16 }}
            >
              <Text style={{ color: "white", fontSize: 44, fontWeight: "900" }}>V</Text>
            </LinearGradient>
            <Text className="text-white text-3xl font-black" style={{ letterSpacing: 1 }}>VapePOS</Text>
            <Text className="text-slate-400 text-xs mt-1">Caisse & fidélité · un seul compte</Text>
          </View>

          <Card tone="hi">
            <Text className="text-xs uppercase text-slate-400 mb-1 tracking-widest">Email</Text>
            <TextInput
              testID="login-email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="votre@email.fr"
              placeholderTextColor={colors.slate500}
              style={inputStyle}
            />
            <Text className="text-xs uppercase text-slate-400 mt-4 mb-1 tracking-widest">Mot de passe</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                testID="login-password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                placeholder="••••••••"
                placeholderTextColor={colors.slate500}
                style={inputStyle}
              />
              <Pressable
                onPress={() => setShowPwd((v) => !v)}
                style={{ position: "absolute", right: 12, top: 14 }}
                hitSlop={10}
              >
                <Ionicons name={showPwd ? "eye-off" : "eye"} size={20} color={colors.slate400} />
              </Pressable>
            </View>

            <View className="mt-6">
              <Button
                title={loading ? "Connexion…" : "Se connecter"}
                onPress={onSubmit}
                loading={loading}
                size="lg"
                testID="login-submit"
              />
            </View>
          </Card>

          <View className="items-center mt-6">
            <Text className="text-slate-400 text-sm">Pas encore de compte client ?</Text>
            <Link href="/register" asChild>
              <Pressable hitSlop={10} className="mt-2">
                <Text className="text-fuchsia-300 font-bold" testID="link-register">Créer un compte client</Text>
              </Pressable>
            </Link>
          </View>

          <Text className="text-center text-slate-600 text-[11px] mt-10 px-6">
            Les comptes staff et client utilisent le même écran : le profil est détecté automatiquement.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const inputStyle = {
  backgroundColor: "rgba(11,5,22,0.75)",
  borderWidth: 1,
  borderColor: colors.border,
  color: "white",
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 14,
  fontSize: 16,
};
