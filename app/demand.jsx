import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl } from "../config/api";

// Inline versions of utilities from React Web version
const medicineDisplayName = (m) => m?.name || m?.medicineName || m?.title || String(m?._id || "");
const medicineReferencesStockist = (med, stockistId) => {
  if (!med) return false;
  const candidates = [];
  try {
    if (Array.isArray(med.stockists)) candidates.push(...med.stockists);
    if (med.stockist) candidates.push(med.stockist);
    if (med.stockistId) candidates.push(med.stockistId);
    if (med.seller) candidates.push(med.seller);
    if (med.sellerId) candidates.push(med.sellerId);
    if (med.vendor) candidates.push(med.vendor);
  } catch {}
  return candidates.some((c) => String(c?._id || c?.id || c) === String(stockistId));
};

export default function Demand() {
  const [lines, setLines] = useState([{ id: Date.now().toString(), name: "", qty: 1 }]);
  const [medicines, setMedicines] = useState([]);
  const [stockists, setStockists] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [focusedLineId, setFocusedLineId] = useState(null);
  const SAVE_KEY = "savedDemand";

  const getSuggestions = (text) => {
    if (!text || text.length < 1) return [];
    const q = text.toLowerCase();
    const matches = medicines
      .filter((m) => {
        const mn = medicineDisplayName(m).toLowerCase();
        return mn.includes(q) && mn !== q;
      })
      .map((m) => medicineDisplayName(m));
    return Array.from(new Set(matches)).slice(0, 5);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mRes, sRes] = await Promise.all([
          fetch(apiUrl(`/api/medicine`)),
          fetch(apiUrl(`/api/stockist`)),
        ]);

        if (mRes && mRes.ok) {
          const mJson = await mRes.json();
          setMedicines(mJson.data || []);
        }
        if (sRes && sRes.ok) {
          const sJson = await sRes.json();
          setStockists(sJson.data || []);
        }
      } catch (e) {
        console.warn("Could not fetch medicines/stockists", e);
      }
    };

    fetchData();

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.groups) setResult(parsed.groups);
        }
      } catch (e) {}
    })();
  }, []);

  const updateLine = (id, patch) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { id: (Date.now() + Math.random()).toString(), name: "", qty: 1 },
    ]);
    
  const removeLine = (id) =>
    setLines((prev) => prev.filter((l) => l.id !== id));

  const createDemand = async () => {
    setLoading(true);
    setError(null);
    try {
      const groups = {};
      const normalizeQuery = (s) => (s || "").toString().trim();

      const checkStockistInventory = (medicine, stockist) => {
        const searchName = (medicine.name || medicine || "").toString().toLowerCase();
        if (!searchName) return false;

        const itemsToCheck = [];
        if (Array.isArray(stockist.medicines)) itemsToCheck.push(...stockist.medicines);
        if (Array.isArray(stockist.items)) itemsToCheck.push(...stockist.items);
        if (Array.isArray(stockist.companies)) itemsToCheck.push(...stockist.companies);

        return itemsToCheck.some((it) => {
          const medName = (typeof it === "string" ? it : it.name || it.brandName || it.shortName || "").toString().toLowerCase();
          return medName && (medName.includes(searchName) || searchName.includes(medName));
        });
      };

      for (const line of lines) {
        const q = normalizeQuery(line.name);
        if (!q) {
          groups["unmatched"] = groups["unmatched"] || [];
          groups["unmatched"].push({ line });
          continue;
        }

        const qLower = q.toLowerCase();
        let foundMeds = [];
        if (Array.isArray(medicines) && medicines.length > 0) {
          const exact = medicines.filter((m) => {
            const mn = (m.name || m.medicineName || m.title || "")
              .toString()
              .toLowerCase();
            return mn === qLower;
          });
          const includes = medicines.filter((m) => {
            const mn = (m.name || m.medicineName || m.title || "")
              .toString()
              .toLowerCase();
            return mn.includes(qLower) && mn !== qLower;
          });
          foundMeds = exact.length ? exact : includes;
        }

        let assigned = false;

        for (const med of foundMeds) {
          let availableStockists = [];
          if (Array.isArray(stockists) && stockists.length > 0) {
            availableStockists = stockists.filter((s) => {
              const hasInInventory = checkStockistInventory(med, s);
              const isReferenced = medicineReferencesStockist(med, s._id);
              return hasInInventory || isReferenced;
            });

            for (const matchedStockist of availableStockists) {
              const label =
                matchedStockist.title || matchedStockist.name || matchedStockist._id;
              groups[label] = groups[label] || [];
              groups[label].push({
                line,
                medicine: med,
                available: true,
                quantity: line.qty,
              });
              assigned = true;
            }
          }
        }

        if (assigned) continue;

        if (!assigned && Array.isArray(stockists) && stockists.length > 0) {
          const stockistsWithMedicine = stockists.filter((s) =>
            checkStockistInventory({ name: q }, s)
          );

          if (stockistsWithMedicine.length > 0) {
            for (const matchedStockist of stockistsWithMedicine) {
              const label =
                matchedStockist.title || matchedStockist.name || matchedStockist._id;
              groups[label] = groups[label] || [];
              groups[label].push({
                line,
                medicine: { name: q },
                available: true,
                quantity: line.qty,
              });
              assigned = true;
            }
          }
        }

        if (!assigned) {
          groups["unmatched"] = groups["unmatched"] || [];
          groups["unmatched"].push({ line });
        }
      }

      setResult(groups);
      try {
        await AsyncStorage.setItem(
          SAVE_KEY,
          JSON.stringify({ groups, createdAt: Date.now() })
        );
      } catch (e) {
        console.warn("Could not save demand to AsyncStorage", e);
      }
    } catch (e) {
      console.error(e);
      setError("Could not create demand. See console.");
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (stockistGroup) => {
    const stockist = stockists.find(
      (s) => s.name === stockistGroup || s.title === stockistGroup
    );
    if (stockist?.phone) {
      Linking.openURL(`tel:${stockist.phone}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Feather name="file-text" size={40} color="#14b8a6" />
          </View>
          <Text style={styles.headerDesc}>Create a new medicine demand list for your stockists.</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Medicine Requirements</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {lines.length} item{lines.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>

          {/* Lines */}
          <View style={styles.linesContainer}>
            {lines.map((line, index) => {
              const suggestions =
                focusedLineId === line.id ? getSuggestions(line.name) : [];
              return (
                <View key={line.id} style={{ zIndex: focusedLineId === line.id ? 10 : 1 }}>
                  <View style={styles.lineRow}>
                    <View style={styles.lineNumberBox}>
                      <Text style={styles.lineNumber}>{index + 1}</Text>
                    </View>

                    <TextInput
                      style={styles.nameInput}
                      value={line.name}
                      onChangeText={(val) => updateLine(line.id, { name: val })}
                      onFocus={() => setFocusedLineId(line.id)}
                      onBlur={() => setTimeout(() => setFocusedLineId(null), 200)}
                      placeholder="Enter medicine name..."
                      placeholderTextColor="#94a3b8"
                    />

                    <View style={styles.qtyContainer}>
                      <Text style={styles.qtyLabel}>Qty:</Text>
                      <TextInput
                        style={styles.qtyInput}
                        value={line.qty.toString()}
                        onChangeText={(val) => {
                          const parsed = parseInt(val, 10);
                          updateLine(line.id, { qty: isNaN(parsed) ? "" : parsed });
                        }}
                        keyboardType="numeric"
                      />
                    </View>

                    {lines.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeLine(line.id)}
                        style={styles.removeBtn}
                      >
                        <Feather name="trash-2" size={18} color="#f97316" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Suggestions Dropdown */}
                  {suggestions.length > 0 && (
                    <View style={styles.suggestionsDropdown}>
                      {suggestions.map((s, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.suggestionItem}
                          onPress={() => {
                            updateLine(line.id, { name: s });
                            setFocusedLineId(null);
                          }}
                        >
                          <Feather name="search" size={14} color="#94a3b8" />
                          <Text style={styles.suggestionText}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity onPress={addLine} style={styles.addBtn}>
              <Feather name="plus" size={18} color="#64748b" />
              <Text style={styles.addBtnText}>Add Item</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={createDemand} 
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" style={{marginRight: 8}} />
              ) : (
                <Feather name="check-circle" size={18} color="#fff" style={{marginRight: 8}} />
              )}
              <Text style={styles.submitBtnText}>
                {loading ? "Processing..." : "Create Demand"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-triangle" size={20} color="#f97316" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Results */}
        {result && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Feather name="check-circle" size={28} color="#14b8a6" />
              <Text style={styles.resultTitle}>Grouped Demand Results</Text>
            </View>

            {Object.keys(result).length === 0 ? (
              <View style={styles.emptyContainer}>
                <Feather name="package" size={48} color="#cbd5e1" style={{marginBottom: 16}} />
                <Text style={styles.emptyText}>No results to display</Text>
              </View>
            ) : (
              <View style={styles.groupsContainer}>
                {Object.entries(result).map(([group, items]) => {
                  const isUnmatched = group === "unmatched";
                  const phoneAvailable = !isUnmatched && stockists.find(s => s.name === group || s.title === group)?.phone;
                  
                  return (
                    <View key={group} style={styles.groupCard}>
                      <LinearGradient
                        colors={isUnmatched ? ["#f59e0b", "#f97316"] : ["#14b8a6", "#06b6d4"]}
                        style={styles.groupHeader}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={styles.groupTitleRow}>
                            {isUnmatched && <Feather name="alert-triangle" size={18} color="#fff" />}
                            <Text style={styles.groupTitleText}>
                              {isUnmatched ? "Unmatched / Not Found" : group}
                            </Text>
                          </View>
                          <Text style={styles.groupItemCount}>
                            {items.length} item{items.length !== 1 ? "s" : ""}
                          </Text>
                        </View>
                        {phoneAvailable && (
                          <TouchableOpacity onPress={() => handleCall(group)} style={styles.callBtn}>
                            <Text style={styles.callBtnEmoji}>📞</Text>
                          </TouchableOpacity>
                        )}
                      </LinearGradient>

                      <View style={styles.groupItemsContainer}>
                        {items.map((it, i) => (
                          <View key={i} style={styles.groupItemRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.groupItemName}>{it.line.name}</Text>
                              {it.medicine ? (
                                <View style={styles.matchBadge}>
                                  <Feather name="check-circle" size={12} color="#0d9488" />
                                  <Text style={styles.matchText}>
                                    Matches: {medicineDisplayName(it.medicine)}
                                  </Text>
                                </View>
                              ) : (
                                !isUnmatched && (
                                  <Text style={styles.noMatchText}>No direct medicine match</Text>
                                )
                              )}
                            </View>
                            <View style={styles.groupItemQtyBadge}>
                              <Text style={styles.groupItemQtyText}>Qty: {it.line.qty}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContainer: { padding: 16, paddingBottom: 40, alignItems: "center" },
  header: { alignItems: "center", marginBottom: 32, marginTop: 16, width: "100%", maxWidth: 600 },
  logoContainer: { width: 80, height: 80, backgroundColor: "#ccfbf1", borderRadius: 40, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  headerDesc: { fontSize: 16, color: "#64748b", textAlign: "center", paddingHorizontal: 20 },
  
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 15, elevation: 4, width: "100%", maxWidth: 600, marginBottom: 24 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  cardTitle: { fontSize: 20, fontWeight: "700", color: "#1e293b" },
  badge: { backgroundColor: "#14b8a6", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  
  linesContainer: { gap: 12, marginBottom: 24 },
  lineRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 16, padding: 12, gap: 12 },
  lineNumberBox: { width: 32, height: 32, backgroundColor: "#e2e8f0", borderRadius: 16, justifyContent: "center", alignItems: "center" },
  lineNumber: { fontSize: 14, fontWeight: "700", color: "#475569" },
  nameInput: { flex: 1, fontSize: 15, color: "#1e293b", padding: 0 },
  
  suggestionsDropdown: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    marginTop: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
    position: "absolute",
    top: 60,
    left: 44,
    right: 100,
    zIndex: 999,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 12,
  },
  suggestionText: { fontSize: 14, color: "#334155", fontWeight: "500" },
  
  qtyContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyLabel: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  qtyInput: { width: 60, height: 40, backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, textAlign: "center", fontSize: 15, color: "#1e293b" },
  removeBtn: { padding: 8, backgroundColor: "#ffedd5", borderRadius: 20, justifyContent: "center", alignItems: "center" },
  
  actionsContainer: { gap: 12 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderWidth: 2, borderColor: "#cbd5e1", borderStyle: "dashed", borderRadius: 12, backgroundColor: "#f8fafc" },
  addBtnText: { fontSize: 15, fontWeight: "600", color: "#64748b" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, backgroundColor: "#14b8a6", borderRadius: 12 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  
  errorBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffedd5", borderLeftWidth: 4, borderLeftColor: "#f97316", padding: 16, borderRadius: 8, width: "100%", maxWidth: 600, marginBottom: 24, gap: 12 },
  errorText: { color: "#9a3412", fontWeight: "600", fontSize: 15 },
  
  resultCard: { backgroundColor: "#fff", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 15, elevation: 4, width: "100%", maxWidth: 600 },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  resultTitle: { fontSize: 20, fontWeight: "700", color: "#1e293b" },
  emptyContainer: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 16, color: "#64748b" },
  
  groupsContainer: { gap: 20 },
  groupCard: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 16, overflow: "hidden" },
  groupHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16 },
  groupTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  groupTitleText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  groupItemCount: { fontSize: 13, color: "rgba(255,255,255,0.9)" },
  callBtn: { backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  callBtnEmoji: { fontSize: 16 },
  
  groupItemsContainer: { backgroundColor: "#fff" },
  groupItemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  groupItemName: { fontSize: 15, fontWeight: "600", color: "#0f172a", marginBottom: 4 },
  matchBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  matchText: { fontSize: 13, color: "#0d9488", fontWeight: "500" },
  noMatchText: { fontSize: 13, color: "#64748b" },
  groupItemQtyBadge: { backgroundColor: "#dbeafe", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  groupItemQtyText: { fontSize: 13, fontWeight: "700", color: "#1e40af" },
});
