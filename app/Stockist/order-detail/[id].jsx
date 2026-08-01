import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SecureScreen from "../../../components/SecureScreen";
import { fetchJson } from "../../../config/api";
import { secureStorage } from "../../../utils/secureStore";

const resolveId = (item) => item?._id || item?.id || null;

const formatDateTime = (date) => {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const TIMELINE_STEPS = [
  { key: "createdAt", label: "Order created" },
  { key: "sentAt", label: "Sent to you" },
  { key: "acceptedAt", label: "Accepted" },
  { key: "dispatchedAt", label: "Dispatched" },
  { key: "completedAt", label: "Completed" },
];

export default function OrderDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dispatching, setDispatching] = useState(false);

  const loadOrder = useCallback(async () => {
    setError("");
    try {
      const raw = await secureStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      const stockist = user?.user || user;
      const stockistId = resolveId(stockist);
      if (!stockistId) {
        setError("Unable to determine stockist account.");
        return;
      }

      const res = await fetchJson(
        `/demand?stockistId=${encodeURIComponent(stockistId)}`,
      );
      const list = Array.isArray(res?.data) ? res.data : [];
      const match = list.find((o) => String(resolveId(o)) === String(id));
      if (!match) {
        setError("Order not found.");
        setOrder(null);
        return;
      }
      setOrder({
        id: resolveId(match),
        ownerName: match.purchaserName || "Medical Owner",
        ownerPhone: match.ownerPhone || null,
        status: String(match.status || "").toLowerCase(),
        items: Array.isArray(match.items) ? match.items : [],
        createdAt: match.createdAt,
        sentAt: match.sentAt,
        acceptedAt: match.acceptedAt,
        dispatchedAt: match.dispatchedAt,
        completedAt: match.completedAt,
      });
    } catch (err) {
      setError(err?.message || "Failed to load order.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadOrder();
    }, [loadOrder]),
  );

  const handleDispatch = async () => {
    setDispatching(true);
    setError("");
    try {
      await fetchJson(`/demand/${id}/dispatch`, { method: "POST" });
      await loadOrder();
    } catch (err) {
      setError(err?.message || "Failed to dispatch order.");
    } finally {
      setDispatching(false);
    }
  };

  const handleCall = () => {
    if (!order?.ownerPhone) return;
    Linking.openURL(`tel:${String(order.ownerPhone).trim()}`);
  };

  const isChatEligible =
    order && ["accepted", "dispatched", "completed"].includes(order.status);

  return (
    <SecureScreen>
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={["#f5f3ff", "#fdf2f8"]} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Details</Text>
            <View style={{ width: 40 }} />
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
          ) : error || !order ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error || "Order not found."}</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.card}>
                <Text style={styles.ownerName}>{order.ownerName}</Text>
                <Text style={styles.sectionLabel}>ITEMS</Text>
                {order.items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.qty ? <Text style={styles.itemQty}>x{item.qty}</Text> : null}
                  </View>
                ))}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionLabel}>STATUS TIMELINE</Text>
                {TIMELINE_STEPS.map((step) => {
                  const value = formatDateTime(order[step.key]);
                  const done = Boolean(value);
                  return (
                    <View key={step.key} style={styles.timelineRow}>
                      <View
                        style={[
                          styles.timelineDot,
                          done && styles.timelineDotDone,
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.timelineLabel,
                            done && styles.timelineLabelDone,
                          ]}
                        >
                          {step.label}
                        </Text>
                        {value ? (
                          <Text style={styles.timelineTime}>{value}</Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
                {order.status === "rejected" ? (
                  <View style={styles.timelineRow}>
                    <View style={[styles.timelineDot, styles.timelineDotRejected]} />
                    <Text style={[styles.timelineLabel, { color: "#b91c1c" }]}>
                      Rejected
                    </Text>
                  </View>
                ) : null}
              </View>

              {order.status === "accepted" ? (
                <TouchableOpacity
                  style={styles.dispatchBtn}
                  onPress={handleDispatch}
                  disabled={dispatching}
                >
                  {dispatching ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Feather name="truck" size={18} color="#fff" />
                      <Text style={styles.dispatchBtnText}>Mark as Dispatched</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}

              {isChatEligible ? (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push(`/demand-chat/${order.id}`)}
                  >
                    <Feather name="message-circle" size={18} color="#8b5cf6" />
                    <Text style={styles.actionBtnText}>Chat</Text>
                  </TouchableOpacity>
                  {order.ownerPhone ? (
                    <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
                      <Feather name="phone" size={18} color="#8b5cf6" />
                      <Text style={styles.actionBtnText}>Call</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
            </ScrollView>
          )}
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: "#dc2626", fontSize: 14, textAlign: "center", paddingHorizontal: 24 },
  content: { padding: 20, paddingTop: 4, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  ownerName: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 12 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  itemName: { fontSize: 14, color: "#1e293b" },
  itemQty: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  timelineRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#e2e8f0",
    marginTop: 3,
  },
  timelineDotDone: { backgroundColor: "#8b5cf6" },
  timelineDotRejected: { backgroundColor: "#ef4444" },
  timelineLabel: { fontSize: 14, color: "#94a3b8", fontWeight: "600" },
  timelineLabelDone: { color: "#1e293b" },
  timelineTime: { fontSize: 12, color: "#64748b", marginTop: 2 },
  dispatchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#10b981",
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  dispatchBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  actionsRow: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "#8b5cf6",
  },
  actionBtnText: { color: "#8b5cf6", fontSize: 14, fontWeight: "700" },
});
