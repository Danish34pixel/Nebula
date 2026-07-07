import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE, fetchJson, postJson } from "../config/api";
import {
  dismissAdNotification,
  filterDismissedAdNotifications,
  readDismissedAdNotificationIds,
} from "../utils/adNotificationDismissals";

const SCREEN_W = Dimensions.get("window").width;
const TOAST_DELAY = 1200; // wait before sliding in
const AUTO_DISMISS = 7000; // auto-dismiss after 7s
const SKIP_DELAY = 5000; // skip button appears after 5s

function mediaFullUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE}${path}`;
}

function isImageType(type) {
  return String(type || "")
    .toLowerCase()
    .startsWith("image");
}

export default function AdToast() {
  const router = useRouter();
  const [ads, setAds] = useState([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [dismissedIds, setDismissedIds] = useState([]);

  const slideY = useRef(new Animated.Value(-120)).current;
  const skipTimerRef = useRef(null);
  const dismissTimerRef = useRef(null);
  const impressionSentRef = useRef(new Set());

  const clearTimers = useCallback(() => {
    clearTimeout(skipTimerRef.current);
    clearTimeout(dismissTimerRef.current);
  }, []);

  const slideIn = useCallback(() => {
    setVisible(true);
    Animated.timing(slideY, {
      toValue: 0,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [slideY]);

  const slideOut = useCallback(
    (onDone) => {
      Animated.timing(slideY, {
        toValue: -120,
        duration: 260,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        onDone?.();
      });
    },
    [slideY],
  );

  const startTimers = useCallback(
    (adId, totalAds) => {
      clearTimers();
      setCanSkip(false);
      skipTimerRef.current = setTimeout(() => setCanSkip(true), SKIP_DELAY);
      dismissTimerRef.current = setTimeout(() => {
        if (totalAds > 1) {
          slideOut(() => {
            setIndex((prev) => (prev + 1) % totalAds);
          });
        } else {
          slideOut(() => setDismissed(true));
        }
      }, AUTO_DISMISS);
      if (adId && !impressionSentRef.current.has(adId)) {
        impressionSentRef.current.add(adId);
        postJson(`/ads/${adId}/impression`, {}).catch(() => {});
      }
    },
    [clearTimers, slideOut],
  );

  useEffect(() => {
    let alive = true;
    const loadAds = async () => {
      try {
        const dismissed = await readDismissedAdNotificationIds();
        if (alive) setDismissedIds(dismissed);
        const res = await fetchJson("/ads/active");
        if (alive && res.success && Array.isArray(res.data)) {
          const visibleAds = filterDismissedAdNotifications(res.data, dismissed);
          setAds(visibleAds);
          setIndex(0);
        }
      } catch (_) {}
    };

    loadAds();
    return () => {
      alive = false;
    };
  }, []);

  // Slide in when a new ad becomes current
  useEffect(() => {
    if (ads.length === 0 || dismissed) return;
    const timer = setTimeout(() => {
      slideIn();
    }, TOAST_DELAY);
    return () => clearTimeout(timer);
  }, [ads, index, dismissed, slideIn]);

  // Start timers after slide-in completes
  useEffect(() => {
    if (!visible || ads.length === 0) return;
    const ad = ads[index % ads.length];
    startTimers(ad?._id, ads.length);
    return clearTimers;
  }, [visible, index, ads, startTimers, clearTimers]);

  if (ads.length === 0 || dismissed) return null;

  const ad = ads[index % ads.length];
  const thumbUri = isImageType(ad.mediaType) ? mediaFullUrl(ad.mediaUrl) : null;

  const handleTap = async () => {
    clearTimers();
    slideOut(async () => {
      try {
        await postJson(`/ads/${ad._id}/click`, {});
      } catch (_) {}
      router.push(`/Stockist/${ad.stockistId}`);
    });
  };

  const handleDismiss = async () => {
    const currentAd = ads[index % ads.length];
    clearTimers();
    if (currentAd?._id) {
      await dismissAdNotification(currentAd._id);
      const nextDismissedIds = [...dismissedIds, String(currentAd._id)];
      setDismissedIds(nextDismissedIds);
    }

    const remainingAds = filterDismissedAdNotifications(ads, [
      ...(dismissedIds || []),
      currentAd?._id ? String(currentAd._id) : null,
    ].filter(Boolean));

    if (remainingAds.length === 0) {
      slideOut(() => setDismissed(true));
      return;
    }

    if (remainingAds.length <= 1) {
      setAds(remainingAds);
      slideOut(() => setIndex(0));
      return;
    }

    setAds(remainingAds);
    slideOut(() => setIndex((prev) => prev % remainingAds.length));
  };

  return (
    <Animated.View
      style={[styles.wrapper, { transform: [{ translateY: slideY }] }]}
      pointerEvents={visible ? "box-none" : "none"}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.92}
        onPress={handleTap}
      >
        {/* Thumbnail / icon */}
        <View style={styles.thumb}>
          {thumbUri ? (
            <Image
              source={{ uri: thumbUri }}
              style={styles.thumbImg}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbFallback}>
              <Feather name="film" size={22} color="#6366f1" />
            </View>
          )}
        </View>

        {/* Text body */}
        <View style={styles.body}>
          <View style={styles.adBadge}>
            <Text style={styles.adBadgeText}>Ad</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {ad.title}
          </Text>
          {ad.stockistName ? (
            <Text style={styles.sub} numberOfLines={1}>
              by {ad.stockistName}
            </Text>
          ) : null}
        </View>

        {/* Dismiss / Skip button */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {canSkip ? (
            <Feather name="x" size={16} color="#64748b" />
          ) : (
            <View style={styles.skipDot} />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
  },
  thumbImg: { width: "100%", height: "100%" },
  thumbFallback: { flex: 1, justifyContent: "center", alignItems: "center" },
  body: { flex: 1 },
  adBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#ede9fe",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginBottom: 3,
  },
  adBadgeText: { color: "#6366f1", fontSize: 9, fontWeight: "700" },
  title: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  sub: { fontSize: 11, color: "#64748b", marginTop: 2 },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  skipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#cbd5e1",
  },
});
