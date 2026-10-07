import { useCallback, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { Screen } from "../../src/components/Screen";
import { Card } from "../../src/components/Card";
import { Button } from "../../src/components/Button";
import { Loader } from "../../src/components/Loader";
import { customerMe, customerDeleteAccount } from "../../src/api/endpoints";
import { useAuth } from "../../src/contexts/AuthContext";
import { storage } from "../../src/lib/storage";
import { colors } from "../../src/theme/colors";

export default function Profile() {
  const { logout } = useAuth();
  const [me, setMe] = useState(null);
  const [bio, setBio] = useState(false);

  const load = useCallback(async () => {
    try { setMe(await customerMe()); } catch {}
    const b = await storage.get("biometric_enabled");
    setBio(b === "1");
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleBio = async () => {
    if (!bio) {
      const supported = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!supported || !enrolled) {
        Alert.alert("Biométrie indisponible", "Configure Face ID / empreinte dans les réglages de ton téléphone.");
        return;
      }
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: "Activer le déverrouillage biométrique" });
      if (r.success) {
        await storage.set("biometric_enabled", "1");
        setBio(true);
      }
    } else {
      await storage.remove("biometric_enabled");
      setBio(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Supprimer mon compte",
      "Cette action est définitive. Tes points, récompenses, messagerie et préférences seront effacés.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer définitivement",
          style: "destructive",
          onPress: async () => {
            try {
              await customerDeleteAccount();
              await logout();
              router.replace("/login");
            } catch (e) {
              Alert.alert("Erreur", e?.message || "Impossible de supprimer.");
            }
          },
        },
      ]
    );
  };

  if (!me) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}>
        <Text className="text-white text-2xl font-black mb-3">Mon profil</Text>

        <Card tone="hi">
          <View className="flex-row items-center">
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.bgCardHi, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
              <Text className="text-white font-black text-xl">{(me.first_name || "?")[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text className="text-white font-bold text-base">{me.first_name} {me.last_name}</Text>
              <Text className="text-slate-400 text-xs mt-0.5">{me.email}</Text>
              {me.phone && <Text className="text-slate-500 text-[11px] mt-0.5">{me.phone}</Text>}
            </View>
          </View>
        </Card>

        <Text className="text-slate-500 text-xs uppercase tracking-widest mt-5 mb-2">Actions</Text>

        <Row icon="receipt" title="Historique d'achats" onPress={() => router.push("/(client)/history")} testID="row-history" />
        <Row icon="chatbubbles" title="Messagerie avec la boutique" onPress={() => router.push("/(client)/messaging")} testID="row-chat" />
        <Row icon="qr-code" title="Mon QR fidélité" onPress={() => router.push("/(client)/qr")} testID="row-qr" />

        <Text className="text-slate-500 text-xs uppercase tracking-widest mt-5 mb-2">Sécurité</Text>
        <Pressable onPress={toggleBio}>
          <Card tone="glass">
            <View className="flex-row items-center">
              <Ionicons name={Platform.OS === "ios" ? "finger-print" : "finger-print"} size={20} color={colors.fuchsiaHi} />
              <Text className="text-white font-bold ml-3" style={{ flex: 1 }}>Déverrouillage biométrique</Text>
              <Text className={bio ? "text-emerald-300 font-bold text-xs" : "text-slate-500 text-xs"}>
                {bio ? "Activé" : "Désactivé"}
              </Text>
            </View>
          </Card>
        </Pressable>

        <View className="mt-6">
          <Button
            title="Se déconnecter"
            variant="dark"
            icon={<Ionicons name="log-out" size={18} color="white" />}
            onPress={async () => { await logout(); router.replace("/login"); }}
            testID="btn-logout"
          />
        </View>

        <Pressable onPress={confirmDelete} className="mt-6 self-center" hitSlop={10} testID="btn-delete">
          <Text className="text-rose-400 text-xs underline">Supprimer définitivement mon compte</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Row({ icon, title, onPress, testID }) {
  return (
    <Pressable onPress={onPress} testID={testID}>
      <Card tone="glass" style={{ marginBottom: 8 }}>
        <View className="flex-row items-center">
          <Ionicons name={icon} size={18} color={colors.fuchsiaHi} />
          <Text className="text-white ml-3" style={{ flex: 1 }}>{title}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.slate400} />
        </View>
      </Card>
    </Pressable>
  );
}
