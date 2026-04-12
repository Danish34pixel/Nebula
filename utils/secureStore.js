import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const SECURE_KEYS = new Set(["token", "refreshToken"]);

const canUseNativeSecureStore = Platform.OS !== "web";

async function getRawItem(key) {
  if (canUseNativeSecureStore && SECURE_KEYS.has(key)) {
    const secureValue = await SecureStore.getItemAsync(key);
    if (secureValue != null) {
      return secureValue;
    }
    // Backward compatibility migration from AsyncStorage -> SecureStore.
    const legacyValue = await AsyncStorage.getItem(key);
    if (legacyValue != null) {
      await SecureStore.setItemAsync(key, legacyValue);
      await AsyncStorage.removeItem(key);
      return legacyValue;
    }
    return null;
  }

  return AsyncStorage.getItem(key);
}

async function setRawItem(key, value) {
  if (canUseNativeSecureStore && SECURE_KEYS.has(key)) {
    await SecureStore.setItemAsync(key, String(value));
    // Ensure token is not kept in plain AsyncStorage on native devices.
    await AsyncStorage.removeItem(key);
    return;
  }
  await AsyncStorage.setItem(key, String(value));
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
