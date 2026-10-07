import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Card } from "../../src/components/Card";
import { Loader } from "../../src/components/Loader";
import { customerMe, customerStats } from "../../src/api/endpoints";
import { fmtEUR, loyaltyTier } from "../../src/lib/format";
import { useAuth } from "../../src/contexts/AuthContext";
import { colors } from "../../src/theme/colors";

export default function ClientHome() {
  const { user, refreshUser } = useAuth();
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([customerMe(), customerStats().catch(() => null)]);
      setMe(m);
      setStats(s);
      refreshUser({ loyalty_points: m.loyalty_points, first_name: m.first_name });
    } catch {}
  }, [refreshUser]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!me) return <Screen><Loader label="Chargement…" /></Screen>;

  const pts = me.loyalty_points || 0;
  const tier = loyaltyTier(pts);
  const progress = tier.next ? Math.min(100, ((pts - tier.min) / (tier.next - tier.min)) * 100) : 100;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.fuchsia} />}
      >
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-slate-400 text-xs uppercase tracking-widest">Bonjour</Text>
            <Text className="text-white text-2xl font-black">{me.first_name || "Vapoteur"} 💜</Text>
          </View>
          <Pressable
            onPress={() => router.push("/(client)/profile")}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgCard, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="person" size={20} color={colors.slate300} />
          </Pressable>
        </View>

        {/* Loyalty hero */}
        <Pressable onPress={() => router.push("/(client)/loyalty")}>
          <LinearGradient
            colors={["#7c3aed", "#a855f7", "#d946ef"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 28, padding: 20, overflow: "hidden" }}
          >
            <View style={{ position: "absolute", top: -40, right: -30, width: 180, height: 180, borderRadius: 180, backgroundColor: "rgba(236,72,153,0.4)" }} />
            <View className="flex-row items-center gap-2">
              <Ionicons name="sparkles" size={14} color="rgba(255,255,255,0.9)" />
              <Text className="text-white text-xs tracking-widest uppercase">Fidélité · {tier.name}</Text>
            </View>
            <View className="flex-row items-baseline mt-1">
              <Text className="text-white font-black" style={{ fontSize: 68, letterSpacing: -2 }}>{pts}</Text>
              <Text className="text-white/80 ml-2 font-bold">pts</Text>
            </View>
            <View className="mt-4">
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-white/80 text-[11px]">
                  {tier.next ? `Prochain niveau` : `Niveau maximum`}
                </Text>
                <Text className="text-white font-bold text-[11px]">{tier.next ? `${pts} / ${tier.next}` : `${pts}`}</Text>
              </View>
              <View style={{ height: 8, borderRadius: 8, backgroundColor: "rgba(11,5,22,0.4)" }}>
                <LinearGradient
                  colors={["#fde68a", "#f0abfc", "#fbcfe8"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: 8, borderRadius: 8, width: `${progress}%` }}
                />
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Primary shortcuts */}
        <View className="flex-row gap-3 mt-4">
          <Shortcut
            icon="qr-code"
            colors={["#a855f7", "#d946ef"]}
            title="Mon QR"
            subtitle="À scanner en caisse"
            onPress={() => router.push("/(client)/qr")}
            testID="shortcut-qr"
          />
          <Shortcut
            icon="gift"
            colors={["#f59e0b", "#f43f5e"]}
            title="Mes récompenses"
            subtitle="Paliers · récompenses"
            onPress={() => router.push("/(client)/loyalty")}
            testID="shortcut-rewards"
          />
        </View>

        <View className="flex-row gap-3 mt-3">
          <Shortcut
            icon="chatbubbles"
            colors={["#06b6d4", "#8b5cf6"]}
            title="Parler à l'équipe"
            subtitle="On te répond en vrai"
            onPress={() => router.push("/(client)/messaging")}
            testID="shortcut-chat"
          />
          <Shortcut
            icon="storefront"
            colors={["#10b981", "#06b6d4"]}
            title="Boutique"
            subtitle="Horaires · évènements"
            onPress={() => router.push("/(client)/store")}
            testID="shortcut-store"
          />
        </View>

        {/* Mini stats */}
        {stats && (
          <View className="flex-row gap-3 mt-4">
            <Card style={{ flex: 1 }}>
              <Text className="text-slate-400 text-[10px] uppercase tracking-widest">Total dépensé</Text>
              <Text className="text-white text-xl font-black mt-1">{fmtEUR(stats.total_spent)}</Text>
            </Card>
            <Card style={{ flex: 1 }}>
              <Text className="text-slate-400 text-[10px] uppercase tracking-widest">Visites</Text>
              <Text className="text-white text-xl font-black mt-1">{stats.sale_count}</Text>
            </Card>
          </View>
        )}

        {/* Last sale */}
        {me.recent_sales?.length > 0 && (
          <Pressable onPress={() => router.push("/(client)/history")}>
            <Card style={{ marginTop: 16 }}>
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="bag-handle" size={14} color={colors.fuchsiaHi} />
                  <Text className="text-slate-400 text-[11px] uppercase tracking-widest">Dernier achat</Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-fuchsia-300 text-xs mr-1">Tout voir</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.fuchsia} />
                </View>
              </View>
              <View className="flex-row justify-between items-end">
                <View>
                  <Text className="text-white font-bold">{me.recent_sales[0].store_name || "Boutique"}</Text>
                  <Text className="text-slate-500 text-[11px]">
                    {new Date(me.recent_sales[0].created_at).toLocaleDateString("fr-FR")} · {me.recent_sales[0].items.length} article(s)
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text className="text-pink-300 font-bold">{fmtEUR(me.recent_sales[0].total)}</Text>
                  {me.recent_sales[0].loyalty_added > 0 && (
                    <Text className="text-emerald-300 text-[10px]">+{me.recent_sales[0].loyalty_added} pts</Text>
                  )}
                </View>
              </View>
            </Card>
          </Pressable>
        )}

        <Text className="text-center text-slate-600 text-[11px] mt-6">Merci de ta fidélité 💜</Text>
      </ScrollView>
    </Screen>
  );
}

function Shortcut({ icon, colors: cs, title, subtitle, onPress, testID }) {
  return (
    <Pressable onPress={onPress} testID={testID} style={{ flex: 1 }}>
      <Card tone="glass" style={{ padding: 14 }}>
        <LinearGradient
          colors={cs}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 8 }}
        >
          <Ionicons name={icon} size={20} color="white" />
        </LinearGradient>
        <Text className="text-white font-bold text-sm">{title}</Text>
        <Text className="text-slate-500 text-[10px] mt-0.5">{subtitle}</Text>
      </Card>
    </Pressable>
  );
}
