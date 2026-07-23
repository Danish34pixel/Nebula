import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE, fetchJson, postJson } from "../config/api";

const SCREEN_W = Dimensions.get("window").width;
const BANNER_H = 200;
const SKIP_DELAY = 5000;
const AUTO_ADVANCE = 9000;

function mediaFullUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE}${path}`;
}

function isVideoType(type) {
  return String(type || "")
    .toLowerCase()
    .startsWith("video");
}

export default function AdBanner() {
  const router = useRouter();
  const [ads, setAds] = useState([]);
  const [index, setIndex] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  const skipTimerRef = useRef(null);
  const advanceTimerRef = useRef(null);
  const impressionSentRef = useRef(new Set());

  const clearTimers = useCallback(() => {
    clearTimeout(skipTimerRef.current);
    clearTimeout(advanceTimerRef.current);
  }, []);

  const startTimers = useCallback(
    (adId, totalAds) => {
      clearTimers();
      setCanSkip(false);
      skipTimerRef.current = setTimeout(() => setCanSkip(true), SKIP_DELAY);
      if (totalAds > 1) {
        advanceTimerRef.current = setTimeout(() => {
          setIndex((prev) => (prev + 1) % totalAds);
        }, AUTO_ADVANCE);
      }
      if (adId && !impressionSentRef.current.has(adId)) {
        impressionSentRef.current.add(adId);
        postJson(`/ads/${adId}/impression`, {}).catch(() => {});
      }
    },
    [clearTimers],
  );

  useEffect(() => {
    let alive = true;
    fetchJson("/ads/active")
      .then((res) => {
        if (alive && res.success && Array.isArray(res.data)) {
          setAds(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (ads.length === 0) return;
    const ad = ads[index % ads.length];
    startTimers(ad?._id, ads.length);
    return clearTimers;
  }, [index, ads, startTimers, clearTimers]);

  const handleTap = async () => {
    try {
      await postJson(`/ads/${ad._id}/click`, {});
    } catch (_) {}
    router.push(`/Stockist/${ad.stockistId}`);
  };

  const handleSkip = () => {
    clearTimers();
    if (ads.length <= 1) {
      // Only one ad — dismiss the banner entirely
      setDismissed(true);
      return;
    }
    setIndex((prev) => (prev + 1) % ads.length);
  };

  if (loading || ads.length === 0 || dismissed) return null;

  const ad = ads[index % ads.length];
  const uri = mediaFullUrl(ad.mediaUrl);
  console.log(
    "[AdBanner] rendering ad:",
    ad._id,
    "mediaType:",
    ad.mediaType,
    "uri:",
    uri,
  );

  return (
    <View style={styles.wrapper}>
      {/* Main tap target — navigates to stockist */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleTap}
        style={styles.container}
      >
        {isVideoType(ad.mediaType) ? (
          Platform.OS === "web" ? (
            <video
              src={uri}
              autoPlay
              muted
              loop
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <View style={[styles.media, styles.videoFallback]}>
              <Feather name="film" size={40} color="rgba(255,255,255,0.6)" />
              <Text style={styles.videoFallbackText}>{ad.title}</Text>
              <Text style={styles.videoInstallHint}>
                Install expo-video for playback
              </Text>
            </View>
          )
        ) : (
          <Image
            source={{ uri }}
            style={styles.media}
            resizeMode="cover"
            onError={(e) =>
              console.warn(
                "[AdBanner] image load error:",
                e.nativeEvent?.error,
                "uri:",
                uri,
              )
            }
          />
        )}
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Ad</Text>
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
      </TouchableOpacity>

      {/* Skip button — rendered OUTSIDE the tap TouchableOpacity so it gets its own touch zone */}
      {canSkip && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={handleSkip}
          activeOpacity={0.75}
        >
          <Text style={styles.skipText}>Skip</Text>
          <Feather name="chevron-right" size={12} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: SCREEN_W,
    height: BANNER_H,
    backgroundColor: "#0f172a",
  },
  container: { flex: 1 },
  media: { width: "100%", height: "100%" },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#6366f1",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  title: { color: "#fff", fontSize: 14, fontWeight: "700" },
  sub: { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 2 },
  skipBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 2,
    zIndex: 10,
  },
  skipText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  videoFallback: {
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  videoFallbackText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  videoInstallHint: { color: "rgba(255,255,255,0.4)", fontSize: 10 },
});
