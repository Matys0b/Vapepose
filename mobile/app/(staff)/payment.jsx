import { useMemo, useState } from "react";
import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Card } from "../../src/components/Card";
import { Button } from "../../src/components/Button";
import { NumPad } from "./cash-open";
import { useCart } from "../../src/contexts/CartContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { createSale } from "../../src/api/endpoints";
import { fmtEUR } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";
import { success as hSuccess, error as hError } from "../../src/lib/haptics";

const QUICK_CASH = ["5", "10", "20", "50", "100"];

export default function Payment() {
  const { cart, totals, clear } = useCart();
  const { user } = useAuth();
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [other, setOther] = useState("");
  const [focus, setFocus] = useState("cash");
  const [loading, setLoading] = useState(false);

  const paidCash = Number(cash || 0);
  const paidCard = Number(card || 0);
  const paidOther = Number(other || 0);
  const paid = Math.round((paidCash + paidCard + paidOther) * 100) / 100;
  const remaining = Math.max(0, Math.round((totals.total - paid) * 100) / 100);
  const change = Math.max(0, Math.round((paid - totals.total) * 100) / 100);

  const current = focus === "cash" ? cash : focus === "card" ? card : other;
  const setCurrent = (v) => (focus === "cash" ? setCash(v) : focus === "card" ? setCard(v) : setOther(v));

  const push = (k) => {
    if (k === "del") return setCurrent(current.slice(0, -1));
    if (k === "." && current.includes(".")) return;
    if ((current.split(".")[1] || "").length >= 2 && k !== ".") return;
    setCurrent((current + k).slice(0, 8));
  };

  const payExact = () => {
    const left = Math.max(0, Math.round((totals.total - paidCash - paidOther) * 100) / 100);
    if (focus === "cash") setCash(String(totals.total));
    else if (focus === "card") setCard(String(left));
    else setOther(String(left));
  };

  const quickCash = (v) => setCash(String(v));

  const validate = async () => {
    if (paid + 0.001 < totals.total) {
      Alert.alert("Paiement insuffisant", `Il manque ${fmtEUR(remaining)}.`);
      return;
    }
    const payments = [];
    if (paidCash > 0) payments.push({ method: "cash", amount: paidCash });
    if (paidCard > 0) payments.push({ method: "card", amount: paidCard });
    if (paidOther > 0) payments.push({ method: "other", amount: paidOther });

    setLoading(true);
    try {
      const sale = await createSale({
        items: cart.items.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount: it.discount || 0,
          name: it.name,
          vat_rate: it.vat_rate || 20,
        })),
        payments,
        global_discount: cart.global_discount || 0,
        customer_id: cart.customer?.id || null,
        store_id: user?.store_id || null,
        applied_reward_id: cart.appliedRewardId || null,
      });
      hSuccess();
      clear();
      router.replace({ pathname: "/(staff)/receipt", params: { number: String(sale.number || ""), total: String(sale.total), change: String(sale.change_due || 0), loyalty: String(sale.loyalty_added || 0) } });
    } catch (e) {
      hError();
      Alert.alert("Erreur", e?.message || "Vente non enregistrée.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, flexDirection: "row", padding: 16, gap: 16 }}>
        {/* LEFT — totals + methods */}
        <View style={{ flex: 1.2 }}>
          <Pressable onPress={() => router.back()} hitSlop={10} className="flex-row items-center mb-3">
            <Ionicons name="chevron-back" size={22} color={colors.slate300} />
            <Text className="text-slate-300 ml-1">Retour au panier</Text>
          </Pressable>

          <LinearGradient
            colors={["#7c3aed", "#d946ef"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24, padding: 24, marginBottom: 14 }}
          >
            <Text className="text-white/80 text-xs uppercase tracking-widest">Total à encaisser</Text>
            <Text className="text-white font-black" style={{ fontSize: 72, letterSpacing: -2 }}>{fmtEUR(totals.total)}</Text>
            <View className="flex-row justify-between mt-2">
              <View>
                <Text className="text-white/70 text-[10px] uppercase tracking-widest">Payé</Text>
                <Text className="text-white font-bold text-lg">{fmtEUR(paid)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text className="text-white/70 text-[10px] uppercase tracking-widest">Restant</Text>
                <Text className="text-white font-bold text-lg">{fmtEUR(remaining)}</Text>
              </View>
              {change > 0 && (
                <View style={{ alignItems: "flex-end" }}>
                  <Text className="text-emerald-200 text-[10px] uppercase tracking-widest">À rendre</Text>
                  <Text className="text-emerald-100 font-black text-xl">{fmtEUR(change)}</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          <View className="flex-row gap-2 mb-3">
            <MethodTile icon="cash" label="Espèces" value={paidCash} focused={focus === "cash"} onPress={() => setFocus("cash")} testID="method-cash" />
            <MethodTile icon="card" label="Carte" value={paidCard} focused={focus === "card"} onPress={() => setFocus("card")} testID="method-card" />
            <MethodTile icon="wallet" label="Autre" value={paidOther} focused={focus === "other"} onPress={() => setFocus("other")} testID="method-other" />
          </View>

          {focus === "cash" && (
            <View className="flex-row gap-2 mb-2 flex-wrap">
              {QUICK_CASH.map((v) => (
                <Pressable key={v} onPress={() => quickCash(v)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border }}>
                  <Text className="text-white font-bold">{v} €</Text>
                </Pressable>
              ))}
              <Pressable onPress={payExact} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.bgCardHi, borderWidth: 1, borderColor: colors.borderHi }}>
                <Text className="text-fuchsia-200 font-bold">Compte juste</Text>
              </Pressable>
            </View>
          )}

          <View style={{ flex: 1 }} />

          <Button
            title={loading ? "Validation…" : paid + 0.001 >= totals.total ? `Valider la vente · ${fmtEUR(totals.total)}` : `Payer ${fmtEUR(remaining)} de plus`}
            variant={paid + 0.001 >= totals.total ? "success" : "primary"}
            onPress={validate}
            disabled={totals.total <= 0}
            loading={loading}
            size="lg"
            testID="btn-validate-sale"
          />
        </View>

        {/* RIGHT — numpad */}
        <View style={{ width: 340, justifyContent: "center" }}>
          <View style={{ backgroundColor: colors.bgCard, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.borderHi, alignItems: "center", marginBottom: 10 }}>
            <Text className="text-slate-400 text-xs uppercase tracking-widest">Saisie {focus}</Text>
            <Text className="text-white font-black" style={{ fontSize: 44, letterSpacing: -1 }}>{fmtEUR(current || 0)}</Text>
          </View>
          <NumPad onPress={push} />
          <Pressable onPress={() => setCurrent("")} className="mt-3 self-center">
            <Text className="text-slate-400 text-xs">Effacer la saisie</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function MethodTile({ icon, label, value, focused, onPress, testID }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }} testID={testID}>
      <View
        style={{
          borderRadius: 18,
          padding: 14,
          backgroundColor: focused ? "rgba(217,70,239,0.15)" : colors.bgCard,
          borderWidth: 2,
          borderColor: focused ? colors.fuchsia : colors.border,
          alignItems: "center",
        }}
      >
        <Ionicons name={icon} size={22} color={focused ? colors.fuchsiaHi : colors.slate300} />
        <Text className="text-white font-bold text-xs mt-1">{label}</Text>
        <Text className="text-slate-300 font-bold mt-1">{fmtEUR(value)}</Text>
      </View>
    </Pressable>
  );
}
