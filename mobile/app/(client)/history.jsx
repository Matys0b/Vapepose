import { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Card } from "../../src/components/Card";
import { Loader, Empty } from "../../src/components/Loader";
import { customerMe } from "../../src/api/endpoints";
import { fmtEUR, fmtDateTime } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";

export default function History() {
  const [me, setMe] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setMe(await customerMe()); } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!me) return <Screen><Loader /></Screen>;
  const sales = me.recent_sales || [];

  return (
    <Screen>
      <View className="flex-row items-center mb-3">
        <Pressable hitSlop={10} onPress={() => router.back()} className="mr-2">
          <Ionicons name="chevron-back" size={24} color={colors.slate300} />
        </Pressable>
        <Text className="text-white text-xl font-black">Mon historique</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.fuchsia} />}
      >
        {sales.length === 0 ? (
          <Empty title="Aucun achat enregistré" subtitle="Ton historique apparaîtra ici après ton prochain passage." />
        ) : sales.map((s) => (
          <Card key={s.id} tone="glass" style={{ marginBottom: 10 }}>
            <View className="flex-row items-center justify-between">
              <View style={{ flex: 1 }}>
                <Text className="text-white font-bold">{s.store_name || "Boutique"}</Text>
                <Text className="text-slate-500 text-[11px] mt-0.5">{fmtDateTime(s.created_at)}</Text>
                <Text className="text-slate-400 text-xs mt-1">{s.items.length} article(s)</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text className="text-pink-300 font-black">{fmtEUR(s.total)}</Text>
                {s.loyalty_added > 0 && <Text className="text-emerald-300 text-[11px] mt-0.5">+{s.loyalty_added} pts</Text>}
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
            {s.items.map((it, idx) => (
              <View key={idx} className="flex-row justify-between py-0.5">
                <Text className="text-slate-300 text-xs" style={{ flex: 1 }} numberOfLines={1}>
                  {it.quantity}× {it.name}
                </Text>
                <Text className="text-slate-400 text-xs">{fmtEUR(it.unit_price * it.quantity - (it.discount || 0))}</Text>
              </View>
            ))}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
