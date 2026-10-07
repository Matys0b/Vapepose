import { useEffect } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Button } from "../../src/components/Button";
import { fmtEUR } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";
import { success as hSuccess } from "../../src/lib/haptics";

export default function Receipt() {
  const { number, total, change, loyalty } = useLocalSearchParams();

  useEffect(() => { hSuccess(); }, []);

  const close = () => router.replace("/(staff)/pos");

  const printTicket = () => {
    Alert.alert(
      "Impression Bluetooth — BÊTA",
      "L'intégration avec une imprimante thermique ESC/POS sera validée en Phase 2 sur un modèle physique. Pour l'instant, le ticket est disponible à l'écran.",
      [{ text: "OK" }]
    );
  };

  return (
    <Screen>
      <View className="flex-1 items-center justify-center p-6">
        <LinearGradient
          colors={["#10b981", "#059669"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center", marginBottom: 20 }}
        >
          <Ionicons name="checkmark" size={70} color="white" />
        </LinearGradient>

        <Text className="text-white font-black text-4xl mb-1">Vente validée</Text>
        <Text className="text-slate-400 text-sm mb-6">N° {number || "—"}</Text>

        <View style={{ backgroundColor: "rgba(26,15,48,0.9)", borderWidth: 1, borderColor: colors.borderHi, borderRadius: 24, padding: 24, minWidth: 420 }}>
          <Row label="Total encaissé" value={fmtEUR(total)} big />
          {Number(change) > 0 && <Row label="À rendre au client" value={fmtEUR(change)} tint={colors.emerald} big />}
          {Number(loyalty) > 0 && <Row label="Points fidélité gagnés" value={`+${loyalty} pts`} tint={colors.fuchsia} />}
        </View>

        <View className="flex-row gap-3 mt-8" style={{ minWidth: 520 }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Imprimer le ticket"
              variant="dark"
              icon={<Ionicons name="print" size={18} color="white" />}
              onPress={printTicket}
              testID="btn-print"
            />
            <Text className="text-amber-300 text-[10px] text-center mt-1">Impression BT · bêta</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Prochain client →"
              variant="success"
              size="lg"
              onPress={close}
              testID="btn-next"
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

function Row({ label, value, big, tint }) {
  return (
    <View className="flex-row justify-between items-center py-2">
      <Text className="text-slate-400 text-sm">{label}</Text>
      <Text style={{ color: tint || "white", fontWeight: "900", fontSize: big ? 22 : 16 }}>{value}</Text>
    </View>
  );
}
