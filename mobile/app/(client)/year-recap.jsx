import { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Card } from "../../src/components/Card";
import { Empty } from "../../src/components/Loader";
import { customerYearRecap } from "../../src/api/endpoints";
import { fmtEUR, loyaltyTier } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export default function YearRecap() {
  const [data, setData] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (y) => {
    setLoading(true);
    try { setData(await customerYearRecap(y)); } catch { setData(null); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(year); }, [load, year]));

  const changeYear = (delta) => { setYear((y) => y + delta); };

  const tier = loyaltyTier(data?.points_earned || 0);
  const monthLabel = data?.peak_month ? MONTHS[parseInt(data.peak_month.slice(5)) - 1] : null;

  return (
    <Screen>
      <View className="flex-row items-center mb-3">
        <Pressable hitSlop={10} onPress={() => router.back()} className="mr-2">
          <Ionicons name="chevron-back" size={24} color={colors.slate300} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text className="text-slate-400 text-xs uppercase tracking-widest">Mon année</Text>
          <View className="flex-row items-center">
            <Pressable onPress={() => changeYear(-1)} hitSlop={10}><Ionicons name="chevron-back" size={18} color={colors.slate400} /></Pressable>
            <Text className="text-white font-black text-xl mx-2" testID="year-recap-year">{year}</Text>
            <Pressable onPress={() => changeYear(1)} hitSlop={10} disabled={year >= new Date().getFullYear()}>
              <Ionicons name="chevron-forward" size={18} color={year >= new Date().getFullYear() ? colors.slate800 : colors.slate400} />
            </Pressable>
          </View>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.fuchsia} />
          <Text className="text-slate-400 text-xs mt-2">Préparation de ton bilan…</Text>
        </View>
      ) : !data || !data.has_data ? (
        <Empty
          icon={<Ionicons name="sparkles-outline" size={44} color={colors.slate500} />}
          title="Pas encore d'histoire pour cette année"
          subtitle={`Reviens au comptoir avec ton QR pour commencer à écrire ton année ${year}.`}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Hero */}
          <LinearGradient
            colors={["#7c3aed", "#d946ef", "#f43f5e"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 32, padding: 22, marginBottom: 16, overflow: "hidden" }}
          >
            <View style={{ position: "absolute", top: -40, right: -30, width: 180, height: 180, borderRadius: 180, backgroundColor: "rgba(255,255,255,0.12)" }} />
            <View style={{ position: "absolute", bottom: -30, left: -30, width: 140, height: 140, borderRadius: 140, backgroundColor: "rgba(255,255,255,0.08)" }} />
            <Text className="text-white/80 text-xs uppercase tracking-widest">Mon année {year}</Text>
            <Text className="text-white font-black" style={{ fontSize: 56, letterSpacing: -2, lineHeight: 60 }}>
              {data.visits} <Text className="text-white/70" style={{ fontSize: 22 }}>visites</Text>
            </Text>
            <Text className="text-white text-base mt-1 font-semibold">
              +{data.points_earned} pts gagnés · {fmtEUR(data.total_spent)}
            </Text>
          </LinearGradient>

          {/* Grid stats */}
          <View className="flex-row flex-wrap" style={{ margin: -5 }}>
            <StatTile
              label="Produits différents"
              value={String(data.distinct_products)}
              icon="grid"
              gradient={["#06b6d4", "#8b5cf6"]}
            />
            <StatTile
              label="Boutique favorite"
              value={data.top_store || "—"}
              hint={data.top_store_visits ? `${data.top_store_visits} visites` : null}
              icon="storefront"
              gradient={["#10b981", "#06b6d4"]}
            />
            <StatTile
              label="Mois le plus actif"
              value={monthLabel || "—"}
              icon="calendar"
              gradient={["#f59e0b", "#f43f5e"]}
            />
            <StatTile
              label="Récompenses débloquées"
              value={String(data.rewards_unlocked)}
              hint={data.rewards_used ? `${data.rewards_used} utilisées` : "Aucune utilisée"}
              icon="gift"
              gradient={["#a855f7", "#d946ef"]}
            />
          </View>

          {/* Biggest sale */}
          {data.biggest_sale && (
            <Card tone="hi" style={{ marginTop: 14 }}>
              <View className="flex-row items-center gap-2 mb-2">
                <Ionicons name="trophy" size={16} color={colors.amber} />
                <Text className="text-slate-400 text-[11px] uppercase tracking-widest">Plus gros panier de l'année</Text>
              </View>
              <View className="flex-row items-end justify-between">
                <View>
                  <Text className="text-white font-black text-3xl">{fmtEUR(data.biggest_sale.total)}</Text>
                  <Text className="text-slate-500 text-xs mt-1">
                    {data.biggest_sale.items} article(s) · {new Date(data.biggest_sale.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                  </Text>
                </View>
                <LinearGradient
                  colors={["#fbbf24", "#f59e0b"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="flame" size={28} color="white" />
                </LinearGradient>
              </View>
            </Card>
          )}

          {/* Top products */}
          {data.top_products?.length > 0 && (
            <>
              <View className="flex-row items-center justify-between mt-5 mb-2">
                <Text className="text-white font-bold text-lg">Ton top 5</Text>
                <Text className="text-slate-500 text-[11px]">Les plus pris</Text>
              </View>
              {data.top_products.map((p, i) => (
                <Card key={p.product_id} tone="glass" style={{ marginBottom: 8 }}>
                  <View className="flex-row items-center">
                    <LinearGradient
                      colors={i === 0 ? ["#fbbf24", "#f59e0b"] : i === 1 ? ["#cbd5e1", "#94a3b8"] : i === 2 ? ["#d97706", "#92400e"] : ["#334155", "#1e293b"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginRight: 12 }}
                    >
                      <Text className="text-white font-black">{i + 1}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text className="text-white font-bold" numberOfLines={1}>{p.name || "Produit"}</Text>
                      <Text className="text-slate-500 text-[11px]">×{p.quantity} · {fmtEUR(p.revenue)}</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </>
          )}

          {/* Closing CTA */}
          <LinearGradient
            colors={["rgba(217,70,239,0.15)", "rgba(124,58,237,0.1)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 16, marginTop: 18, borderWidth: 1, borderColor: colors.border }}
          >
            <Text className="text-white font-bold text-center">
              💜 Merci pour ces {data.visits} passages en {year}
            </Text>
            <Text className="text-slate-400 text-[11px] text-center mt-1">
              Ton niveau fidélité basé sur l'année : <Text className="text-fuchsia-300 font-bold">{tier.name}</Text>
            </Text>
          </LinearGradient>
        </ScrollView>
      )}
    </Screen>
  );
}

function StatTile({ label, value, hint, icon, gradient }) {
  return (
    <View style={{ width: "50%", padding: 5 }}>
      <Card tone="glass" style={{ padding: 14, minHeight: 110 }}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 }}
        >
          <Ionicons name={icon} size={18} color="white" />
        </LinearGradient>
        <Text className="text-slate-500 text-[10px] uppercase tracking-widest">{label}</Text>
        <Text className="text-white font-black text-lg" numberOfLines={1}>{value}</Text>
        {hint ? <Text className="text-slate-500 text-[10px] mt-0.5">{hint}</Text> : null}
      </Card>
    </View>
  );
}
