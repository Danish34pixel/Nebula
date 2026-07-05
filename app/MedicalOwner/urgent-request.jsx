import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
  Platform,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { fetchJson, postJson } from "../../config/api";
import SecureScreen from "../../components/SecureScreen";

const STATUS_COLOR = {
  pending: "#f59e0b",
  accepted: "#10b981",
  completed: "#6366f1",
  cancelled: "#94a3b8",
};

const STATUS_LABEL = {
  pending: "Pending",
  accepted: "Accepted",
  completed: "Completed",
  cancelled: "Cancelled",
};

const emptyItem = () => ({ name: "", quantity: "1", description: "" });

function itemsSummary(items) {
  if (!Array.isArray(items) || items.length === 0) return "No items";
  if (items.length === 1) {
    const i = items[0];
    return `${i.name} ×${i.quantity}`;
  }
  const preview = items
    .slice(0, 3)
    .map((i) => `${i.name} ×${i.quantity}`)
    .join(", ");
  return items.length > 3 ? `${preview} +${items.length - 3} more` : preview;
}

export default function UrgentRequestScreen() {
  const router = useRouter();

  // Create form
  const [items, setItems] = useState([emptyItem()]);
  const [urgencyNote, setUrgencyNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [itemErrors, setItemErrors] = useState({}); // index → error string

  // My requests list
  const [requests, setRequests] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);

  const appActiveRef = useRef(true);

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetchJson("/urgent-request/mine");
      if (res.success) {
        setRequests(res.data || []);
        setListError(null);
      }
    } catch (e) {
      setListError((prev) =>
        prev === null ? e.message || "Failed to load requests" : prev
      );
    } finally {
      setLoadingList(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // `cancelled` is local to this invocation — survives StrictMode double-invoke
      // because each invoke gets its own `cancelled` variable and its own cleanup.
      let cancelled = false;
      let timerId;
      appActiveRef.current = true;

      const tick = async () => {
        if (cancelled) return;
        if (appActiveRef.current) await loadRequests();
        if (!cancelled) timerId = setTimeout(tick, 5000);
      };

      const appStateSub = AppState.addEventListener("change", (state) => {
        appActiveRef.current = state === "active";
        // No extra load call here — the next scheduled tick picks it up.
      });

      tick(); // immediate first call, then chains itself every 5s after resolving

      return () => {
        cancelled = true; // stops the chain even if a request is mid-flight
        clearTimeout(timerId);
        appStateSub.remove();
      };
    }, [loadRequests])
  );

  // ── Item row helpers ──────────────────────────────────────────────────────

  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    if (field === "name" && itemErrors[index]) {
      setItemErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setItemErrors((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        const ki = parseInt(k, 10);
        if (ki < index) next[ki] = prev[k];
        else if (ki > index) next[ki - 1] = prev[k];
      });
      return next;
    });
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    const errors = {};
    items.forEach((item, i) => {
      if (!item.name.trim()) errors[i] = "Name required";
    });
    if (Object.keys(errors).length > 0) {
      setItemErrors(errors);
      return;
    }

    setCreating(true);
    try {
      const payload = {
        items: items.map((item) => ({
          name: item.name.trim(),
          quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
          description: item.description.trim() || undefined,
        })),
        urgencyNote: urgencyNote.trim() || undefined,
      };
      const res = await postJson("/urgent-request/create", payload);
      if (res.success) {
        setItems([emptyItem()]);
        setUrgencyNote("");
        setItemErrors({});
        await loadRequests();
        Alert.alert("Sent", "Urgent request broadcast to all purchasers.");
      }
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to create request.");
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (id) => {
    Alert.alert("Cancel Request", "Are you sure you want to cancel this request?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await postJson(`/urgent-request/${id}/cancel`, {});
            await loadRequests();
          } catch (e) {
            Alert.alert("Error", e.message || "Failed to cancel.");
          }
        },
      },
    ]);
  };

  const handleCall = async (phone) => {
    const url = `tel:${String(phone).trim()}`;
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) Linking.openURL(url);
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

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero banner */}
          <LinearGradient colors={["#ef4444", "#dc2626"]} style={styles.heroBanner}>
            <Feather name="alert-circle" size={26} color="#fff" />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.heroTitle}>Create Urgent Request</Text>
              <Text style={styles.heroSub}>
                Broadcast to all purchasers instantly — first to accept gets assigned.
              </Text>
            </View>
          </LinearGradient>

          {/* Create form */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>ITEMS TO SOURCE</Text>

            {items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                {/* Row header */}
                <View style={styles.itemRowHeader}>
                  <View style={styles.itemDot} />
                  <Text style={styles.itemRowTitle}>Item {index + 1}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeItem(index)}
                      style={styles.removeBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="trash-2" size={15} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Name */}
                <View style={[styles.inputRow, itemErrors[index] && styles.inputRowError]}>
                  <Feather name="package" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="Medicine / item name *"
                    placeholderTextColor="#cbd5e1"
                    value={item.name}
                    onChangeText={(v) => updateItem(index, "name", v)}
                  />
                </View>
                {itemErrors[index] ? (
                  <Text style={styles.fieldError}>{itemErrors[index]}</Text>
                ) : null}

                {/* Quantity + description side by side */}
                <View style={styles.itemRowBottom}>
                  <View style={[styles.inputRow, styles.qtyInput]}>
                    <Feather name="hash" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.input}
                      placeholder="Qty"
                      placeholderTextColor="#cbd5e1"
                      value={item.quantity}
                      onChangeText={(v) => updateItem(index, "quantity", v)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.inputRow, { flex: 1 }]}>
                    <Feather name="edit-3" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.input}
                      placeholder="Note (optional)"
                      placeholderTextColor="#cbd5e1"
                      value={item.description}
                      onChangeText={(v) => updateItem(index, "description", v)}
                    />
                  </View>
                </View>
              </View>
            ))}

            {/* Add item button */}
            <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
              <Feather name="plus-circle" size={16} color="#6366f1" />
              <Text style={styles.addItemBtnText}>Add another item</Text>
            </TouchableOpacity>

            {/* Overall urgency note */}
            <Text style={styles.label}>OVERALL URGENCY NOTE (optional)</Text>
            <View style={[styles.inputRow, { height: 70, alignItems: "flex-start", paddingTop: 10 }]}>
              <Feather name="alert-triangle" size={15} color="#94a3b8" style={{ marginRight: 8, marginTop: 2 }} />
              <TextInput
                style={[styles.input, { flex: 1, textAlignVertical: "top" }]}
                placeholder="e.g. Patient in ICU, needed immediately"
                placeholderTextColor="#cbd5e1"
                value={urgencyNote}
                onChangeText={setUrgencyNote}
                multiline
              />
            </View>

            <TouchableOpacity
              style={[styles.createBtn, creating && { opacity: 0.7 }]}
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#ef4444", "#dc2626"]}
                style={styles.createBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.createBtnText}>
                      Broadcast {items.length === 1 ? "Request" : `${items.length} Items`}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* My requests list */}
          <Text style={styles.listSectionTitle}>My Requests</Text>

          {loadingList && requests.length === 0 ? (
            <ActivityIndicator color="#ef4444" style={{ marginTop: 20 }} />
          ) : listError && requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="alert-circle" size={32} color="#ef4444" />
              <Text style={[styles.emptyText, { color: "#ef4444" }]}>{listError}</Text>
            </View>
          ) : requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={32} color="#cbd5e1" />
              <Text style={styles.emptyText}>No requests yet</Text>
            </View>
          ) : (
            requests.map((r) => (
              <View key={r._id} style={styles.requestCard}>
                <View style={styles.requestCardTop}>
                  <View style={styles.requestCardTitle}>
                    <Text style={styles.requestItemCount}>
                      {r.items?.length === 1
                        ? "1 item"
                        : `${r.items?.length || 0} items`}
                    </Text>
                    <Text style={styles.requestItemSummary} numberOfLines={1}>
                      {itemsSummary(r.items)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: (STATUS_COLOR[r.status] || "#94a3b8") + "22" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: STATUS_COLOR[r.status] || "#94a3b8" },
                      ]}
                    >
                      {STATUS_LABEL[r.status] || r.status}
                    </Text>
                  </View>
                </View>

                {/* Items list */}
                {Array.isArray(r.items) && r.items.map((item, i) => (
                  <View key={i} style={styles.itemLine}>
                    <View style={styles.itemLineDot} />
                    <Text style={styles.itemLineName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemLineQty}>×{item.quantity}</Text>
                    {item.description ? (
                      <Text style={styles.itemLineDesc} numberOfLines={1}>
                        · {item.description}
                      </Text>
                    ) : null}
                  </View>
                ))}

                {r.urgencyNote ? (
                  <Text style={styles.requestUrgencyNote}>⚠ {r.urgencyNote}</Text>
                ) : null}

                {/* Accepted state — show purchaser details */}
                {r.status === "accepted" && (
                  <View style={styles.acceptedBox}>
                    <Feather name="check-circle" size={14} color="#10b981" />
                    <Text style={styles.acceptedLabel}>
                      {r.purchaserName || "A purchaser"} accepted
                    </Text>
                    <View style={styles.contactActions}>
                      {r.purchaserPhone ? (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => handleCall(r.purchaserPhone)}
                        >
                          <Feather name="phone" size={14} color="#fff" />
                          <Text style={styles.callBtnText}>Call</Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        style={styles.chatBtn}
                        onPress={() => router.push(`/urgent-request-chat/${r._id}`)}
                      >
                        <Feather name="message-circle" size={14} color="#6366f1" />
                        <Text style={styles.chatBtnText}>Chat</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {r.status === "pending" && (
                  <TouchableOpacity
                    style={styles.cancelLink}
                    onPress={() => handleCancel(r._id)}
                  >
                    <Text style={styles.cancelLinkText}>Cancel request</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
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

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 24,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
  },

  // Item rows
  itemRow: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  itemRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  itemDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  itemRowTitle: { fontSize: 12, fontWeight: "700", color: "#64748b", flex: 1 },
  removeBtn: {
    padding: 4,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 6,
  },
  inputRowError: {
    borderColor: "#ef4444",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
    height: "100%",
    ...Platform.select({ web: { outlineStyle: "none" } }),
  },
  fieldError: {
    fontSize: 11,
    color: "#ef4444",
    marginBottom: 4,
    marginLeft: 4,
  },

  itemRowBottom: {
    flexDirection: "row",
    gap: 8,
  },
  qtyInput: {
    width: 90,
    flex: undefined,
  },

  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  addItemBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366f1",
  },

  createBtn: { borderRadius: 14, overflow: "hidden", marginTop: 20 },
  createBtnGradient: {
    height: 52,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  listSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 12,
  },

  emptyState: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { color: "#94a3b8", fontSize: 14 },

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
  requestCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  requestCardTitle: { flex: 1 },
  requestItemCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 2,
  },
  requestItemSummary: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontSize: 12, fontWeight: "700" },

  // Items list inside request card
  itemLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 3,
  },
  itemLineDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#cbd5e1",
  },
  itemLineName: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
    flex: 1,
  },
  itemLineQty: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  itemLineDesc: {
    fontSize: 12,
    color: "#94a3b8",
    fontStyle: "italic",
    flex: 1,
  },

  requestUrgencyNote: {
    fontSize: 12,
    color: "#92400e",
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
    overflow: "hidden",
  },

  acceptedBox: {
    marginTop: 10,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  acceptedLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#15803d",
    marginLeft: 4,
  },
  contactActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  callBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ede9fe",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  chatBtnText: { color: "#6366f1", fontWeight: "700", fontSize: 13 },

  cancelLink: { marginTop: 10, alignSelf: "flex-start" },
  cancelLinkText: { color: "#ef4444", fontSize: 13, fontWeight: "600" },
});
