import { useCallback, useState } from "react";
import { View, Text, Alert, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { useFocusEffect } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Card } from "../../src/components/Card";
import { Loader } from "../../src/components/Loader";
import { customerMe, customerQRRefresh } from "../../src/api/endpoints";
import { colors } from "../../src/theme/colors";
import { useAuth } from "../../src/contexts/AuthContext";

export default function ClientQR() {
  const [me, setMe] = useState(null);
  const { refreshUser } = useAuth();

  const load = useCallback(async () => {
    try {
      const m = await customerMe();
      setMe(m);
      refreshUser({ qr_token: m.qr_token, loyalty_points: m.loyalty_points });
    } catch {}
  }, [refreshUser]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const regen = async () => {
    Alert.alert(
      "Régénérer le QR ?",
      "L'ancien QR deviendra inactif immédiatement.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Régénérer",
          style: "destructive",
          onPress: async () => {
            try {
              await customerQRRefresh();
              await load();
            } catch {
              Alert.alert("Erreur", "Impossible de régénérer le QR.");
            }
          },
        },
      ]
    );
  };

  if (!me) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <Text className="text-white text-2xl font-black">Mon QR fidélité</Text>
        <Text className="text-slate-400 text-xs mt-1 mb-4">
          Astuce : monte la luminosité à fond pour un scan rapide
        </Text>

        <Card tone="hi" style={{ padding: 20, alignItems: "center" }}>
          <View style={{ backgroundColor: "white", padding: 18, borderRadius: 24 }}>
            <QRCode value={me.qr_token} size={260} />
          </View>
          <View className="flex-row items-center mt-5 px-3 py-2 rounded-full" style={{ backgroundColor: "rgba(217,70,239,0.15)" }}>
            <Ionicons name="sparkles" size={14} color={colors.fuchsiaHi} />
            <Text className="text-fuchsia-200 text-xs ml-2 font-bold">{me.loyalty_points || 0} points</Text>
          </View>
        </Card>

        <Text className="text-slate-500 text-[11px] text-center mt-4 px-6">
          Ton QR ne contient aucune donnée personnelle : c'est un simple identifiant que seul le magasin peut relier à ton compte.
        </Text>

        <Pressable onPress={regen} className="mt-6 flex-row items-center px-3 py-2" testID="btn-regen-qr">
          <Ionicons name="refresh" size={14} color={colors.slate400} />
          <Text className="text-slate-400 text-xs ml-2">Régénérer mon QR</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
