import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const sensitiveKeys = new Set(["auth_token", "auth_user", "biometric_enabled"]);

export const storage = {
  async get(key) {
    if (sensitiveKeys.has(key)) {
      return SecureStore.getItemAsync(key);
    }
    return AsyncStorage.getItem(key);
  },
  async set(key, value) {
    if (value == null) return this.remove(key);
    const str = typeof value === "string" ? value : JSON.stringify(value);
    if (sensitiveKeys.has(key)) {
      return SecureStore.setItemAsync(key, str);
    }
    return AsyncStorage.setItem(key, str);
  },
  async getJSON(key) {
    const raw = await this.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  async remove(key) {
    if (sensitiveKeys.has(key)) {
      return SecureStore.deleteItemAsync(key);
    }
    return AsyncStorage.removeItem(key);
  },
  async clear() {
    for (const k of sensitiveKeys) {
      try { await SecureStore.deleteItemAsync(k); } catch {}
    }
    await AsyncStorage.clear();
  },
};
