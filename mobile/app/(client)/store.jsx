import { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Card } from "../../src/components/Card";
import { Loader, Empty } from "../../src/components/Loader";
import { storesPublicFull, events, news, customerMe, customerProfile } from "../../src/api/endpoints";
import { fmtDateTime } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";
import { useAuth } from "../../src/contexts/AuthContext";

export default function ClientStore() {
  const { refreshUser } = useAuth();
  const [me, setMe] = useState(null);
  const [stores, setStores] = useState([]);
  const [evts, setEvts] = useState([]);
  const [nws, setNws] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, s, e, n] = await Promise.all([
        customerMe(),
        storesPublicFull(),
        events().catch(() => []),
        news().catch(() => []),
      ]);
      setMe(m);
      setStores(s || []);
      setEvts(e || []);
      setNws(n || []);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const pickStore = async (sid) => {
    try {
      await customerProfile({ preferred_store_id: sid });
      await load();
      refreshUser({ preferred_store_id: sid });
    } catch (e) {
      Alert.alert("Erreur", e?.message || "Impossible de changer de magasin.");
    }
  };

  if (!me) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.fuchsia} />}
      >
        <Text className="text-white text-2xl font-black mb-3">Boutique</Text>

        {stores.length === 0 ? (
          <Empty title="Aucune boutique" subtitle="Les boutiques apparaîtront ici." />
        ) : (
          stores.map((s) => {
            const active = me.preferred_store_id === s.id;
            return (
              <Pressable key={s.id} onPress={() => pickStore(s.id)}>
                <Card tone={active ? "hi" : "glass"} style={{ marginBottom: 10, borderColor: active ? colors.fuchsia : colors.border }}>
                  <View className="flex-row items-start">
                    <LinearGradient
                      colors={active ? ["#a855f7", "#d946ef"] : ["#1a0f30", "#120a24"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 12 }}
                    >
                      <Ionicons name="storefront" size={22} color="white" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <View className="flex-row items-center">
                        <Text className="text-white font-bold text-base">{s.name}</Text>
                        {active && (
                          <View className="ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.fuchsia }}>
                            <Text className="text-white text-[10px] font-bold">Préférée</Text>
                          </View>
                        )}
                      </View>
                      {s.address && <Text className="text-slate-400 text-xs mt-1">{s.address}</Text>}
                      {s.hours && <Text className="text-slate-500 text-[11px] mt-1">⏱ {s.hours}</Text>}
                      {s.phone && <Text className="text-slate-500 text-[11px] mt-1">📞 {s.phone}</Text>}
                    </View>
                    {!active && <Ionicons name="chevron-forward" size={18} color={colors.slate400} />}
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}

        {/* Events */}
        {evts.length > 0 && (
          <>
            <Text className="text-white font-bold text-lg mt-5 mb-2">Évènements</Text>
            {evts.map((e) => (
              <Card key={e.id} tone="glass" style={{ marginBottom: 10 }}>
                <View className="flex-row items-center">
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.bgCardHi, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                    <Ionicons name="calendar" size={22} color={colors.fuchsia} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="text-white font-bold">{e.title}</Text>
                    {e.description && <Text className="text-slate-400 text-xs mt-1" numberOfLines={2}>{e.description}</Text>}
                    {e.starts_at && <Text className="text-fuchsia-300 text-[11px] mt-1">{fmtDateTime(e.starts_at)}</Text>}
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* News */}
        {nws.length > 0 && (
          <>
            <Text className="text-white font-bold text-lg mt-5 mb-2">Actualités</Text>
            {nws.map((n) => (
              <Card key={n.id} tone="glass" style={{ marginBottom: 10 }}>
                <View className="flex-row items-center">
                  {n.pinned && <Ionicons name="pin" size={14} color={colors.amber} style={{ marginRight: 6 }} />}
                  <Text className="text-white font-bold" style={{ flex: 1 }}>{n.title}</Text>
                </View>
                {n.body && <Text className="text-slate-400 text-xs mt-2">{n.body}</Text>}
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
