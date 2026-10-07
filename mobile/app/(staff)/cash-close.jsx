import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Card } from "../../src/components/Card";
import { Button } from "../../src/components/Button";
import { Loader } from "../../src/components/Loader";
import { NumPad } from "./cash-open";
import { cashCurrent, cashClose } from "../../src/api/endpoints";
import { fmtEUR } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";
import { success as hSuccess } from "../../src/lib/haptics";

export default function CashClose() {
  const [session, setSession] = useState(null);
  const [counted, setCounted] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try { setSession(await cashCurrent()); }
    catch (e) { Alert.alert("Erreur", "Aucune session ouverte."); router.back(); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const push = (k) => {
    if (k === "del") return setCounted((a) => a.slice(0, -1));
    if (k === "." && counted.includes(".")) return;
    if ((counted.split(".")[1] || "").length >= 2 && k !== ".") return;
    setCounted((a) => (a + k).slice(0, 8));
  };

  const submit = async () => {
    const n = Number(counted || 0);
    setLoading(true);
    try {
      const res = await cashClose(n, null);
      hSuccess();
      Alert.alert("Caisse fermée", `Écart : ${fmtEUR(res.difference || 0)}\nVentes espèces : ${fmtEUR(res.cash_sales_total)}`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Erreur", e?.message || "Impossible de clôturer.");
    } finally {
      setLoading(false);
    }
  };

  if (!session) return <Screen><Loader /></Screen>;

  const theoretical = (session.opening_amount || 0) + (session.cash_sales_total || 0);
  const diff = Number(counted || 0) - theoretical;

  return (
    <Screen>
      <View className="flex-1 flex-row items-center justify-center p-6">
        <Card tone="hi" style={{ padding: 24, flex: 1, maxWidth: 920, flexDirection: "row", gap: 20 }}>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="lock-closed" size={20} color={colors.rose} />
              <Text className="text-slate-400 text-xs uppercase tracking-widest">Clôture de caisse</Text>
            </View>
            <Text className="text-white text-2xl font-black mb-4">Z — fin de session</Text>

            <View className="flex-row gap-3">
              <SummaryTile label="Fond initial" value={session.opening_amount} />
              <SummaryTile label="Ventes espèces" value={session.cash_sales_total} />
            </View>
            <View className="flex-row gap-3 mt-3">
              <SummaryTile label="Ventes carte" value={session.card_sales_total} />
              <SummaryTile label="Autres" value={session.other_sales_total} />
            </View>
            <View className="flex-row gap-3 mt-3">
              <SummaryTile label="Total ventes" value={session.total_sales} highlight />
              <SummaryTile label="Théorique espèces" value={theoretical} highlight />
            </View>

            <View className="flex-row gap-3 mt-5">
              <Button title="Annuler" variant="dark" onPress={() => router.back()} />
              <Button title={loading ? "…" : "Clôturer"} variant="primary" onPress={submit} loading={loading} />
            </View>
          </View>

          <View style={{ width: 360, alignItems: "center" }}>
            <View style={{ backgroundColor: colors.bg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border, width: "100%", alignItems: "center", marginBottom: 10 }}>
              <Text className="text-slate-500 text-xs uppercase tracking-widest">Compté en caisse</Text>
              <Text className="text-white font-black" style={{ fontSize: 38, letterSpacing: -1 }}>{fmtEUR(counted || 0)}</Text>
              {counted && (
                <Text style={{ color: diff === 0 ? colors.emerald : diff < 0 ? colors.rose : colors.amber, fontWeight: "bold", marginTop: 4 }}>
                  Écart : {fmtEUR(diff)}
                </Text>
              )}
            </View>
            <NumPad onPress={push} />
          </View>
        </Card>
      </View>
    </Screen>
  );
}

function SummaryTile({ label, value, highlight }) {
  return (
    <View style={{ flex: 1, backgroundColor: highlight ? "rgba(217,70,239,0.1)" : colors.bg, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: highlight ? colors.borderHi : colors.border }}>
      <Text className="text-slate-500 text-[10px] uppercase tracking-widest">{label}</Text>
      <Text className="text-white font-black text-lg mt-0.5">{fmtEUR(value)}</Text>
    </View>
  );
}
