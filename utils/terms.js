import AsyncStorage from "@react-native-async-storage/async-storage";

export const TERMS_VIEWED_KEY = "@Meditrap/termsViewed";
export const TERMS_VERSION_KEY = "@Meditrap/termsVersion";
export const TERMS_VIEWED_AT_KEY = "@Meditrap/termsViewedAt";
export const TERMS_VERSION = "1.0";

export async function markTermsViewed() {
  try {
    await AsyncStorage.setItem(TERMS_VIEWED_KEY, "true");
    await AsyncStorage.setItem(TERMS_VERSION_KEY, TERMS_VERSION);
    await AsyncStorage.setItem(TERMS_VIEWED_AT_KEY, new Date().toISOString());
  } catch (error) {
    console.warn("Unable to save terms viewed state", error);
  }
}

export async function hasViewedTerms() {
  try {
    const value = await AsyncStorage.getItem(TERMS_VIEWED_KEY);
    return value === "true";
  } catch (error) {
    console.warn("Unable to read terms viewed state", error);
    return false;
  }
}
