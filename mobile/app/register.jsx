import { useState } from "react";
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert, Pressable, Switch } from "react-native";
import { router, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../src/components/Screen";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { useAuth } from "../src/contexts/AuthContext";
import { colors } from "../src/theme/colors";
import { success as hSuccess, error as hError } from "../src/lib/haptics";

export default function Register() {
  const { registerCustomer } = useAuth();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    birth_date: "",
    password: "",
  });
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async () => {
    if (!form.first_name.trim() || !form.email.trim() || !form.password || !form.birth_date) {
      Alert.alert("Information", "Prénom, email, date de naissance et mot de passe requis.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birth_date)) {
      Alert.alert("Information", "Date de naissance au format AAAA-MM-JJ (ex. 1990-05-14).");
      return;
    }
    if (!accept) {
      Alert.alert("Information", "Vous devez accepter les conditions pour continuer.");
      return;
    }
    setLoading(true);
    try {
      await registerCustomer({ ...form, email: form.email.trim(), accept_terms: true });
      hSuccess();
      router.replace("/(client)/home");
    } catch (e) {
      hError();
      Alert.alert("Inscription impossible", e?.message || "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingVertical: 20 }} keyboardShouldPersistTaps="handled">
          <Link href="/login" asChild>
            <Pressable hitSlop={10} className="mb-4 flex-row items-center">
              <Ionicons name="chevron-back" size={20} color={colors.slate300} />
              <Text className="text-slate-300 ml-1">Retour</Text>
            </Pressable>
          </Link>

          <Text className="text-white text-2xl font-black mb-1">Créer un compte client</Text>
          <Text className="text-slate-400 text-xs mb-5">
            Réservé aux personnes majeures (18 ans et plus). Un QR fidélité te sera attribué immédiatement.
          </Text>

          <Card tone="hi">
            <Field label="Prénom" value={form.first_name} onChange={set("first_name")} testID="reg-first" />
            <Field label="Nom (facultatif)" value={form.last_name} onChange={set("last_name")} testID="reg-last" />
            <Field label="Email" value={form.email} onChange={set("email")} keyboardType="email-address" autoCapitalize="none" testID="reg-email" />
            <Field label="Téléphone (facultatif)" value={form.phone} onChange={set("phone")} keyboardType="phone-pad" testID="reg-phone" />
            <Field label="Date de naissance (AAAA-MM-JJ)" value={form.birth_date} onChange={set("birth_date")} placeholder="1990-05-14" testID="reg-birth" />
            <Field label="Mot de passe (6 caractères min.)" value={form.password} onChange={set("password")} secureTextEntry testID="reg-pwd" />

            <View className="flex-row items-center mt-4">
              <Switch
                value={accept}
                onValueChange={setAccept}
                trackColor={{ true: colors.fuchsia, false: "#2a1b4a" }}
                thumbColor={accept ? "#fff" : "#64748b"}
                testID="reg-accept"
              />
              <Text className="text-slate-300 text-xs ml-3 flex-1">
                J'ai 18 ans ou plus et j'accepte la politique de confidentialité et les CGU.
              </Text>
            </View>

            <View className="mt-6">
              <Button
                title="Créer mon compte"
                onPress={onSubmit}
                loading={loading}
                size="lg"
                testID="reg-submit"
              />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({ label, value, onChange, placeholder, secureTextEntry, keyboardType, autoCapitalize, testID }) {
  return (
    <View className="mt-3">
      <Text className="text-xs uppercase text-slate-400 mb-1 tracking-widest">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.slate500}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "sentences"}
        testID={testID}
        style={{
          backgroundColor: "rgba(11,5,22,0.75)",
          borderWidth: 1,
          borderColor: colors.border,
          color: "white",
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
        }}
      />
    </View>
  );
}
