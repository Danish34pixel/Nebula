import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { fetchJson, postJson } from "../config/api";
import {
  dismissAdNotification,
  filterDismissedAdNotifications,
  readDismissedAdNotificationIds,
} from "../utils/adNotificationDismissals";

const SCREEN_W = Dimensions.get("window").width;
const PANEL_W = Math.min(SCREEN_W * 0.88, 380);

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatAnnouncementTime(dateStr) {
  if (!dateStr) return "No date";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AnnouncementPanel({
  isVisible,
  onClose,
  onAnnouncementsLoaded,
}) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dismissedIds, setDismissedIds] = useState([]);

  const slideX = useRef(new Animated.Value(SCREEN_W)).current;
  const markedRef = useRef(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const storedDismissedIds = await readDismissedAdNotificationIds();
      setDismissedIds(storedDismissedIds);
      const res = await fetchJson("/announcements");
      const payload = res?.data ?? res?.announcements ?? res;
      const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.announcements)
            ? payload.announcements
            : [];
      const filteredItems = filterDismissedAdNotifications(items, storedDismissedIds);
      setAnnouncements(filteredItems);
      onAnnouncementsLoaded?.(filteredItems);
    } catch (_) {
      setAnnouncements([]);
      onAnnouncementsLoaded?.([]);
    } finally {
      setLoading(false);
    }
  }, [onAnnouncementsLoaded]);

  // Slide in/out based on isVisible
  useEffect(() => {
    if (isVisible) {
      load();
      Animated.timing(slideX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideX, {
        toValue: PANEL_W,
        duration: 260,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideX, load]);

  // Mark visible announcements as read after panel opens
  useEffect(() => {
    if (!isVisible || announcements.length === 0) return;
    announcements.forEach((a) => {
      if (!markedRef.current.has(a._id)) {
        markedRef.current.add(a._id);
        postJson(`/announcements/${a._id}/read`, {}).catch(() => {});
      }
    });
  }, [isVisible, announcements]);

  if (!isVisible) {
    return null;
  }

  const handleDismissItem = async (item) => {
    if (!item?._id) return;
    const id = String(item._id);
    const nextDismissedIds = [...new Set([...(dismissedIds || []), id])];
    setDismissedIds(nextDismissedIds);
    setAnnouncements((prev) => prev.filter((entry) => String(entry._id) !== id));
    await dismissAdNotification(id);
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.itemIcon}>
        <Feather name="megaphone" size={16} color="#6366f1" />
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemMessage} numberOfLines={3}>
          {item.message || item.description || "No announcement details available."}
        </Text>
        <Text style={styles.itemTime}>
          {formatAnnouncementTime(item.createdAt)} · {timeAgo(item.createdAt)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleDismissItem(item)}
        style={styles.dismissBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="x" size={14} color="#64748b" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* Backdrop */}
      {isVisible && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
      )}

      {/* Panel */}
      <Animated.View
        style={[styles.panel, { transform: [{ translateX: slideX }] }]}
        pointerEvents={isVisible ? "box-none" : "none"}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={20} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Announcements</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={announcements}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Feather name="bell-off" size={32} color="#cbd5e1" />
                <Text style={styles.emptyText}>No announcements yet.</Text>
              </View>
            }
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  wrapper: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    zIndex: 999,
  },
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_W,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: -4, height: 0 },
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  list: { padding: 16, paddingBottom: 40 },
  item: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 4,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ede9fe",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  itemBody: { flex: 1 },
  itemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  itemMessage: { fontSize: 13, color: "#475569", lineHeight: 19 },
  itemTime: { fontSize: 11, color: "#94a3b8", marginTop: 6 },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  separator: { height: 16 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: "#94a3b8", fontSize: 14 },
});
