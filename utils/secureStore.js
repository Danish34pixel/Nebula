import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const SECURE_KEYS = new Set(["token", "refreshToken"]);

const canUseNativeSecureStore = Platform.OS !== "web";

const normalizeSecureValue = (key, value) => {
  if (value == null) return value;
  let normalized = String(value).trim();
  if (SECURE_KEYS.has(key) && /^Bearer\s+/i.test(normalized)) {
    normalized = normalized.replace(/^Bearer\s+/i, "").trim();
  }
  return normalized;
};

async function getRawItem(key) {
  if (canUseNativeSecureStore && SECURE_KEYS.has(key)) {
    const secureValue = await SecureStore.getItemAsync(key);
    if (secureValue != null) {
      return normalizeSecureValue(key, secureValue);
    }
    // Backward compatibility migration from AsyncStorage -> SecureStore.
    const legacyValue = await AsyncStorage.getItem(key);
    if (legacyValue != null) {
      await SecureStore.setItemAsync(
        key,
        normalizeSecureValue(key, legacyValue),
      );
      await AsyncStorage.removeItem(key);
      return normalizeSecureValue(key, legacyValue);
    }
    return null;
  }

  const value = await AsyncStorage.getItem(key);
  return normalizeSecureValue(key, value);
}

async function setRawItem(key, value) {
  const normalizedValue = normalizeSecureValue(key, value);
  if (canUseNativeSecureStore && SECURE_KEYS.has(key)) {
    await SecureStore.setItemAsync(key, String(normalizedValue));
    // Ensure token is not kept in plain AsyncStorage on native devices.
    await AsyncStorage.removeItem(key);
    return;
  }
  await AsyncStorage.setItem(key, String(normalizedValue));
}

async function removeRawItem(key) {
  if (canUseNativeSecureStore && SECURE_KEYS.has(key)) {
    await SecureStore.deleteItemAsync(key);
    await AsyncStorage.removeItem(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}

async function multiRemove(keys = []) {
  await Promise.all(keys.map((key) => removeRawItem(key)));
}

export const secureStorage = {
  getItem: getRawItem,
  setItem: setRawItem,
  removeItem: removeRawItem,
  multiRemove,
};

export default secureStorage;
