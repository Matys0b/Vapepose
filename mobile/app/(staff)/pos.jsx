import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Alert, Image, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Card } from "../../src/components/Card";
import { Button } from "../../src/components/Button";
import { Loader, Empty } from "../../src/components/Loader";
import { listCategories, listProducts, cashCurrent } from "../../src/api/endpoints";
import { useCart } from "../../src/contexts/CartContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { fmtEUR } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";
import { tapLight, warning as hWarn } from "../../src/lib/haptics";

export default function POS() {
  const { user, logout } = useAuth();
  const { cart, totals, addProduct, setQty, removeLine, detachCustomer, applyReward, clear } = useCart();
  const [stack, setStack] = useState([{ id: null, name: "Catégories" }]);  // breadcrumb
  const [cats, setCats] = useState([]);
  const [prods, setProds] = useState([]);
  const [loadingCat, setLoadingCat] = useState(false);
  const [loadingProd, setLoadingProd] = useState(false);
  const [q, setQ] = useState("");
  const [session, setSession] = useState(null);

  // Redirect to store pick if no store
  useFocusEffect(
    useCallback(() => {
      if (!user?.store_id) {
        router.replace("/(staff)/store-pick");
      }
    }, [user?.store_id])
  );

  // Load current session
  const loadSession = useCallback(async () => {
    try { setSession(await cashCurrent()); } catch { setSession(null); }
  }, []);
  useFocusEffect(useCallback(() => { loadSession(); }, [loadSession]));

  // Load categories at current level
  useEffect(() => {
    if (!user?.store_id) return;
    const current = stack[stack.length - 1];
    setLoadingCat(true);
    listCategories(current.id || null)
      .then((data) => setCats(data || []))
      .catch(() => setCats([]))
      .finally(() => setLoadingCat(false));
    // Load products of this category too (shows if level has products)
    setLoadingProd(true);
    listProducts({ category_id: current.id || undefined, limit: 60 })
      .then((data) => setProds(data || []))
      .catch(() => setProds([]))
      .finally(() => setLoadingProd(false));
  }, [stack, user?.store_id]);

  // Search mode — flat results
  useEffect(() => {
    if (!q.trim()) return;
    const t = setTimeout(async () => {
      setLoadingProd(true);
      try {
        const data = await listProducts({ q: q.trim(), limit: 100 });
        setProds(data || []);
      } catch { setProds([]); }
      finally { setLoadingProd(false); }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  const enter = (cat) => { tapLight(); setStack((s) => [...s, { id: cat.id, name: cat.name }]); setQ(""); };
  const backTo = (idx) => { tapLight(); setStack((s) => s.slice(0, idx + 1)); setQ(""); };

  const onPickProduct = (p) => {
    tapLight();
    addProduct(p);
  };

  const openPayment = () => {
    if (cart.items.length === 0) { hWarn(); Alert.alert("Panier vide"); return; }
    if (!session) {
      Alert.alert("Caisse fermée", "Ouvre la caisse avant d'encaisser.", [
        { text: "Annuler", style: "cancel" },
        { text: "Ouvrir la caisse", onPress: () => router.push("/(staff)/cash-open") },
      ]);
      return;
    }
    router.push("/(staff)/payment");
  };

  if (!user?.store_id) return <Screen><Loader label="Sélection du magasin…" /></Screen>;

  const searching = q.trim().length > 0;

  return (
    <Screen padded={false}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        {/* LEFT — catalog */}
        <View style={{ flex: 2.1, padding: 12 }}>
          {/* Header */}
          <View className="flex-row items-center gap-2 mb-3">
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 12 }}>
              <Ionicons name="search" size={18} color={colors.slate400} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Rechercher nom, marque, SKU, EAN…"
                placeholderTextColor={colors.slate500}
                style={{ flex: 1, color: "white", paddingVertical: 12, paddingHorizontal: 8, fontSize: 15 }}
                testID="pos-search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {q.length > 0 && (
                <Pressable onPress={() => setQ("")} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color={colors.slate400} />
                </Pressable>
              )}
            </View>
            <Pressable
              onPress={() => router.push({ pathname: "/(staff)/scan-barcode", params: { mode: "product" } })}
              style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.fuchsia, alignItems: "center", justifyContent: "center" }}
              testID="pos-scan"
            >
              <Ionicons name="barcode" size={26} color="white" />
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: "/(staff)/scan-barcode", params: { mode: "customer" } })}
              style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.violet, alignItems: "center", justifyContent: "center" }}
              testID="pos-scan-customer"
            >
              <Ionicons name="qr-code" size={24} color="white" />
            </Pressable>
            <StaffMenu user={user} logout={logout} session={session} />
          </View>

          {/* Breadcrumb */}
          {!searching && (
            <View className="flex-row items-center flex-wrap mb-3">
              {stack.map((s, i) => (
                <View key={i} className="flex-row items-center">
                  <Pressable onPress={() => backTo(i)}>
                    <Text className={i === stack.length - 1 ? "text-fuchsia-300 font-bold text-sm" : "text-slate-400 text-sm"}>{s.name}</Text>
                  </Pressable>
                  {i < stack.length - 1 && <Ionicons name="chevron-forward" size={14} color={colors.slate500} style={{ marginHorizontal: 6 }} />}
                </View>
              ))}
            </View>
          )}

          {/* Catalog list */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            {/* Subcategories */}
            {!searching && cats.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                {cats.map((c) => (
                  <Pressable key={c.id} onPress={() => enter(c)} testID={`cat-${c.id}`}>
                    <LinearGradient
                      colors={[c.color || "#8b5cf6", shade(c.color || "#8b5cf6")]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 18, minWidth: 150, alignItems: "center" }}
                    >
                      <Text className="text-white font-bold">{c.name}</Text>
                    </LinearGradient>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Products grid */}
            {loadingProd ? (
              <Loader label="Chargement produits…" />
            ) : prods.length === 0 ? (
              !searching && cats.length === 0 ? (
                <Empty title="Aucun produit" subtitle="Catégorie vide." />
              ) : searching ? (
                <Empty title="Rien trouvé" subtitle={`Aucun produit ne correspond à « ${q} »`} />
              ) : null
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {prods.map((p) => (
                  <ProductTile key={p.id} p={p} onPress={() => onPickProduct(p)} />
                ))}
              </View>
            )}
          </ScrollView>
        </View>

        {/* RIGHT — cart */}
        <View style={{ width: 360, backgroundColor: colors.bgSoft, borderLeftWidth: 1, borderLeftColor: colors.border }}>
          <CartPane
            cart={cart}
            totals={totals}
            setQty={setQty}
            removeLine={removeLine}
            applyReward={applyReward}
            detachCustomer={detachCustomer}
            clear={clear}
            openPayment={openPayment}
            session={session}
          />
        </View>
      </View>
    </Screen>
  );
}

function ProductTile({ p, onPress }) {
  const lowStock = p.stock != null && p.stock <= (p.min_stock || 3);
  return (
    <Pressable onPress={onPress} testID={`prod-${p.id}`}>
      <View
        style={{
          width: 160,
          backgroundColor: colors.bgCard,
          borderWidth: 1,
          borderColor: p.is_favorite ? colors.borderHi : colors.border,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <View style={{ height: 80, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
          {p.image_url ? (
            <Image source={{ uri: p.image_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <Ionicons name="pricetag" size={24} color={colors.slate500} />
          )}
          {p.is_favorite && (
            <View style={{ position: "absolute", top: 6, left: 6, backgroundColor: colors.fuchsia, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text className="text-white text-[9px] font-bold">⭐</Text>
            </View>
          )}
        </View>
        <View style={{ padding: 10 }}>
          <Text className="text-white font-bold text-xs" numberOfLines={2}>{p.name}</Text>
          {p.variant && <Text className="text-slate-500 text-[10px]" numberOfLines={1}>{p.variant}</Text>}
          <View className="flex-row items-center justify-between mt-1">
            <Text className="text-fuchsia-300 font-black text-sm">{fmtEUR(p.price)}</Text>
            {p.stock != null && (
              <Text style={{ color: lowStock ? colors.rose : colors.slate400, fontSize: 10, fontWeight: "bold" }}>
                × {p.stock}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function CartPane({ cart, totals, setQty, removeLine, applyReward, detachCustomer, clear, openPayment, session }) {
  return (
    <View style={{ flex: 1, padding: 12 }}>
      {/* Session status */}
      {session ? (
        <View style={{ backgroundColor: "rgba(16,185,129,0.1)", borderWidth: 1, borderColor: "rgba(16,185,129,0.4)", borderRadius: 12, padding: 8, marginBottom: 8, flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="lock-open" size={12} color={colors.emerald} />
          <Text className="text-emerald-300 text-[11px] font-bold ml-2">Caisse ouverte · {fmtEUR(session.opening_amount)}</Text>
        </View>
      ) : (
        <Pressable onPress={() => router.push("/(staff)/cash-open")}>
          <View style={{ backgroundColor: "rgba(244,63,94,0.1)", borderWidth: 1, borderColor: "rgba(244,63,94,0.4)", borderRadius: 12, padding: 8, marginBottom: 8, flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="lock-closed" size={12} color={colors.rose} />
            <Text className="text-rose-300 text-[11px] font-bold ml-2">Caisse fermée · toucher pour ouvrir</Text>
          </View>
        </Pressable>
      )}

      {/* Customer */}
      {cart.customer ? (
        <View style={{ backgroundColor: colors.bgCardHi, borderWidth: 1, borderColor: colors.borderHi, borderRadius: 14, padding: 10, marginBottom: 10 }}>
          <View className="flex-row items-center">
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.fuchsia, alignItems: "center", justifyContent: "center", marginRight: 10 }}>
              <Text className="text-white font-black">{(cart.customer.first_name || "?")[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text className="text-white font-bold text-sm">{cart.customer.first_name} {cart.customer.last_name}</Text>
              <Text className="text-fuchsia-200 text-[11px]">{cart.customer.loyalty_points || 0} pts · fidélité</Text>
            </View>
            <Pressable onPress={detachCustomer} hitSlop={10} testID="cart-detach-customer">
              <Ionicons name="close-circle" size={20} color={colors.slate400} />
            </Pressable>
          </View>
          {cart.availableRewards?.length > 0 && (
            <View className="mt-2">
              <Text className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Récompenses disponibles</Text>
              {cart.availableRewards.map((r) => {
                const active = cart.appliedRewardId === r.id;
                return (
                  <Pressable key={r.id} onPress={() => applyReward(active ? null : r.id)} testID={`reward-${r.id}`}>
                    <View style={{
                      flexDirection: "row", alignItems: "center", padding: 8, borderRadius: 12, marginBottom: 4,
                      backgroundColor: active ? "rgba(217,70,239,0.25)" : colors.bg,
                      borderWidth: 1, borderColor: active ? colors.fuchsia : colors.border,
                    }}>
                      <Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={16} color={active ? colors.fuchsiaHi : colors.slate400} />
                      <Text className="text-white text-xs ml-2" style={{ flex: 1 }}>{r.name}</Text>
                      <Text className="text-fuchsia-200 font-bold text-xs">
                        {r.kind === "percent" ? `-${r.value}%` : r.kind === "amount" ? `-${r.value}€` : "Offert"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      {/* Items */}
      <View style={{ flex: 1 }}>
        {cart.items.length === 0 ? (
          <View className="flex-1 items-center justify-center" style={{ opacity: 0.6 }}>
            <Ionicons name="bag-outline" size={48} color={colors.slate500} />
            <Text className="text-slate-400 text-sm mt-2 font-bold">Panier vide</Text>
            <Text className="text-slate-500 text-xs text-center mt-1 px-6">
              Scanne un code-barres ou touche un produit à gauche
            </Text>
          </View>
        ) : (
          <FlatList
            data={cart.items}
            keyExtractor={(it) => it.product_id}
            renderItem={({ item }) => <CartLine item={item} setQty={setQty} removeLine={removeLine} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Totals */}
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 8 }}>
        <View className="flex-row justify-between">
          <Text className="text-slate-400 text-xs">Sous-total</Text>
          <Text className="text-slate-200 text-xs">{fmtEUR(totals.subtotal)}</Text>
        </View>
        {totals.subtotal !== totals.total && (
          <View className="flex-row justify-between">
            <Text className="text-slate-400 text-xs">Remise / récompense</Text>
            <Text className="text-emerald-300 text-xs">− {fmtEUR(totals.subtotal - totals.total)}</Text>
          </View>
        )}
        <View className="flex-row justify-between items-center mt-1 mb-2">
          <Text className="text-white font-bold">Total</Text>
          <Text className="text-white font-black text-2xl">{fmtEUR(totals.total)}</Text>
        </View>

        <View className="flex-row gap-2 mb-2">
          <Button title="Vider" variant="dark" onPress={() => cart.items.length > 0 && Alert.alert("Vider le panier ?", null, [{ text: "Non" }, { text: "Oui, vider", style: "destructive", onPress: clear }])} testID="btn-clear" />
        </View>
        <Button
          title={`Encaisser · ${fmtEUR(totals.total)}`}
          variant="success"
          size="lg"
          onPress={openPayment}
          disabled={cart.items.length === 0}
          testID="btn-pay"
        />
      </View>
    </View>
  );
}

function CartLine({ item, setQty, removeLine }) {
  const line = item.unit_price * item.quantity - (item.discount || 0);
  return (
    <View style={{ backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 10, marginBottom: 6 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-white font-bold text-xs" style={{ flex: 1 }} numberOfLines={1}>{item.name}</Text>
        <Pressable onPress={() => removeLine(item.product_id)} hitSlop={8} testID={`cart-del-${item.product_id}`}>
          <Ionicons name="trash" size={14} color={colors.slate400} />
        </Pressable>
      </View>
      <View className="flex-row items-center justify-between mt-1">
        <View className="flex-row items-center">
          <QtyBtn icon="remove" onPress={() => setQty(item.product_id, item.quantity - 1)} />
          <Text className="text-white font-bold mx-3 w-6 text-center">{item.quantity}</Text>
          <QtyBtn icon="add" onPress={() => setQty(item.product_id, item.quantity + 1)} />
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text className="text-slate-500 text-[10px]">{fmtEUR(item.unit_price)}</Text>
          <Text className="text-fuchsia-200 font-bold text-sm">{fmtEUR(line)}</Text>
        </View>
      </View>
    </View>
  );
}

function QtyBtn({ icon, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgCardHi, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={icon} size={14} color="white" />
    </Pressable>
  );
}

function StaffMenu({ user, logout, session }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
        testID="pos-menu"
      >
        <Ionicons name="menu" size={22} color="white" />
      </Pressable>
      {open && (
        <View style={{ position: "absolute", top: 60, right: 0, zIndex: 50, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.borderHi, borderRadius: 18, padding: 10, width: 240, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 }}>
          <View style={{ padding: 8, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 6 }}>
            <Text className="text-white font-bold text-sm">{user?.name}</Text>
            <Text className="text-slate-400 text-[11px]">{user?.store_name || "Magasin"} · {user?.role}</Text>
          </View>
          <MenuItem icon="swap-horizontal" label="Changer de magasin" onPress={() => { setOpen(false); router.push("/(staff)/store-pick"); }} />
          {!session ? (
            <MenuItem icon="lock-open" label="Ouvrir la caisse" onPress={() => { setOpen(false); router.push("/(staff)/cash-open"); }} />
          ) : (
            <MenuItem icon="lock-closed" label="Clôturer la caisse (Z)" onPress={() => { setOpen(false); router.push("/(staff)/cash-close"); }} />
          )}
          <MenuItem icon="log-out" label="Déconnexion" tone="danger" onPress={async () => { setOpen(false); await logout(); router.replace("/login"); }} />
          <Pressable onPress={() => setOpen(false)} style={{ padding: 8, alignItems: "center" }}>
            <Text className="text-slate-500 text-xs">Fermer</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}

function MenuItem({ icon, label, onPress, tone }) {
  return (
    <Pressable onPress={onPress} style={{ padding: 10, flexDirection: "row", alignItems: "center" }}>
      <Ionicons name={icon} size={16} color={tone === "danger" ? colors.rose : colors.slate300} />
      <Text style={{ color: tone === "danger" ? colors.rose : "white", marginLeft: 10, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

function shade(hex) {
  // Simple darken by ~25%
  try {
    const h = hex.replace("#", "");
    const n = parseInt(h, 16);
    const r = Math.max(0, ((n >> 16) & 255) - 60);
    const g = Math.max(0, ((n >> 8) & 255) - 60);
    const b = Math.max(0, (n & 255) - 60);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  } catch { return hex; }
}
