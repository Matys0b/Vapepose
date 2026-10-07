import { useCallback, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Card } from "../../src/components/Card";
import { Loader, Empty } from "../../src/components/Loader";
import { customerMe, customerRewards } from "../../src/api/endpoints";
import { fmtDate, loyaltyTier } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";

const TIERS = [
  { name: "Nouveau", min: 0, color: ["#64748b", "#334155"] },
  { name: "Habitué", min: 300, color: ["#8b5cf6", "#6366f1"] },
  { name: "Fidèle", min: 1000, color: ["#a855f7", "#d946ef"] },
  { name: "VIP", min: 2000, color: ["#f0abfc", "#ec4899"] },
];

export default function Loyalty() {
  const [me, setMe] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, r] = await Promise.all([customerMe(), customerRewards().catch(() => [])]);
      setMe(m);
      setRewards(r || []);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!me) return <Screen><Loader /></Screen>;

  const pts = me.loyalty_points || 0;
  const tier = loyaltyTier(pts);

  const available = rewards.filter((r) => r.status === "available");
  const used = rewards.filter((r) => r.status === "used");
  const expired = rewards.filter((r) => r.status === "expired");

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.fuchsia} />}
      >
        <Text className="text-white text-2xl font-black mb-3">Fidélité</Text>

        {/* Tiers */}
        <View className="flex-row gap-2 mb-4">
          {TIERS.map((t) => {
            const active = tier.name === t.name;
            return (
              <View key={t.name} style={{ flex: 1 }}>
                <LinearGradient
                  colors={active ? t.color : ["#1a0f30", "#120a24"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 14,
                    padding: 10,
                    alignItems: "center",
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? "white" : "transparent",
                  }}
                >
                  <Text className="text-white text-[10px] font-bold uppercase">{t.name}</Text>
                  <Text className={active ? "text-white font-black text-sm" : "text-slate-400 text-[10px]"}>
                    {t.min} pts
                  </Text>
                </LinearGradient>
              </View>
            );
          })}
        </View>

        {/* Current progress hero */}
        <LinearGradient
          colors={["#a855f7", "#d946ef", "#ec4899"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 24, padding: 20, marginBottom: 16 }}
        >
          <Text className="text-white/80 text-[11px] uppercase tracking-widest">Mes points</Text>
          <Text className="text-white font-black" style={{ fontSize: 56, letterSpacing: -1 }}>{pts}</Text>
          {tier.next && (
            <Text className="text-white/90 text-xs mt-1">
              Encore <Text className="font-bold">{Math.max(0, tier.next - pts)}</Text> pts pour passer au niveau supérieur
            </Text>
          )}
        </LinearGradient>

        {/* Available */}
        <SectionHeader title="À utiliser" count={available.length} />
        {available.length === 0 ? (
          <Empty title="Aucune récompense disponible" subtitle="Elles apparaîtront ici dès que tu atteindras un palier." />
        ) : (
          available.map((r) => <RewardCard key={r.id} r={r} status="available" />)
        )}

        {/* Used */}
        {used.length > 0 && (
          <>
            <SectionHeader title="Utilisées" count={used.length} />
            {used.map((r) => <RewardCard key={r.id} r={r} status="used" />)}
          </>
        )}

        {/* Expired */}
        {expired.length > 0 && (
          <>
            <SectionHeader title="Expirées" count={expired.length} />
            {expired.map((r) => <RewardCard key={r.id} r={r} status="expired" />)}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function SectionHeader({ title, count }) {
  return (
    <View className="flex-row items-center justify-between mt-4 mb-2">
      <Text className="text-white font-bold">{title}</Text>
      <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: colors.bgCardHi }}>
        <Text className="text-slate-300 text-[10px] font-bold">{count}</Text>
      </View>
    </View>
  );
}

function RewardCard({ r, status }) {
  const label =
    r.kind === "percent" ? `-${Number(r.value)}%` :
    r.kind === "amount" ? `-${Number(r.value)} €` :
    "Offert";
  const dim = status !== "available";
  const bg = status === "available" ? ["#f59e0b", "#f43f5e"] : status === "used" ? ["#334155", "#1e293b"] : ["#1e293b", "#0f172a"];
  return (
    <Card tone="glass" style={{ marginBottom: 10, opacity: dim ? 0.65 : 1 }}>
      <View className="flex-row items-center">
        <LinearGradient
          colors={bg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 60, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 14 }}
        >
          <Text className="text-white font-black">{label}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text className="text-white font-bold">{r.name}</Text>
          <Text className="text-slate-400 text-[11px]">
            {status === "available"
              ? r.expires_at ? `Expire le ${fmtDate(r.expires_at)}` : "Sans expiration"
              : status === "used" ? `Utilisée le ${fmtDate(r.used_at)}` : `Expirée le ${fmtDate(r.expires_at)}`}
          </Text>
        </View>
        {status === "available" && <Ionicons name="checkmark-circle" size={20} color={colors.emerald} />}
      </View>
    </Card>
  );
}
