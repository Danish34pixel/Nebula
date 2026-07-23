import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE, fetchJson, postJson } from "../config/api";
import { useAdVisibility } from "../utils/useAdVisibility";

const AD_H = 170;
const ENGAGE_THRESHOLD_MS = 3000;

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

export default function AdsCarousel() {
  const router = useRouter();
  const [rawAds, setRawAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const flatListRef = useRef(null);
  const impressionSentRef = useRef(new Set());
  const tapTimeRef = useRef(null);
  const tappedAdIdRef = useRef(null);
  const isFirstFocusRef = useRef(true);

  const { isAdVisible, dismissAd } = useAdVisibility();

  const ads = rawAds.filter((ad) => isAdVisible(ad._id));

  useEffect(() => {
    let alive = true;
    fetchJson("/ads/active")
      .then((res) => {
        if (alive && res.success && Array.isArray(res.data)) {
          setRawAds(res.data);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Send impression for current ad
  useEffect(() => {
    if (ads.length === 0 || containerWidth === 0) return;
    const ad = ads[currentIndex % ads.length];
    if (ad?._id && !impressionSentRef.current.has(ad._id)) {
      impressionSentRef.current.add(ad._id);
      postJson(`/ads/${ad._id}/impression`, {}).catch(() => {});
    }
  }, [currentIndex, ads, containerWidth]);

  // Engagement tracking: when screen regains focus, check if user spent ≥3s on linked page
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      if (tapTimeRef.current && tappedAdIdRef.current) {
        const elapsed = Date.now() - tapTimeRef.current;
        if (elapsed >= ENGAGE_THRESHOLD_MS) {
          dismissAd(tappedAdIdRef.current);
        }
      }
      tapTimeRef.current = null;
      tappedAdIdRef.current = null;
    }, [dismissAd]),
  );

  const handlePress = useCallback(
    async (ad) => {
      tapTimeRef.current = Date.now();
      tappedAdIdRef.current = ad._id;
      try {
        await postJson(`/ads/${ad._id}/click`, {});
      } catch (_) {}
      router.push(`/Stockist/${ad.stockistId}`);
    },
    [router],
  );

  const handleMomentumScrollEnd = useCallback(
    (e) => {
      if (containerWidth === 0) return;
      const newIndex = Math.round(
        e.nativeEvent.contentOffset.x / containerWidth,
      );
      setCurrentIndex(newIndex);
    },
    [containerWidth],
  );

  const onLayout = useCallback((e) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) setContainerWidth(width);
  }, []);

  // While measuring container width, render an invisible measuring view
  if (containerWidth === 0) {
    return <View style={styles.placeholder} onLayout={onLayout} />;
  }

  if (ads.length === 0) return null;

  const renderAd = ({ item: ad }) => {
    const uri = mediaFullUrl(ad.mediaUrl);
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => handlePress(ad)}
        style={[styles.adSlide, { width: containerWidth }]}
      >
        {isVideoType(ad.mediaType) ? (
          Platform.OS === "web" ? (
            <video
              src={uri}
              autoPlay
              muted
              loop
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 16,
              }}
            />
          ) : (
            <View style={[styles.media, styles.videoFallback]}>
              <Feather name="film" size={28} color="rgba(255,255,255,0.6)" />
              <Text style={styles.videoFallbackText}>{ad.title}</Text>
            </View>
          )
        ) : (
          <Image source={{ uri }} style={styles.media} resizeMode="cover" />
        )}
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Ad</Text>
          </View>
          <Text style={styles.adTitle} numberOfLines={1}>
            {ad.title}
          </Text>
          {ad.stockistName ? (
            <Text style={styles.adSub} numberOfLines={1}>
              by {ad.stockistName}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      <FlatList
        ref={flatListRef}
        data={ads}
        keyExtractor={(item) => item._id}
        renderItem={renderAd}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEnabled={ads.length > 1}
        getItemLayout={(_, index) => ({
          length: containerWidth,
          offset: containerWidth * index,
          index,
        })}
        style={styles.flatList}
      />
      {ads.length > 1 && (
        <View style={styles.dots}>
          {ads.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex % ads.length && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { height: AD_H },
  wrapper: {
    marginVertical: 12,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0f172a",
    height: AD_H,
  },
  flatList: { height: AD_H },
  adSlide: {
    height: AD_H,
    backgroundColor: "#0f172a",
  },
  media: { width: "100%", height: "100%" },
  videoFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1e293b",
  },
  videoFallbackText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
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
  adTitle: { color: "#fff", fontSize: 13, fontWeight: "700" },
  adSub: { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 2 },
  dots: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 18,
    borderRadius: 3,
  },
});
