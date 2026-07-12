import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { API_BASE, fetchJson, postJson } from "../config/api";

const SHOW_DELAY = 1000;
const CLOSE_DELAY = 5000;

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

export default function AdToast() {
  const router = useRouter();
  const [ads, setAds] = useState([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  const closeTimerRef = useRef(null);
  const showTimerRef = useRef(null);
  const impressionSentRef = useRef(new Set());

  const clearTimers = useCallback(() => {
    clearTimeout(closeTimerRef.current);
    clearTimeout(showTimerRef.current);
  }, []);

  const currentAd = useMemo(() => ads[index % ads.length], [ads, index]);
  const mediaUri = useMemo(
    () => mediaFullUrl(currentAd?.mediaUrl),
    [currentAd?.mediaUrl],
  );

  const openFullscreenAd = useCallback(() => {
    setVisible(true);
    setCanClose(false);
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setCanClose(true), CLOSE_DELAY);
  }, []);

  const closeFullscreenAd = useCallback(
    async () => {
      clearTimers();
      setVisible(false);
      setCanClose(false);
      setIsClosed(true);
    },
    [clearTimers],
  );

  useEffect(() => {
    let alive = true;
    const loadAds = async () => {
      try {
        setLoading(true);
        const res = await fetchJson("/ads/active");
        if (alive && res.success && Array.isArray(res.data)) {
          setAds(res.data);
          setIndex(0);
          setMediaError(false);
        }
      } catch (_) {
        if (alive) setAds([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadAds();
    return () => {
      alive = false;
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    if (loading || ads.length === 0 || isClosed) return;
    showTimerRef.current = setTimeout(() => {
      openFullscreenAd();
    }, SHOW_DELAY);
    return () => clearTimeout(showTimerRef.current);
  }, [ads, isClosed, loading, openFullscreenAd]);

  useEffect(() => {
    if (!visible || !currentAd?._id) return;
    if (impressionSentRef.current.has(currentAd._id)) return;
    impressionSentRef.current.add(currentAd._id);
    postJson(`/ads/${currentAd._id}/impression`, {}).catch(() => {});
  }, [currentAd?._id, visible]);

  if (loading || ads.length === 0 || isClosed || !currentAd) return null;

  const handleTap = async () => {
    try {
      await postJson(`/ads/${currentAd._id}/click`, {});
    } catch (_) {}
    await closeFullscreenAd();
    router.push(`/Stockist/${currentAd.stockistId}`);
  };

  const handleClose = async () => {
    if (!canClose) return;
    await closeFullscreenAd();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.touchArea}
          onPress={handleTap}
        >
          <View style={styles.card}>
            {isVideoType(currentAd.mediaType) ? (
              Platform.OS === "web" ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  src={mediaUri}
                  autoPlay
                  muted
                  loop
                  playsInline
                  style={styles.media}
                />
              ) : (
                <View style={[styles.media, styles.videoFallback]}>
                  <Feather name="film" size={44} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.videoTitle} numberOfLines={2}>
                    {currentAd.title}
                  </Text>
                </View>
              )
            ) : mediaError || !mediaUri ? (
              <View style={[styles.media, styles.imageFallback]}>
                <Feather name="image" size={44} color="rgba(255,255,255,0.7)" />
                <Text style={styles.videoTitle} numberOfLines={2}>
                  {currentAd.title}
                </Text>
              </View>
            ) : (
              <Image
                source={{ uri: mediaUri }}
                style={styles.media}
                resizeMode="cover"
                onError={() => setMediaError(true)}
              />
            )}

            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.82)"]}
              style={styles.overlay}
            >
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Sponsored</Text>
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {currentAd.title}
              </Text>
              {currentAd.stockistName ? (
                <Text style={styles.sub} numberOfLines={1}>
                  by {currentAd.stockistName}
                </Text>
              ) : null}
              <Text style={styles.hint}>
                Tap to open. Close becomes available after 5 seconds.
              </Text>
            </LinearGradient>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.closeBtn, !canClose && styles.closeBtnDisabled]}
          onPress={handleClose}
          activeOpacity={0.8}
          disabled={!canClose}
        >
          {canClose ? (
            <Feather name="x" size={20} color="#0f172a" />
          ) : (
            <ActivityIndicator size="small" color="#0f172a" />
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.96)",
    justifyContent: "center",
    alignItems: "center",
  },
  touchArea: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: "#0f172a",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 18,
  },
  media: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 48,
    paddingBottom: 24,
    minHeight: 180,
    justifyContent: "flex-end",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  sub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginTop: 6,
  },
  hint: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    marginTop: 14,
  },
  closeBtn: {
    position: "absolute",
    top: 22,
    right: 22,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 10,
  },
  closeBtnDisabled: {
    opacity: 0.85,
  },
  videoFallback: {
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 24,
  },
  imageFallback: {
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 24,
  },
  videoTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
});
