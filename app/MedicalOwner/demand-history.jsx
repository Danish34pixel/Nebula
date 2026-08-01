import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
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
const getName = (owner) =>
  owner?.medicalName ||
  owner?.fullName ||
  owner?.name ||
  owner?.shopName ||
  owner?.email ||
  "Unknown Owner";
const formatStatus = (value) => {
  const status = String(value || "")
    .trim()
    .toLowerCase();
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending";
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

export default function DemandHistory() {
  const router = useRouter();
  const { demandId } = useLocalSearchParams();
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const owner = user?.user || user;
      const ownerId = resolveId(owner);
      if (!ownerId) {
        setError("Unable to determine your account.");
        setDemands([]);
        return;
      }
      const data = await fetchJson(
        `/api/demand?ownerId=${encodeURIComponent(ownerId)}`,
      );
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.demands)
            ? data.demands
            : Array.isArray(data?.items)
              ? data.items
              : [];
      setDemands(
        items.map((d) => ({
          id: resolveId(d) || d.demandId || d.id,
          ownerName: getName(d.purchaser || d.medicalOwner || owner),
          createdAt: d.createdAt || d.sentAt || d.updatedAt,
          items:
            Array.isArray(d.items) && d.items.length > 0
              ? d.items
              : Array.isArray(d.medicines)
                ? d.medicines
                : [],
          supplierDemands: Array.isArray(d.supplierDemands)
            ? d.supplierDemands.map((sd) => ({
                id: resolveId(sd),
                stockistName: sd.stockistName || "Stockist",
                stockistPhone: sd.stockistPhone || null,
                status: formatStatus(sd.status),
                items: sd.items || [],
              }))
            : [],
        })),
      );
    } catch (err) {
      setError(err?.message || "Failed to load demand history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDemands();
    }, [loadDemands]),
  );

  return (
    <SecureScreen>
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={["#0f172a", "#1e293b"]} style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={20} color="#cbd5e1" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Demand History</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.content}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#38bdf8" />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : demands.length === 0 ? (
            <View style={styles.centered}>
              <Feather name="inbox" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No demand history found.</Text>
              <Text style={styles.emptyText}>
                Sent demands will appear here once they are processed.
              </Text>
            </View>
          ) : (
            demands.map((demand) => {
              const isSelected = String(demand.id) === String(selectedDemandId);
              return (
                <View
                  key={demand.id}
                  style={[styles.card, isSelected && styles.highlightedCard]}
                >
                  <Text style={styles.timestamp}>
                    Created {formatTime(demand.createdAt)}
                  </Text>
                  {demand.items && demand.items.length > 0 ? (
                    demand.items.map((item, index) => (
                      <View key={index} style={styles.itemRow}>
                        <Text style={styles.itemName}>
                          {item.medicineName || item.name || item.title}
                        </Text>
                        <Text style={styles.itemQty}>
                          {item.quantity || item.qty || 1}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>
                      No medicine details available.
                    </Text>
                  )}

                  {demand.supplierDemands.length === 0 ? (
                    <Text style={styles.emptyText}>
                      Not yet sent to any stockist.
                    </Text>
                  ) : (
                    demand.supplierDemands.map((sd) => {
                      const statusLower = sd.status.toLowerCase();
                      const isChatEligible = ["accepted", "dispatched", "completed"].includes(
                        statusLower,
                      );
                      return (
                        <View key={sd.id} style={styles.stockistRow}>
                          <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>{sd.stockistName}</Text>
                            <View style={styles.statusPill}>
                              <Text style={styles.statusText}>{sd.status}</Text>
                            </View>
                          </View>
                          {isChatEligible ? (
                            <View style={styles.actionsRow}>
                              <TouchableOpacity
                                style={styles.chatBtn}
                                onPress={() => router.push(`/demand-chat/${sd.id}`)}
                              >
                                <Feather name="message-circle" size={14} color="#0f172a" />
                                <Text style={styles.chatBtnText}>Chat</Text>
                              </TouchableOpacity>
                              {sd.stockistPhone ? (
                                <TouchableOpacity
                                  style={styles.chatBtn}
                                  onPress={() =>
                                    Linking.openURL(`tel:${String(sd.stockistPhone).trim()}`)
                                  }
                                >
                                  <Feather name="phone" size={14} color="#0f172a" />
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          ) : null}
                        </View>
                      );
                    })
                  )}
                </View>
              );
            })
          )}
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
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#f8fafc",
    fontWeight: "800",
    fontSize: 18,
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
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  highlightedCard: {
    borderColor: "#8b5cf6",
    shadowOpacity: 0.12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  cardSubtitle: {
    color: "#64748b",
    marginTop: 4,
    fontSize: 13,
  },
  statusPill: {
    backgroundColor: "#eef2ff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    color: "#4338ca",
    fontWeight: "700",
    fontSize: 13,
  },
  timestamp: {
    color: "#64748b",
    fontSize: 12,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  itemName: {
    color: "#0f172a",
    fontSize: 14,
  },
  itemQty: {
    color: "#475569",
    fontSize: 14,
  },
  stockistRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chatBtnText: { color: "#0f172a", fontSize: 13, fontWeight: "700" },
  emptyTitle: {
    color: "#0f172a",
    marginTop: 16,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    maxWidth: 320,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    textAlign: "center",
  },
});
