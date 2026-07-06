import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "dismissedAds";
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useAdVisibility() {
  const [dismissed, setDismissed] = useState({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setDismissed(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  const isAdVisible = useCallback(
    (adId) => {
      if (!adId) return true;
      const ts = dismissed[adId];
      if (!ts) return true;
      return Date.now() - ts > COOLDOWN_MS;
    },
    [dismissed],
  );

  const dismissAd = useCallback(
    async (adId) => {
      if (!adId) return;
      const next = { ...dismissed, [adId]: Date.now() };
      setDismissed(next);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
    },
    [dismissed],
  );

  return { isAdVisible, dismissAd };
}
