import AsyncStorage from "@react-native-async-storage/async-storage";
import { postJson } from "../config/api";

const STORAGE_KEY = "dismissedAdNotificationIds";

export const readDismissedAdNotificationIds = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(String).filter(Boolean);
  } catch {
    return [];
  }
};

export const writeDismissedAdNotificationIds = async (ids = []) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {}
};

export const filterDismissedAdNotifications = (ads = [], dismissedIds = []) => {
  const dismissedSet = new Set((dismissedIds || []).map(String));
  return (Array.isArray(ads) ? ads : []).filter(
    (ad) => !dismissedSet.has(String(ad?._id)),
  );
};

export const dismissAdNotification = async (adId) => {
  if (!adId) return [];
  const id = String(adId);
  const current = await readDismissedAdNotificationIds();
  if (current.includes(id)) return current;

  const next = [...current, id];
  await writeDismissedAdNotificationIds(next);

  try {
    await postJson(`/ads/${encodeURIComponent(id)}/dismiss`, {});
  } catch {}

  return next;
};
