import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl } from "../config/api";
import { useRouter } from "expo-router";

const SAVE_KEY = "savedDemand";

export default function Demand() {
  const router = useRouter();
  const [lines, setLines] = useState([{ id: "1", name: "", qty: 1 }]);
  const [medicines, setMedicines] = useState([]);
  const [result, setResult] = useState(null);
  const [demandId, setDemandId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [focusedLineId, setFocusedLineId] = useState(null);

  // Load medicines for autocomplete and clear stale cache
  useEffect(() => {
    // Clear any old format cache to prevent type errors
    AsyncStorage.removeItem(SAVE_KEY).catch(() => {});
    (async () => {
      try {
        const mRes = await fetch(apiUrl("/api/medicine?limit=500"));
        if (mRes.ok) {
          const mJson = await mRes.json();
          setMedicines(mJson.data || []);
        }
      } catch (_) {}
    })();
  }, []);

  const getSuggestions = (text) => {
    if (!text || text.length < 2) return [];
    const q = text.toLowerCase();
    return medicines
      .filter((m) => (m.name || "").toLowerCase().includes(q))
      .map((m) => m.name)
      .slice(0, 5);
  };

  const updateLine = (id, patch) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { id: String(Date.now()), name: "", qty: 1 },
    ]);

  const removeLine = (id) =>
    setLines((prev) => prev.filter((l) => l.id !== id));

  const clearAll = () => {
    setLines([{ id: String(Date.now()), name: "", qty: 1 }]);
    setResult(null);
    setDemandId(null);
    setError(null);
    AsyncStorage.removeItem(SAVE_KEY).catch(() => {});
  };

  const createDemand = async () => {
    const validLines = lines.filter((l) => l.name.trim().length > 0);
    if (validLines.length === 0) {
      Alert.alert("Empty List", "Please enter at least one medicine name.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const groups = {};
      await Promise.all(
        validLines.map(async (line) => {
          const q = line.name.trim();
          try {
            const res = await fetch(
              apiUrl(`/api/stockist/by-medicine?name=${encodeURIComponent(q)}`)
            );
            const json = await res.json();
            const list = json.data || [];
            const matchType = json.matchType || "general";
            if (list.length === 0) {
              groups["__unmatched__"] = groups["__unmatched__"] || [];
              groups["__unmatched__"].push({ line });
            } else {
              for (const stockist of list) {
                const label = stockist._id;
                groups[label] = groups[label] || { stockist, items: [] };
                groups[label].items.push({ line, matchType });
              }
            }
          } catch (_) {
            groups["__unmatched__"] = groups["__unmatched__"] || [];
            groups["__unmatched__"].push({ line });
          }
        })
      );

      setResult(groups);

      // Save
      try {
        let purchaserId = null;
        let purchaserName = null;
        const raw = await AsyncStorage.getItem("user").catch(() => null);
        if (raw) {
          const u = JSON.parse(raw);
          purchaserId = u._id || u.id;
          purchaserName = u.fullName || u.name || u.email;
        }
        const apiLines = [];
        for (const [key, val] of Object.entries(groups)) {
          if (key === "__unmatched__") {
            for (const it of val) {
              apiLines.push({ name: it.line.name, qty: it.line.qty, status: "unmatched" });
            }
          } else {
            for (const it of val.items) {
              apiLines.push({
                name: it.line.name,
                qty: it.line.qty,
                assignedStockistId: val.stockist._id,
                assignedStockistName: val.stockist.name,
                status: "assigned",
              });
            }
          }
        }
        const backendRes = await fetch(apiUrl("/api/demand"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ purchaserId, purchaserName, extendedLines: apiLines }),
        });
        if (backendRes.ok) {
          const ds = await backendRes.json();
          const id = ds.data?._id;
          if (id) {
            setDemandId(id);
            AsyncStorage.setItem(SAVE_KEY, JSON.stringify({ groups, demandId: id, createdAt: Date.now() })).catch(() => {});
          }
        }
      } catch (_) {}
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Count matched vs unmatched
  const resultEntries = result ? Object.entries(result) : [];
  const unmatchedEntry = result?.["__unmatched__"];
  const matchedEntries = resultEntries.filter(([k]) => k !== "__unmatched__");

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Bar */}
      <LinearGradient colors={["#0f172a", "#1e293b"]} style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#94a3b8" />
        </TouchableOpacity>
        <View style={styles.topBarTitle}>
          <Text style={styles.topBarH}>Medicine Demand</Text>
          <Text style={styles.topBarSub}>Find stockists for your medicines</Text>
        </View>
        {result && (
          <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
            <Feather name="refresh-cw" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Input Section */}
        <View style={styles.inputCard}>
          <View style={styles.inputCardHeader}>
            <View style={styles.inputCardTitleRow}>
              <View style={styles.inputCardIcon}>
                <Feather name="list" size={18} color="#06b6d4" />
              </View>
              <Text style={styles.inputCardTitle}>Medicine List</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{lines.length} item{lines.length !== 1 ? "s" : ""}</Text>
            </View>
          </View>

          {/* Medicine Lines */}
          {lines.map((line, index) => {
            const sugg = focusedLineId === line.id ? getSuggestions(line.name) : [];
            return (
              <View key={line.id} style={styles.lineWrapper}>
                <View style={styles.lineRow}>
                  <View style={styles.lineNum}>
                    <Text style={styles.lineNumText}>{index + 1}</Text>
                  </View>

                  <View style={styles.nameInputWrapper}>
                    <TextInput
                      style={styles.nameInput}
                      value={line.name}
                      onChangeText={(v) => updateLine(line.id, { name: v })}
                      onFocus={() => setFocusedLineId(line.id)}
                      onBlur={() => setTimeout(() => setFocusedLineId(null), 180)}
                      placeholder="Medicine name..."
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={styles.qtyBox}>
                    <TouchableOpacity
                      onPress={() => updateLine(line.id, { qty: Math.max(1, (line.qty || 1) - 1) })}
                      style={styles.qtyBtn}
                    >
                      <Feather name="minus" size={14} color="#475569" />
                    </TouchableOpacity>
                    <Text style={styles.qtyNum}>{line.qty}</Text>
                    <TouchableOpacity
                      onPress={() => updateLine(line.id, { qty: (line.qty || 1) + 1 })}
                      style={styles.qtyBtn}
                    >
                      <Feather name="plus" size={14} color="#475569" />
                    </TouchableOpacity>
                  </View>

                  {lines.length > 1 && (
                    <TouchableOpacity onPress={() => removeLine(line.id)} style={styles.removeBtn}>
                      <Feather name="x" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Autocomplete */}
                {sugg.length > 0 && (
                  <View style={styles.suggBox}>
                    {sugg.map((s, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.suggItem, i === sugg.length - 1 && { borderBottomWidth: 0 }]}
                        onPress={() => { updateLine(line.id, { name: s }); setFocusedLineId(null); }}
                      >
                        <Feather name="clock" size={13} color="#94a3b8" />
                        <Text style={styles.suggText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {/* Add Item */}
          <TouchableOpacity onPress={addLine} style={styles.addBtn}>
            <Feather name="plus-circle" size={18} color="#06b6d4" />
            <Text style={styles.addBtnText}>Add Another Medicine</Text>
          </TouchableOpacity>

          {/* Error */}
          {error && (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            onPress={createDemand}
            disabled={loading}
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#06b6d4", "#0ea5e9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={18} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.submitText}>Create Demand</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── RESULTS ── */}
        {result && (
          <View style={styles.resultsSection}>
            {/* Summary bar */}
            <View style={styles.summaryBar}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{matchedEntries.length}</Text>
                <Text style={styles.summaryLabel}>Stockists Found</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: "#06b6d4" }]}>
                  {matchedEntries.reduce((acc, [, v]) => acc + (v?.items?.length || 0), 0)}
                </Text>
                <Text style={styles.summaryLabel}>Medicines Matched</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: "#f59e0b" }]}>
                  {unmatchedEntry ? unmatchedEntry.length : 0}
                </Text>
                <Text style={styles.summaryLabel}>Not Found</Text>
              </View>
            </View>

            {demandId && (
              <View style={styles.savedBanner}>
                <Feather name="check-circle" size={15} color="#059669" />
                <Text style={styles.savedText}>Demand saved · Ref: {demandId.slice(-8).toUpperCase()}</Text>
              </View>
            )}

            {/* Matched stockist groups */}
            {matchedEntries.map(([key, val]) => {
              // Guard against stale/unexpected data formats
              if (!val || !val.stockist || !Array.isArray(val.items)) return null;
              const { stockist, items } = val;
              const hasInventory = items.some((it) => it.matchType === "inventory");
              return (
                <View key={key} style={styles.stockistCard}>
                  {/* Card Header */}
                  <LinearGradient
                    colors={hasInventory ? ["#0f766e", "#0e7490"] : ["#1d4ed8", "#4f46e5"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.cardHead}
                  >
                    <View style={styles.cardHeadLeft}>
                      <View style={styles.stockistAvatar}>
                        <Text style={styles.stockistAvatarText}>
                          {(stockist.name || "S").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.cardStockistName}>{stockist.name || "Unnamed Stockist"}</Text>
                        <View style={styles.statusTag}>
                          <Feather
                            name={hasInventory ? "check-circle" : "info"}
                            size={11}
                            color={hasInventory ? "#a7f3d0" : "#bfdbfe"}
                          />
                          <Text style={[styles.statusTagText, { color: hasInventory ? "#a7f3d0" : "#bfdbfe" }]}>
                            {hasInventory ? "Confirmed Inventory" : "Contact to Verify"}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {stockist.phone && (
                      <TouchableOpacity
                        style={styles.callPill}
                        onPress={() => Linking.openURL(`tel:${stockist.phone}`)}
                      >
                        <Feather name="phone-call" size={15} color="#0f172a" />
                        <Text style={styles.callPillText}>Call</Text>
                      </TouchableOpacity>
                    )}
                  </LinearGradient>

                  {/* Phone Row */}
                  {stockist.phone && (
                    <View style={styles.phoneInfoRow}>
                      <Feather name="phone" size={13} color="#64748b" />
                      <Text style={styles.phoneInfoText}>{stockist.phone}</Text>
                      {(stockist.address?.city || stockist.address?.state) && (
                        <>
                          <Text style={{ color: "#cbd5e1", marginHorizontal: 8 }}>•</Text>
                          <Feather name="map-pin" size={13} color="#64748b" />
                          <Text style={styles.phoneInfoText}>
                            {[stockist.address?.city, stockist.address?.state].filter(Boolean).join(", ")}
                          </Text>
                        </>
                      )}
                    </View>
                  )}

                  {/* Medicine items */}
                  {items.map((it, i) => (
                    <View
                      key={i}
                      style={[styles.itemRow, i === 0 && { borderTopWidth: 1, borderTopColor: "#f1f5f9" }]}
                    >
                      <View style={styles.medDot} />
                      <Text style={styles.itemName} numberOfLines={1}>{it.line.name}</Text>
                      <View style={styles.qtyPill}>
                        <Text style={styles.qtyPillText}>×{it.line.qty}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}

            {/* Unmatched medicines */}
            {unmatchedEntry && unmatchedEntry.length > 0 && (
              <View style={styles.unmatchedCard}>
                <View style={styles.unmatchedHead}>
                  <View style={styles.unmatchedIconBox}>
                    <Feather name="alert-triangle" size={18} color="#f59e0b" />
                  </View>
                  <View>
                    <Text style={styles.unmatchedTitle}>No Stockist Available</Text>
                    <Text style={styles.unmatchedSub}>{unmatchedEntry.length} medicine{unmatchedEntry.length !== 1 ? "s" : ""} could not be matched</Text>
                  </View>
                </View>
                {unmatchedEntry.map((it, i) => (
                  <View key={i} style={[styles.itemRow, styles.unmatchedItem]}>
                    <Feather name="x-circle" size={14} color="#f59e0b" />
                    <Text style={styles.unmatchedItemText} numberOfLines={1}>{it.line.name}</Text>
                    <View style={[styles.qtyPill, { backgroundColor: "#fef3c7" }]}>
                      <Text style={[styles.qtyPillText, { color: "#92400e" }]}>×{it.line.qty}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f1f5f9" },

  /* Top Bar */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center", alignItems: "center",
  },
  topBarTitle: { flex: 1 },
  topBarH: { fontSize: 17, fontWeight: "800", color: "#f1f5f9" },
  topBarSub: { fontSize: 12, color: "#64748b", marginTop: 1 },
  clearBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center", alignItems: "center",
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },

  /* Input Card */
  inputCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 20,
  },
  inputCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  inputCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  inputCardIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#ecfeff",
    justifyContent: "center", alignItems: "center",
  },
  inputCardTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  countBadge: {
    backgroundColor: "#06b6d4",
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20,
  },
  countBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  /* Line Row */
  lineWrapper: { marginBottom: 12 },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lineNum: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "#e2e8f0",
    justifyContent: "center", alignItems: "center",
  },
  lineNumText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  nameInputWrapper: { flex: 1 },
  nameInput: {
    fontSize: 15,
    color: "#0f172a",
    padding: 0,
    ...Platform.select({ web: { outlineStyle: "none" } }),
  },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  qtyBtn: { width: 30, height: 34, justifyContent: "center", alignItems: "center" },
  qtyNum: { width: 30, textAlign: "center", fontSize: 14, fontWeight: "700", color: "#0f172a" },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#fef2f2",
    justifyContent: "center", alignItems: "center",
  },

  /* Suggestions */
  suggBox: {
    backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#e2e8f0",
    borderRadius: 12,
    marginTop: 4,
    overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 3,
    zIndex: 99,
  },
  suggItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  suggText: { fontSize: 14, color: "#334155", fontWeight: "500" },

  /* Add btn */
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14,
    borderWidth: 2, borderColor: "#e0f2fe", borderStyle: "dashed",
    borderRadius: 12, backgroundColor: "#f0fdff",
    marginBottom: 16,
  },
  addBtnText: { color: "#06b6d4", fontWeight: "700", fontSize: 14 },

  /* Error */
  errorRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fef2f2", padding: 12, borderRadius: 10, marginBottom: 12,
  },
  errorText: { color: "#b91c1c", fontSize: 13, fontWeight: "500", flex: 1 },

  /* Submit */
  submitBtn: { borderRadius: 14, overflow: "hidden" },
  submitGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 16,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  /* Results */
  resultsSection: { gap: 14 },

  summaryBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    alignItems: "center",
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryNum: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  summaryLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "600", marginTop: 2 },
  summaryDivider: { width: 1, height: 36, backgroundColor: "#f1f5f9" },

  savedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f0fdf4",
    borderWidth: 1, borderColor: "#bbf7d0",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  savedText: { fontSize: 13, color: "#15803d", fontWeight: "600" },

  /* Stockist Card */
  stockistCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: "#f1f5f9",
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  cardHeadLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  stockistAvatar: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  stockistAvatarText: { fontSize: 18, fontWeight: "800", color: "#fff" },
  cardStockistName: { fontSize: 15, fontWeight: "800", color: "#fff", marginBottom: 3 },
  statusTag: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusTagText: { fontSize: 11, fontWeight: "600" },
  callPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  callPillText: { fontSize: 13, fontWeight: "800", color: "#0f172a" },

  phoneInfoRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  phoneInfoText: { fontSize: 13, color: "#475569", fontWeight: "500" },

  /* Item Row */
  itemRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#f8fafc",
    gap: 10,
  },
  medDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#06b6d4" },
  itemName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1e293b" },
  qtyPill: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  qtyPillText: { fontSize: 12, fontWeight: "700", color: "#0369a1" },

  /* Unmatched */
  unmatchedCard: {
    backgroundColor: "#fff",
    borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: "#fef3c7",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  unmatchedHead: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#fffbeb",
    borderBottomWidth: 1, borderBottomColor: "#fef3c7",
  },
  unmatchedIconBox: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: "#fef3c7",
    justifyContent: "center", alignItems: "center",
  },
  unmatchedTitle: { fontSize: 14, fontWeight: "800", color: "#92400e" },
  unmatchedSub: { fontSize: 12, color: "#b45309", marginTop: 2 },
  unmatchedItem: { backgroundColor: "#fffbeb" },
  unmatchedItemText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#78350f" },
});
