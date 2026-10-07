import { useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Card } from "../../src/components/Card";
import { Button } from "../../src/components/Button";
import { cashOpen } from "../../src/api/endpoints";
import { fmtEUR } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";
import { success as hSuccess } from "../../src/lib/haptics";

export default function CashOpen() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const push = (k) => {
    if (k === "del") return setAmount((a) => a.slice(0, -1));
    if (k === "." && amount.includes(".")) return;
    if ((amount.split(".")[1] || "").length >= 2 && k !== ".") return;
    setAmount((a) => (a + k).slice(0, 8));
  };

  const submit = async () => {
    const n = Number(amount || 0);
    setLoading(true);
    try {
      await cashOpen(n);
      hSuccess();
      router.back();
    } catch (e) {
      Alert.alert("Erreur", e?.message || "Impossible d'ouvrir la caisse.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View className="flex-1 flex-row items-center justify-center p-6">
        <Card tone="hi" style={{ padding: 24, flex: 1, maxWidth: 820, flexDirection: "row", gap: 24 }}>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <View className="flex-row items-center gap-2 mb-2">
              <Ionicons name="cash" size={22} color={colors.emerald} />
              <Text className="text-slate-400 text-xs uppercase tracking-widest">Ouverture de caisse</Text>
            </View>
            <Text className="text-white text-3xl font-black mb-1">Fond de caisse</Text>
            <Text className="text-slate-400 text-sm mb-6">Saisis le montant en espèces présent dans le tiroir avant la première vente.</Text>

            <View style={{ backgroundColor: colors.bg, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
              <Text className="text-slate-500 text-xs uppercase tracking-widest">Montant</Text>
              <Text className="text-white font-black" style={{ fontSize: 48, letterSpacing: -1 }}>
                {fmtEUR(amount || 0)}
              </Text>
            </View>

            <View className="flex-row gap-3 mt-6">
              <Button title="Annuler" variant="dark" onPress={() => router.back()} />
              <Button title={loading ? "…" : "Ouvrir la caisse"} variant="success" onPress={submit} loading={loading} disabled={Number(amount) < 0} />
            </View>
          </View>

          <NumPad onPress={push} />
        </Card>
      </View>
    </Screen>
  );
}

export function NumPad({ onPress }) {
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "del"];
  return (
    <View style={{ width: 300 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {keys.map((k) => (
          <Pressable
            key={k}
            onPress={() => onPress(k)}
            style={({ pressed }) => ({
              width: "31.5%",
              height: 64,
              borderRadius: 16,
              backgroundColor: pressed ? colors.bgCardHi : colors.bgCard,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            {k === "del" ? (
              <Ionicons name="backspace" size={22} color="white" />
            ) : (
              <Text className="text-white font-bold text-2xl">{k}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
