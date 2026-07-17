import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { fetchJson } from "../config/api";

const SCREEN_W = Dimensions.get("window").width;
const PANEL_W = Math.min(SCREEN_W * 0.86, 360);
const STORAGE_KEY_PREFIX = "demandNotificationReadIds";

const resolveId = (item) => item?._id || item?.id || null;
const getName = (item) =>
  item?.name ||
  item?.medicalName ||
  item?.fullName ||
  item?.ownerName ||
  item?.contactPerson ||
  "Unknown";
const formatTime = (date) => {
  if (!date) return "Unknown";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const extractUser = (raw) => {
  if (!raw) return null;
  const user = raw.user || raw;
  return user;
};

function buildNotifications(demands, userRole) {
  if (!Array.isArray(demands)) return [];

  return demands
    .map((d) => {
      const id = resolveId(d) || d.demandId || d.id;
      const status = String(d.status || d.state || "")
        .trim()
        .toLowerCase();
      const sentAt = d.createdAt || d.sentAt || d.updatedAt;
      const ownerName =
        d.purchaserName ||
        d.medicalOwnerName ||
        getName(d.purchaser || d.medicalOwner);
      const stockistName = d.stockistName || getName(d.stockist);
      const unreadLabel =
        userRole === "stockist" ? "New demand" : "Demand received";
      const message =
        userRole === "stockist"
          ? `${ownerName} sent ${Array.isArray(d.items) ? d.items.length : Array.isArray(d.medicines) ? d.medicines.length : 0} item(s)`
          : `Marked received by ${stockistName || "stockist"}`;
      return {
        id,
        title: userRole === "stockist" ? ownerName : stockistName || "Stockist",
        subtitle: message,
        time: formatTime(sentAt),
        createdAt: sentAt,
        demandId: id,
        status,
      };
    })
    .filter((notification) => {
      if (!notification.id) return false;
      if (userRole === "stockist") {
        return (
          notification.status === "sent" ||
          notification.status === "pending" ||
          notification.status === "new" ||
          notification.status === "created"
        );
      }
      return notification.status === "received";
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export default function DemandNotificationsButton({ userRole }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState([]);
  const [error, setError] = useState("");
  const slideX = useRef(new Animated.Value(PANEL_W)).current;

  const storageKey = `${STORAGE_KEY_PREFIX}_${userRole}`;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const rawUser = await AsyncStorage.getItem("user");
      const storedUser = rawUser ? JSON.parse(rawUser) : null;
      const user = extractUser(storedUser);
      const userId = resolveId(user);
      if (!userId) {
        setError("Unable to read your account.");
        setNotifications([]);
        return;
      }

      const endpoint =
        userRole === "stockist"
          ? `/api/demand?stockistId=${encodeURIComponent(userId)}`
          : `/api/demand?ownerId=${encodeURIComponent(userId)}`;

      const response = await fetchJson(endpoint);
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.demands)
            ? response.demands
            : Array.isArray(response?.items)
              ? response.items
              : [];

      const derived = buildNotifications(list, userRole);
      setNotifications(derived);

      const storedRead = await AsyncStorage.getItem(storageKey);
      const parsedRead = storedRead ? JSON.parse(storedRead) : [];
      setReadIds(Array.isArray(parsedRead) ? parsedRead : []);
    } catch (err) {
      setError(err?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [storageKey, userRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!visible) {
      Animated.timing(slideX, {
        toValue: PANEL_W,
        duration: 260,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(slideX, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, slideX]);

  const unreadCount = useMemo(
    () =>
      notifications.filter((notification) => !readIds.includes(notification.id))
        .length,
    [notifications, readIds],
  );

  const markReadAndNavigate = async (notification) => {
    const nextRead = Array.from(new Set([...readIds, notification.id]));
    setReadIds(nextRead);
    await AsyncStorage.setItem(storageKey, JSON.stringify(nextRead));
    setVisible(false);
    if (userRole === "stockist") {
      router.push(
        `/Stockist/demand-inbox?demandId=${encodeURIComponent(notification.demandId)}`,
      );
    } else {
      router.push(
        `/MedicalOwner/demand-history?demandId=${encodeURIComponent(notification.demandId)}`,
      );
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => markReadAndNavigate(item)}
      style={styles.notificationRow}
    >
      <View style={styles.notificationIcon}>
        <Feather
          name={userRole === "stockist" ? "message-circle" : "check-circle"}
          size={18}
          color="#fff"
        />
      </View>
      <View style={styles.notificationBody}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationSubtitle} numberOfLines={2}>
          {item.subtitle}
        </Text>
        <Text style={styles.notificationTime}>{item.time}</Text>
      </View>
      {!readIds.includes(item.id) ? <View style={styles.unreadDot} /> : null}
    </TouchableOpacity>
  );

  if (!userRole) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.bellBtn}
        onPress={() => setVisible(true)}
        activeOpacity={0.85}
      >
        <Feather name="bell" size={20} color="#0f172a" />
        {unreadCount > 0 ? <View style={styles.badge} /> : null}
      </TouchableOpacity>
      {visible ? (
        <>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setVisible(false)}
          />
          <Animated.View
            style={[styles.panel, { transform: [{ translateX: slideX }] }]}
          >
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Demand Notifications</Text>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <View style={styles.panelSubtitleRow}>
              <Text style={styles.panelSubtitle}>
                {userRole === "stockist"
                  ? "New demands sent to you"
                  : "Received updates from stockists"}
              </Text>
            </View>
            {loading ? (
              <View style={styles.centeredPanel}>
                <ActivityIndicator color="#0f172a" />
              </View>
            ) : error ? (
              <View style={styles.centeredPanel}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.centeredPanel}>
                <Feather name="bell-off" size={40} color="#cbd5e1" />
                <Text style={styles.emptyText}>
                  No new demand notifications.
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </Animated.View>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
    borderWidth: 1,
    borderColor: "#fff",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    zIndex: 999,
  },
  panel: {
    position: "absolute",
    top: 64,
    right: 0,
    width: PANEL_W,
    height: "80%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: -6, height: 0 },
    elevation: 16,
    zIndex: 1000,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  panelSubtitleRow: {
    marginBottom: 14,
  },
  panelSubtitle: {
    color: "#64748b",
    fontSize: 13,
  },
  list: {
    paddingBottom: 22,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#4338ca",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationBody: {
    flex: 1,
  },
  notificationTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  notificationSubtitle: {
    color: "#475569",
    fontSize: 13,
    marginTop: 4,
  },
  notificationTime: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 6,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
    marginTop: 6,
  },
  separator: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 6,
  },
  centeredPanel: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  emptyText: {
    color: "#64748b",
    marginTop: 12,
    textAlign: "center",
  },
  errorText: {
    color: "#ef4444",
    textAlign: "center",
  },
});
