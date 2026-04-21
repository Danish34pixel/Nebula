import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl } from "../config/api";
import { useRouter } from "expo-router";

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

const resolveMedicineFromCatalog = (catalog, inputName) => {
  const q = normalize(inputName);
  if (!q) return null;

  const exact = catalog.find((m) => normalize(m?.name) === q);
  if (exact) return exact;

  const partial = catalog.find(
    (m) => normalize(m?.name).includes(q) || q.includes(normalize(m?.name)),
  );
  return partial || null;
};

export default function Demand() {
  const router = useRouter();
  const [lines, setLines] = useState([{ id: "1", name: "" }]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focusedLineId, setFocusedLineId] = useState(null);
  const [error, setError] = useState("");
  const [sessionDemand, setSessionDemand] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiUrl("/medicine?limit=500"));
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data?.data?.medicines)
                ? data.data.medicines
                : Array.isArray(data?.medicines)
                  ? data.medicines
                  : Array.isArray(data?.items)
                    ? data.items
                    : [];
          setMedicines(list);
        }
      } catch (_) {}
    })();
  }, []);

  const getSuggestions = (value) => {
    const q = normalize(value);
    if (q.length < 2) return [];
    return (medicines || [])
      .map((m) => String(m?.name || "").trim())
      .filter(Boolean)
      .filter((n) => n.toLowerCase().includes(q))
      .slice(0, 5);
  };

  const updateLine = (id, patch) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const addLine = () =>
    setLines((prev) => [...prev, { id: String(Date.now()), name: "" }]);

  const removeLine = (id) =>
    setLines((prev) => prev.filter((l) => l.id !== id));

  const payloadItems = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const l of lines) {
      const name = String(l?.name || "").trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      out.push({ name });
    }
    return out;
  }, [lines]);

  const loadOwnerDetails = async () => {
    const raw = await AsyncStorage.getItem("user").catch(() => null);
    if (!raw) {
      return {
        id: null,
        name: "Unknown Medical Owner",
        email: null,
        phone: null,
      };
    }

    const owner = JSON.parse(raw);
    return {
      id: owner?._id || owner?.id || null,
      name:
        owner?.medicalName ||
        owner?.fullName ||
        owner?.name ||
        owner?.shopName ||
        owner?.email ||
        "Unknown Medical Owner",
      email: owner?.email || null,
      phone: owner?.contactNo || owner?.phone || null,
    };
  };

  const createDemand = async () => {
    if (payloadItems.length === 0) {
      setError("Please enter at least one medicine name.");
      return;
    }

    setLoading(true);
    setError("");
    setSessionDemand(null);

    try {
      const medicalOwner = await loadOwnerDetails();
      const token = await AsyncStorage.getItem("accessToken").catch(() => null);

      const res = await fetch(apiUrl("/api/demand/create"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          items: payloadItems,
          purchaserId: medicalOwner.id,
          purchaserName: medicalOwner.name,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create demand");

      // The backend now returns 'inventory' which is Medicine -> Stockists mapping
      setSessionDemand({
        generatedAt: new Date().toISOString(),
        medicalOwner,
        requestedMedicines: data.data.inventory.map((inv) => ({
          inputName: inv.requestedAs,
          medicineName: inv.medicineName,
          medicineId: null, // IDs are in stockists
          inCatalog: true, // Backend did the check
        })),
        medicineStockists: data.data.inventory.map((inv) => ({
          medicineName: inv.medicineName,
          requestedAs: inv.requestedAs,
          stockists: inv.stockists,
        })),
        originalDemandId: data.data.originalDemandId,
      });

      // Show success alert or similar if needed
    } catch (e) {
      setError(e?.message || "Something went wrong while creating demand.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={["#0f172a", "#1e293b"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#cbd5e1" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Demand</Text>
        <View style={styles.backBtn} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.label}>Medicines</Text>
          {lines.map((line) => {
            const suggestions =
              focusedLineId === line.id ? getSuggestions(line.name) : [];
            return (
              <View key={line.id} style={styles.lineBlock}>
                <View style={styles.lineRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter medicine name"
                    placeholderTextColor="#94a3b8"
                    value={line.name}
                    onChangeText={(v) => updateLine(line.id, { name: v })}
                    onFocus={() => setFocusedLineId(line.id)}
                    onBlur={() => setTimeout(() => setFocusedLineId(null), 150)}
                  />
                  {lines.length > 1 ? (
                    <TouchableOpacity
                      onPress={() => removeLine(line.id)}
                      style={styles.iconBtn}
                    >
                      <Feather name="x" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {suggestions.length > 0 ? (
                  <View style={styles.suggestions}>
                    {suggestions.map((s, idx) => (
                      <TouchableOpacity
                        key={`${line.id}-${idx}`}
                        style={[
                          styles.suggestionItem,
                          idx === suggestions.length - 1 && {
                            borderBottomWidth: 0,
                          },
                        ]}
                        onPress={() => {
                          updateLine(line.id, { name: s });
                          setFocusedLineId(null);
                        }}
                      >
                        <Text style={styles.suggestionText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}

          <TouchableOpacity style={styles.addBtn} onPress={addLine}>
            <Feather name="plus-circle" size={16} color="#0ea5e9" />
            <Text style={styles.addBtnText}>Add Item</Text>
          </TouchableOpacity>

          {error ? (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={14} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={createDemand}
            disabled={loading}
            style={styles.submitWrap}
          >
            <LinearGradient
              colors={["#06b6d4", "#0ea5e9"]}
              style={styles.submitBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather
                    name="send"
                    size={16}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.submitText}>Create Demand</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {sessionDemand ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              Demand Preview (Session Only)
            </Text>
            <Text style={styles.summaryText}>
              Medical Owner: {sessionDemand.medicalOwner.name}
            </Text>
            <Text style={styles.summaryText}>
              Requested Medicines: {sessionDemand.requestedMedicines.length}
            </Text>

            {sessionDemand.medicineStockists.map((entry, idx) => (
              <View
                key={`${entry.medicineName}-${idx}`}
                style={styles.medicineCard}
              >
                <Text style={styles.medicineTitle}>{entry.medicineName}</Text>
                {entry.stockists.length === 0 ? (
                  <Text style={styles.notAvailableText}>Not Available</Text>
                ) : (
                  entry.stockists.map((stockist, sIdx) => (
                    <View
                      key={`${stockist.id || stockist.name}-${sIdx}`}
                      style={styles.stockistRow}
                    >
                      <Text style={styles.stockistName}>{stockist.name}</Text>
                      <Text style={styles.stockistPhone}>{stockist.phone}</Text>
                    </View>
                  ))
                )}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
  },
  lineBlock: { marginBottom: 10 },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
    ...Platform.select({ web: { outlineStyle: "none" } }),
  },
  iconBtn: { padding: 6, marginLeft: 6 },
  suggestions: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  suggestionText: { color: "#334155", fontSize: 13, fontWeight: "500" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  addBtnText: { color: "#0369a1", fontWeight: "700", fontSize: 13 },
  errorRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: { color: "#b91c1c", fontSize: 12, fontWeight: "600", flex: 1 },
  submitWrap: { marginTop: 12, borderRadius: 12, overflow: "hidden" },
  submitBtn: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  summaryCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  summaryTitle: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  summaryText: { fontSize: 13, color: "#334155", fontWeight: "600" },
  medicineCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  medicineTitle: { fontSize: 13, fontWeight: "800", color: "#0f172a" },
  notAvailableText: { fontSize: 13, color: "#b91c1c", fontWeight: "700" },
  stockistRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 6,
  },
  stockistName: { fontSize: 13, color: "#334155", fontWeight: "700", flex: 1 },
  stockistPhone: { fontSize: 12, color: "#0369a1", fontWeight: "700" },
});
