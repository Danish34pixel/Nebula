import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { fetchJson, postJson } from "../../config/api";
import SecureScreen from "../../components/SecureScreen";

function ItemsList({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <View style={styles.itemsList}>
      {items.map((item, i) => (
        <View key={i} style={styles.itemLine}>
          <View style={styles.itemDot} />
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemQty}>×{item.quantity}</Text>
          {item.description ? (
            <Text style={styles.itemDesc} numberOfLines={1}>· {item.description}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function itemsHeader(items) {
  if (!Array.isArray(items) || items.length === 0) return "Unknown request";
  if (items.length === 1) return items[0].name;
  return `${items.length} items`;
}

export default function PurchaserUrgentRequests() {
  const router = useRouter();
  const [tab, setTab] = useState("pending");

  const [pendingRequests, setPendingRequests] = useState([]);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);

  const appActiveRef = useRef(true);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetchJson("/urgent-request/dashboard");
      if (res.success) {
        setPendingRequests(res.pending || []);
        setAcceptedRequests(res.accepted || []);
      }
    } catch (e) {
      // silent — keep stale data on poll failures
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let timerId;
      appActiveRef.current = true;

      const tick = async () => {
        if (cancelled) return;
        if (appActiveRef.current) await loadDashboard();
        if (!cancelled) timerId = setTimeout(tick, 5000);
      };

      const appStateSub = AppState.addEventListener("change", (state) => {
        appActiveRef.current = state === "active";
      });

      tick();

      return () => {
        cancelled = true;
        clearTimeout(timerId);
        appStateSub.remove();
      };
    }, [loadDashboard])
  );

  const handleAccept = async (id) => {
    setAccepting(id);
    try {
      const res = await postJson(`/urgent-request/${id}/accept`, {});
      if (res.success) {
        setPendingRequests((prev) => prev.filter((r) => r._id !== id));
        await loadDashboard();
        setTab("accepted");
      }
    } catch (e) {
      if (e.status === 409) {
        Alert.alert("Too slow!", "This request was already accepted by someone else.");
        setPendingRequests((prev) => prev.filter((r) => r._id !== id));
      } else {
        Alert.alert("Error", e.message || "Failed to accept request.");
      }
    } finally {
      setAccepting(null);
    }
  };

  const handleCall = async (phone) => {
    const url = `tel:${String(phone).trim()}`;
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) Linking.openURL(url);
  };

  const statusColor = (status) => {
    if (status === "completed") return "#10b981";
    if (status === "cancelled") return "#ef4444";
    return "#6366f1";
  };

  const statusLabel = (status) => {
    if (status === "completed") return "Completed";
    if (status === "cancelled") return "Cancelled";
    return "Accepted";
  };

  return (
    <SecureScreen>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Urgent Requests</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "pending" && styles.tabBtnActive]}
            onPress={() => setTab("pending")}
          >
            <Text style={[styles.tabText, tab === "pending" && styles.tabTextActive]}>
              Pending
            </Text>
            {pendingRequests.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "accepted" && styles.tabBtnActive]}
            onPress={() => setTab("accepted")}
          >
            <Text style={[styles.tabText, tab === "accepted" && styles.tabTextActive]}>
              My Accepted
            </Text>
            {acceptedRequests.length > 0 && (
              <View style={[styles.badge, { backgroundColor: "#6366f1" }]}>
                <Text style={styles.badgeText}>{acceptedRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Banner */}
          <LinearGradient colors={["#3b82f6", "#6366f1"]} style={styles.heroBanner}>
            <Feather name="bell" size={24} color="#fff" />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.heroTitle}>
                {tab === "pending" ? "Live Requests" : "Your Accepted Requests"}
              </Text>
              <Text style={styles.heroSub}>
                {tab === "pending"
                  ? "First to accept gets the assignment. List refreshes every 5s."
                  : "Requests you accepted. Chat or call the medical owner."}
              </Text>
            </View>
          </LinearGradient>

          {/* ── PENDING TAB ── */}
          {tab === "pending" && (
            <>
              {loading && pendingRequests.length === 0 ? (
                <ActivityIndicator color="#3b82f6" style={{ marginTop: 32 }} />
              ) : pendingRequests.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Feather name="inbox" size={36} color="#cbd5e1" />
                  </View>
                  <Text style={styles.emptyTitle}>No pending requests</Text>
                  <Text style={styles.emptyHint}>
                    When a medical owner sends an urgent request it will appear here.
                  </Text>
                </View>
              ) : (
                pendingRequests.map((r) => (
                  <View key={r._id} style={styles.requestCard}>
                    {/* Card header */}
                    <View style={styles.requestTop}>
                      <View style={styles.urgentDot} />
                      <Text style={styles.requestTitle} numberOfLines={1}>
                        {itemsHeader(r.items)}
                      </Text>
                      <Text style={styles.itemCount}>
                        {r.items?.length > 1 ? `${r.items.length} items` : ""}
                      </Text>
                    </View>

                    <ItemsList items={r.items} />

                    {r.urgencyNote ? (
                      <Text style={styles.urgencyNote}>⚠ {r.urgencyNote}</Text>
                    ) : null}

                    <Text style={styles.requestMeta}>
                      From: {r.createdByName || "Medical Owner"}
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.acceptBtn,
                        accepting === r._id && { opacity: 0.7 },
                      ]}
                      onPress={() => handleAccept(r._id)}
                      disabled={accepting !== null}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={["#10b981", "#059669"]}
                        style={styles.acceptBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        {accepting === r._id ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Feather
                              name="check"
                              size={16}
                              color="#fff"
                              style={{ marginRight: 8 }}
                            />
                            <Text style={styles.acceptBtnText}>Accept</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </>
          )}

          {/* ── ACCEPTED TAB ── */}
          {tab === "accepted" && (
            <>
              {loading && acceptedRequests.length === 0 ? (
                <ActivityIndicator color="#6366f1" style={{ marginTop: 32 }} />
              ) : acceptedRequests.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Feather name="check-circle" size={36} color="#cbd5e1" />
                  </View>
                  <Text style={styles.emptyTitle}>No accepted requests yet</Text>
                  <Text style={styles.emptyHint}>
                    Requests you accept will appear here with contact details.
                  </Text>
                </View>
              ) : (
                acceptedRequests.map((r) => (
                  <View key={r._id} style={styles.acceptedCard}>
                    {/* Status pill */}
                    <View style={styles.acceptedCardTop}>
                      <View style={styles.requestTop}>
                        <View
                          style={[
                            styles.urgentDot,
                            { backgroundColor: statusColor(r.status) },
                          ]}
                        />
                        <Text style={styles.requestTitle} numberOfLines={1}>
                          {itemsHeader(r.items)}
                        </Text>
                        <Text style={styles.itemCount}>
                          {r.items?.length > 1 ? `${r.items.length} items` : ""}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: statusColor(r.status) + "20" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            { color: statusColor(r.status) },
                          ]}
                        >
                          {statusLabel(r.status)}
                        </Text>
                      </View>
                    </View>

                    <ItemsList items={r.items} />

                    {r.urgencyNote ? (
                      <Text style={styles.urgencyNote}>⚠ {r.urgencyNote}</Text>
                    ) : null}

                    <Text style={styles.requestMeta}>
                      Owner: {r.ownerName || r.createdByName || "Medical Owner"}
                    </Text>

                    <View style={styles.acceptedActions}>
                      <TouchableOpacity
                        style={styles.chatBtn}
                        onPress={() => router.push(`/urgent-request-chat/${r._id}`)}
                      >
                        <Feather name="message-circle" size={15} color="#6366f1" />
                        <Text style={styles.chatBtnText}>Chat</Text>
                      </TouchableOpacity>

                      {r.ownerPhone ? (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => handleCall(r.ownerPhone)}
                        >
                          <Feather name="phone" size={15} color="#fff" />
                          <Text style={styles.callBtnText}>Call</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </SecureScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "bold", color: "#0f172a" },

  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingHorizontal: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: { borderBottomColor: "#6366f1" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#94a3b8" },
  tabTextActive: { color: "#6366f1" },
  badge: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  scrollContent: { padding: 20, paddingBottom: 50 },

  heroBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  heroTitle: { fontSize: 15, fontWeight: "bold", color: "#fff" },
  heroSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    lineHeight: 18,
  },

  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#64748b", marginBottom: 6 },
  emptyHint: { fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 20 },

  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  requestTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  urgentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  itemCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },

  // Shared items list
  itemsList: {
    marginBottom: 6,
    gap: 4,
  },
  itemLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  itemDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#cbd5e1",
  },
  itemName: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
    flex: 1,
  },
  itemQty: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  itemDesc: {
    fontSize: 12,
    color: "#94a3b8",
    fontStyle: "italic",
    flex: 1,
  },

  urgencyNote: {
    fontSize: 12,
    color: "#92400e",
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 6,
    overflow: "hidden",
  },

  requestMeta: { fontSize: 12, color: "#94a3b8", marginBottom: 12 },

  acceptBtn: { borderRadius: 12, overflow: "hidden" },
  acceptBtnGradient: {
    height: 48,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  acceptBtnText: { color: "#fff", fontSize: 15, fontWeight: "bold" },

  acceptedCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ede9fe",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  acceptedCardTop: { marginBottom: 4 },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  acceptedActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  chatBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ede9fe",
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  chatBtnText: { color: "#6366f1", fontWeight: "700", fontSize: 14 },
  callBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  callBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
