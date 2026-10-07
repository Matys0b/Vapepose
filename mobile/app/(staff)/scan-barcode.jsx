import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Button } from "../../src/components/Button";
import { lookupBarcode, customerByQR, customerAvailableRewards } from "../../src/api/endpoints";
import { useCart } from "../../src/contexts/CartContext";
import { colors } from "../../src/theme/colors";
import { success as hSuccess, error as hError, tapMedium } from "../../src/lib/haptics";

export default function ScanBarcode() {
  const { mode } = useLocalSearchParams();  // 'product' | 'customer'
  const kind = mode === "customer" ? "customer" : "product";
  const [permission, request] = useCameraPermissions();
  const lastScan = useRef({ data: null, at: 0 });
  const { addProduct, attachCustomer } = useCart();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted) request();
  }, [permission]);

  const onScanned = async ({ data, type }) => {
    const now = Date.now();
    if (busy) return;
    if (lastScan.current.data === data && now - lastScan.current.at < 2000) return;
    lastScan.current = { data, at: now };
    setBusy(true);
    tapMedium();
    try {
      if (kind === "product") {
        const p = await lookupBarcode(data);
        addProduct(p);
        hSuccess();
      } else {
        const c = await customerByQR(data);
        const rewards = await customerAvailableRewards(c.id).catch(() => []);
        attachCustomer(c, rewards);
        hSuccess();
      }
      router.back();
    } catch (e) {
      hError();
      Alert.alert(
        kind === "product" ? "Produit introuvable" : "Client introuvable",
        e?.message || "Code non reconnu.",
        [{ text: "OK" }]
      );
      setTimeout(() => setBusy(false), 300);
    }
  };

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="camera-outline" size={60} color={colors.slate400} />
          <Text className="text-white font-bold text-lg mt-3">Autorisation requise</Text>
          <Text className="text-slate-400 text-sm text-center mt-2 mb-6">
            VapePOS a besoin d'accéder à la caméra pour scanner les codes-barres et QR clients.
          </Text>
          <Button title="Autoriser la caméra" onPress={request} fullWidth={false} />
          <Pressable onPress={() => router.back()} className="mt-4">
            <Text className="text-slate-400">Retour</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        onBarcodeScanned={onScanned}
        barcodeScannerSettings={{
          barcodeTypes:
            kind === "customer"
              ? ["qr"]
              : ["ean13", "ean8", "code128", "code39", "upc_a", "upc_e", "qr"],
        }}
      />
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, padding: 16, flexDirection: "row", alignItems: "center" }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}
          testID="scan-close"
        >
          <Ionicons name="close" size={24} color="white" />
        </Pressable>
        <Text className="text-white font-bold ml-3 text-lg">
          {kind === "customer" ? "Scanner le QR client" : "Scanner un code produit"}
        </Text>
      </View>
      <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 300, height: 220, borderRadius: 24, borderWidth: 4, borderColor: "rgba(217,70,239,0.9)", shadowColor: "#d946ef", shadowOpacity: 0.6, shadowRadius: 20 }} />
      </View>
      <View style={{ position: "absolute", bottom: 24, left: 0, right: 0, alignItems: "center" }}>
        <View style={{ backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}>
          <Text className="text-white text-xs">
            {busy ? "Lecture en cours…" : "Place le code dans le cadre"}
          </Text>
        </View>
      </View>
    </View>
  );
}
