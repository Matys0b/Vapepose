import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, TextInput, KeyboardAvoidingView, Platform, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { Loader } from "../../src/components/Loader";
import { customerConversation, customerSendMessage } from "../../src/api/endpoints";
import { fmtDateTime } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";

export default function Messaging() {
  const [data, setData] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const pollRef = useRef(null);

  const load = useCallback(async (scrollEnd = true) => {
    try {
      const d = await customerConversation();
      setData(d);
      if (scrollEnd) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(true);
      pollRef.current = setInterval(() => load(false), 30000);
      return () => clearInterval(pollRef.current);
    }, [load])
  );

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setText("");
    try {
      await customerSendMessage(body);
      await load(true);
    } catch (e) {
      Alert.alert("Erreur", e?.message || "Message non envoyé.");
    } finally {
      setSending(false);
    }
  };

  if (!data) return <Screen><Loader /></Screen>;

  return (
    <Screen>
      <View className="flex-row items-center mb-3">
        <Pressable hitSlop={10} onPress={() => router.back()} className="mr-2">
          <Ionicons name="chevron-back" size={24} color={colors.slate300} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text className="text-white font-bold">Messagerie boutique</Text>
          <Text className="text-slate-500 text-[11px]">On te répond en vrai, pendant les horaires du magasin.</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 10 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {data.messages.length === 0 && (
            <Text className="text-center text-slate-500 text-xs mt-10">
              Lance la discussion : commande un produit, demande un conseil, partage une idée.
            </Text>
          )}
          {data.messages.map((m) => (
            <Message key={m.id} m={m} />
          ))}
        </ScrollView>

        <View className="flex-row items-end py-2" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Écris un message…"
            placeholderTextColor={colors.slate500}
            multiline
            style={{
              flex: 1,
              backgroundColor: colors.bgCard,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 10,
              color: "white",
              fontSize: 15,
              maxHeight: 120,
            }}
            testID="msg-input"
          />
          <Pressable
            onPress={send}
            disabled={!text.trim() || sending}
            style={{
              marginLeft: 8,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.fuchsia,
              alignItems: "center",
              justifyContent: "center",
              opacity: !text.trim() ? 0.4 : 1,
            }}
            testID="msg-send"
          >
            <Ionicons name="send" size={18} color="white" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Message({ m }) {
  const mine = m.from_type === "customer";
  return (
    <View style={{ alignItems: mine ? "flex-end" : "flex-start", marginBottom: 8 }}>
      <View
        style={{
          maxWidth: "82%",
          backgroundColor: mine ? colors.fuchsia : colors.bgCard,
          borderWidth: mine ? 0 : 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 20,
          borderBottomRightRadius: mine ? 4 : 20,
          borderBottomLeftRadius: mine ? 20 : 4,
        }}
      >
        {!mine && m.from_name && (
          <Text className="text-fuchsia-300 text-[11px] font-bold mb-0.5">{m.from_name}</Text>
        )}
        <Text style={{ color: "white", fontSize: 15 }}>{m.body}</Text>
      </View>
      <Text className="text-slate-600 text-[10px] mt-0.5 px-1">{fmtDateTime(m.at)}</Text>
    </View>
  );
}
