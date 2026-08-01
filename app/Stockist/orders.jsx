import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SecureScreen from "../../components/SecureScreen";
import { fetchJson } from "../../config/api";
import { secureStorage } from "../../utils/secureStore";

const resolveId = (item) => item?._id || item?.id || null;

const STATUS_STYLES = {
  sent: { bg: "#eff6ff", text: "#1d4ed8", label: "New" },
  accepted: { bg: "#fefce8", text: "#a16207", label: "Accepted" },
  dispatched: { bg: "#ecfdf5", text: "#047857", label: "Dispatched" },
  completed: { bg: "#f0fdf4", text: "#15803d", label: "Completed" },
  rejected: { bg: "#fef2f2", text: "#b91c1c", label: "Rejected" },
};

const statusStyle = (status) =>
  STATUS_STYLES[String(status || "").toLowerCase()] || {
    bg: "#f1f5f9",
    text: "#475569",
    label: status || "Unknown",
  };

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

export default function StockistOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadOrders = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const raw = await secureStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      const stockist = user?.user || user;
      const stockistId = resolveId(stockist);
      if (!stockistId) {
        setError("Unable to determine stockist account.");
        setOrders([]);
        return;
      }

      const res = await fetchJson(
        `/demand?stockistId=${encodeURIComponent(stockistId)}`,
      );
      const list = Array.isArray(res?.data) ? res.data : [];
      setOrders(
        list
          .map((d) => ({
            id: resolveId(d),
            ownerName: d.purchaserName || "Medical Owner",
            ownerPhone: d.ownerPhone || null,
            status: String(d.status || "").toLowerCase(),
            items: Array.isArray(d.items) ? d.items : [],
            createdAt: d.createdAt,
            sentAt: d.sentAt,
            acceptedAt: d.acceptedAt,
            dispatchedAt: d.dispatchedAt,
          }))
          .sort(
            (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
          ),
      );
    } catch (err) {
      setError(err?.message || "Failed to load orders.");
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders({ silent: true });
  };

  const respondToOrder = async (orderId, status) => {
    setBusyId(orderId);
    setError("");
    try {
      await fetchJson(`/demand/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadOrders({ silent: true });
    } catch (err) {
      setError(err?.message || `Failed to ${status === "accepted" ? "accept" : "reject"} order.`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SecureScreen>
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={["#f5f3ff", "#fdf2f8"]} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Orders</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#8b5cf6"
              />
            }
          >
            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#8b5cf6" />
              </View>
            ) : error ? (
              <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : orders.length === 0 ? (
              <View style={styles.centered}>
                <Feather name="package" size={48} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No orders yet.</Text>
                <Text style={styles.emptyText}>
                  Orders sent to you by medical owners will appear here.
                </Text>
              </View>
            ) : (
              orders.map((order) => {
                const s = statusStyle(order.status);
                const isSent = order.status === "sent";
                return (
                  <TouchableOpacity
                    key={order.id}
                    style={styles.card}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/Stockist/order-detail/${order.id}`)}
                  >
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{order.ownerName}</Text>
                        <Text style={styles.cardSubtitle}>
                          {formatTime(order.createdAt)}
                        </Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                        <Text style={[styles.statusPillText, { color: s.text }]}>
                          {s.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.itemsText} numberOfLines={2}>
                      {order.items.map((it) => it.name).join(", ") || "No items"}
                    </Text>

                    {isSent ? (
                      <View style={styles.actionsRow}>
                        <TouchableOpacity
                          style={styles.acceptBtn}
                          disabled={busyId === order.id}
                          onPress={() => respondToOrder(order.id, "accepted")}
                        >
                          {busyId === order.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.acceptBtnText}>Accept</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rejectBtn}
                          disabled={busyId === order.id}
                          onPress={() => respondToOrder(order.id, "rejected")}
                        >
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    </SecureScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#1e293b" },
  content: { padding: 20, paddingTop: 4, paddingBottom: 40 },
  centered: { alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyTitle: { color: "#0f172a", marginTop: 16, fontSize: 16, fontWeight: "700" },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    maxWidth: 300,
  },
  errorText: { color: "#dc2626", fontSize: 14, textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  cardSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillText: { fontSize: 12, fontWeight: "700" },
  itemsText: { fontSize: 14, color: "#334155", marginBottom: 4 },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  acceptBtn: {
    flex: 1,
    backgroundColor: "#8b5cf6",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  acceptBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  rejectBtnText: { color: "#475569", fontWeight: "700", fontSize: 14 },
});
