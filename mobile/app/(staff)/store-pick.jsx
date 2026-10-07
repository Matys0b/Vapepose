import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Card } from "../../src/components/Card";
import { Loader } from "../../src/components/Loader";
import { storesPublic, stores as apiStores } from "../../src/api/endpoints";
import { useAuth } from "../../src/contexts/AuthContext";
import { colors } from "../../src/theme/colors";
import { success as hSuccess } from "../../src/lib/haptics";

export default function StorePick() {
  const { pickStore, user } = useAuth();
  const [list, setList] = useState(null);

  const load = useCallback(async () => {
    try {
      const s = await apiStores().catch(() => storesPublic());
      setList(s || []);
    } catch {
      Alert.alert("Erreur", "Impossible de charger les magasins.");
      setList([]);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const choose = async (s) => {
    try {
      await pickStore(s.id, s.name);
      hSuccess();
      router.replace("/(staff)/pos");
    } catch (e) {
      Alert.alert("Erreur", e?.message || "Impossible de choisir ce magasin.");
    }
  };

  if (!list) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <Text className="text-white text-3xl font-black mb-1">Choix du magasin</Text>
        <Text className="text-slate-400 text-sm mb-8">Bonjour {user?.name}, sélectionne la caisse à ouvrir.</Text>

        <View className="flex-row gap-4" style={{ flexWrap: "wrap", justifyContent: "center" }}>
          {list.map((s, i) => (
            <Pressable key={s.id} onPress={() => choose(s)} testID={`store-pick-${s.code || i}`}>
              <LinearGradient
                colors={i % 2 === 0 ? ["#a855f7", "#d946ef"] : ["#06b6d4", "#8b5cf6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 240, height: 160, borderRadius: 28, alignItems: "center", justifyContent: "center", padding: 18 }}
              >
                <Ionicons name="storefront" size={40} color="white" />
                <Text className="text-white font-black text-xl mt-2">{s.name}</Text>
                <Text className="text-white/80 text-xs mt-1">Code · {s.code}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}
