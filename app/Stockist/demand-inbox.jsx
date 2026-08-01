import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import SecureScreen from "../../components/SecureScreen";
import { fetchJson } from "../../config/api";

const resolveId = (item) => item?._id || item?.id || null;
const normalizeStatus = (value) => {
  const status = String(value || "")
    .trim()
    .toLowerCase();
  if (!status) return "Sent";
  return status.charAt(0).toUpperCase() + status.slice(1);
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

const getOwnerName = (demand) =>
  demand.purchaserName ||
  demand.medicalOwnerName ||
  demand.ownerName ||
  demand.createdBy ||
  "Medical Owner";

export default function StockistDemandInbox() {
  const router = useRouter();
  const { demandId } = useLocalSearchParams();
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedDemandId, setSelectedDemandId] = useState(demandId || null);

  useEffect(() => {
    setSelectedDemandId(demandId || null);
  }, [demandId]);

  const loadDemands = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const raw = await AsyncStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      const stockist = user?.user || user;
      const stockistId = resolveId(stockist);
      if (!stockistId) {
        setError("Unable to determine stockist account.");
        setDemands([]);
        return;
      }

      const data = await fetchJson(
        `/api/demand?stockistId=${encodeURIComponent(stockistId)}`,
      );
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.demands)
            ? data.demands
            : Array.isArray(data?.items)
              ? data.items
              : [];

      setDemands(
        list.map((d) => ({
          id: resolveId(d) || d.demandId || d.id,
          ownerName: getOwnerName(d),
          ownerPhone: d.ownerPhone || null,
          status: normalizeStatus(d.status || d.state || d.statusText),
          createdAt: d.createdAt || d.sentAt || d.updatedAt,
          medicines:
            Array.isArray(d.items) && d.items.length > 0
              ? d.items
              : Array.isArray(d.medicines)
                ? d.medicines
                : [],
        })),
      );
    } catch (err) {
      setError(err?.message || "Failed to load demands.");
      setDemands([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDemands();
  }, [loadDemands]);

  const updateDemandStatus = async (demandIdToUpdate, nextStatusLabel, action) => {
    setActionMessage("");
    setError("");
    const original = demands.find(
      (d) => String(d.id) === String(demandIdToUpdate),
    );
    if (!original) return;

    setDemands((prev) =>
      prev.map((item) =>
        String(item.id) === String(demandIdToUpdate)
          ? { ...item, status: nextStatusLabel, optimistic: true }
          : item,
      ),
    );

    try {
      await action();
      setActionMessage(`Demand ${nextStatusLabel.toLowerCase()}.`);
      await loadDemands();
    } catch (err) {
      setError(err?.message || `Failed to mark demand ${nextStatusLabel.toLowerCase()}.`);
      setDemands((prev) =>
        prev.map((item) =>
          String(item.id) === String(demandIdToUpdate)
            ? { ...item, status: original.status, optimistic: false }
            : item,
        ),
      );
    }
  };

  const acceptDemand = (demandId) =>
    updateDemandStatus(demandId, "Accepted", () =>
      fetchJson(`/api/demand/${demandId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "accepted" }),
      }),
    );

  const rejectDemand = (demandId) =>
    updateDemandStatus(demandId, "Rejected", () =>
      fetchJson(`/api/demand/${demandId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected" }),
      }),
    );

  const dispatchDemand = (demandId) =>
    updateDemandStatus(demandId, "Dispatched", () =>
      fetchJson(`/api/demand/${demandId}/dispatch`, { method: "POST" }),
    );

  const handleCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${String(phone).trim()}`);
  };

  return (
    <SecureScreen>
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={["#f8fafc", "#f1f5f9"]} style={styles.header}>
          <Text style={styles.headerTitle}>Demand Inbox</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.content}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#0ea5e9" />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : demands.length === 0 ? (
            <View style={styles.centered}>
              <Feather name="inbox" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No demands yet.</Text>
              <Text style={styles.emptyText}>
                New demands sent to your stockist will appear here.
              </Text>
            </View>
          ) : (
            demands.map((demand) => {
              const isSelected = String(demand.id) === String(selectedDemandId);
              const statusLower = demand.status.toLowerCase();
              const isSent = statusLower === "sent";
              const isAccepted = statusLower === "accepted";
              const isChatEligible = ["accepted", "dispatched", "completed"].includes(statusLower);
              return (
                <View
                  key={demand.id}
                  style={[styles.card, isSelected && styles.highlightedCard]}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{demand.ownerName}</Text>
                      <Text style={styles.cardSubtitle}>
                        {formatTime(demand.createdAt)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        isChatEligible
                          ? styles.statusBadgeReceived
                          : styles.statusBadgeSent,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isChatEligible
                            ? styles.statusBadgeTextReceived
                            : styles.statusBadgeTextSent,
                        ]}
                      >
                        {demand.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.messageRow}>
                    <Text style={styles.messageText} numberOfLines={2}>
                      Demand from {demand.ownerName} for{" "}
                      {demand.medicines.length} item
                      {demand.medicines.length !== 1 ? "s" : ""}.
                    </Text>
                  </View>
                  <View style={styles.actionsRow}>
                    {isSent ? (
                      <>
                        <TouchableOpacity
                          style={styles.receiveBtn}
                          onPress={() => acceptDemand(demand.id)}
                        >
                          <Text style={styles.receiveBtnText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.openBtn}
                          onPress={() => rejectDemand(demand.id)}
                        >
                          <Text style={styles.openBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                    {isAccepted ? (
                      <TouchableOpacity
                        style={styles.receiveBtn}
                        onPress={() => dispatchDemand(demand.id)}
                      >
                        <Text style={styles.receiveBtnText}>Dispatch</Text>
                      </TouchableOpacity>
                    ) : null}
                    {isChatEligible ? (
                      <TouchableOpacity
                        style={styles.openBtn}
                        onPress={() => router.push(`/demand-chat/${demand.id}`)}
                      >
                        <Text style={styles.openBtnText}>Chat</Text>
                      </TouchableOpacity>
                    ) : null}
                    {isChatEligible && demand.ownerPhone ? (
                      <TouchableOpacity
                        style={styles.openBtn}
                        onPress={() => handleCall(demand.ownerPhone)}
                      >
                        <Feather name="phone" size={14} color="#0f172a" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
          {actionMessage ? (
            <View style={styles.actionBanner}>
              <Feather name="check-circle" size={16} color="#10b981" />
              <Text style={styles.actionBannerText}>{actionMessage}</Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </SecureScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
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
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
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
  highlightedCard: {
    borderColor: "#8b5cf6",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  cardSubtitle: {
    color: "#64748b",
    marginTop: 4,
    fontSize: 12,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeSent: {
    backgroundColor: "#eff6ff",
  },
  statusBadgeReceived: {
    backgroundColor: "#dcfce7",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadgeTextSent: {
    color: "#2563eb",
  },
  statusBadgeTextReceived: {
    color: "#166534",
  },
  messageRow: {
    marginBottom: 14,
  },
  messageText: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  openBtn: {
    backgroundColor: "#eef2ff",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  openBtnText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  receiveBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  receiveBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  actionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    backgroundColor: "#ecfdf5",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  actionBannerText: {
    color: "#166534",
    fontSize: 14,
    flex: 1,
  },
  emptyTitle: {
    color: "#0f172a",
    marginTop: 16,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyText: {
    color: "#64748b",
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
    maxWidth: 320,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    textAlign: "center",
  },
});
