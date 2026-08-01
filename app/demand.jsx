import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SecureScreen from "../components/SecureScreen";
import MedicalDisclaimer from "../components/MedicalDisclaimer";
import { apiUrl, fetchJson } from "../config/api";

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

const resolveId = (item) => item?._id || item?.id || null;
const getDisplayName = (item) =>
  String(
    item?.name ||
      item?.companyName ||
      item?.title ||
      item?.contactPerson ||
      item?.medicalName ||
      item?.ownerName ||
      item?.shopName ||
      item?.email ||
      "",
  ).trim() || "Unknown";

export default function Demand() {
  const router = useRouter();
  const [lines, setLines] = useState([{ id: "1", name: "", quantity: "1" }]);
  const [medicines, setMedicines] = useState([]);
  const [stockists, setStockists] = useState([]);
  const [stockistQuery, setStockistQuery] = useState("");
  const [selectedStockist, setSelectedStockist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [focusedLineId, setFocusedLineId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sessionDemand, setSessionDemand] = useState(null);
  const [stockistGroups, setStockistGroups] = useState([]);
  const [groupSendingId, setGroupSendingId] = useState(null);

  const buildStockistGroups = (inventory = [], itemsWithQty = []) => {
    const groups = new Map();

    if (!Array.isArray(inventory)) return [];

    inventory.forEach((inv) => {
      const requestedName = String(
        inv.requestedAs || inv.medicineName || "",
      ).trim();
      const quantity =
        itemsWithQty.find(
          (item) => normalize(item.name) === normalize(requestedName),
        )?.quantity || 1;

      const stockistsForItem = Array.isArray(inv.stockists)
        ? inv.stockists
        : [];
      if (stockistsForItem.length === 0) {
        const key = "unassigned";
        const existing = groups.get(key) || {
          stockistId: key,
          stockist: { name: "Unassigned" },
          medicines: [],
          status: "draft",
        };
        existing.medicines.push({
          medicineName: inv.medicineName || requestedName,
          requestedAs: requestedName,
          quantity,
        });
        groups.set(key, existing);
        return;
      }

      stockistsForItem.forEach((stockist) => {
        const stockistId = resolveId(stockist) || getDisplayName(stockist);
        if (!stockistId) return;
        const existing = groups.get(stockistId) || {
          stockistId,
          stockist,
          medicines: [],
          status: "draft",
        };
        existing.medicines.push({
          medicineName: inv.medicineName || requestedName,
          requestedAs: requestedName,
          quantity,
        });
        groups.set(stockistId, existing);
      });
    });

    return Array.from(groups.values());
  };

  useEffect(() => {
    (async () => {
      try {
        const [medicineRes, stockistRes] = await Promise.all([
          fetch(apiUrl("/medicine?limit=500")),
          fetch(apiUrl("/stockist?limit=1000")),
        ]);

        const medicineData = await medicineRes.json().catch(() => ({}));
        const stockistData = await stockistRes.json().catch(() => ({}));

        if (medicineRes.ok) {
          const list = Array.isArray(medicineData)
            ? medicineData
            : Array.isArray(medicineData?.data)
              ? medicineData.data
              : Array.isArray(medicineData?.data?.medicines)
                ? medicineData.data.medicines
                : Array.isArray(medicineData?.medicines)
                  ? medicineData.medicines
                  : Array.isArray(medicineData?.items)
                    ? medicineData.items
                    : [];
          setMedicines(list);
        }

        if (stockistRes.ok) {
          const stockList = Array.isArray(stockistData)
            ? stockistData
            : Array.isArray(stockistData?.data)
              ? stockistData.data
              : Array.isArray(stockistData?.stockists)
                ? stockistData.stockists
                : Array.isArray(stockistData?.items)
                  ? stockistData.items
                  : [];
          setStockists(stockList);
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
    setLines((prev) => [
      ...prev,
      { id: String(Date.now()), name: "", quantity: "1" },
    ]);

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
      out.push({ name, quantity: Number(l.quantity) || 1 });
    }
    return out;
  }, [lines]);

  const stockistSuggestions = useMemo(() => {
    const query = normalize(stockistQuery);
    if (!query) return [];
    return (stockists || [])
      .filter((stockist) => normalize(getDisplayName(stockist)).includes(query))
      .slice(0, 6);
  }, [stockistQuery, stockists]);

  const chooseStockist = (stockist) => {
    setSelectedStockist(stockist);
    setStockistQuery("");
  };

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

  const [draftDemandId, setDraftDemandId] = useState(null);
  const [sending, setSending] = useState(false);

  const createDemand = async () => {
    if (payloadItems.length === 0) {
      setError("Please enter at least one medicine name.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");
    setSessionDemand(null);
    setDraftDemandId(null);

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

      const demandId =
        data?.data?.originalDemandId ||
        data?.data?._id ||
        data?.data?.id ||
        null;

      setDraftDemandId(demandId);

      const itemsWithQty = payloadItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
      }));

      const inventory = Array.isArray(data?.data?.inventory)
        ? data.data.inventory
        : [];
      const groups = buildStockistGroups(inventory, itemsWithQty);

      setSessionDemand({
        generatedAt: new Date().toISOString(),
        medicalOwner,
        items: itemsWithQty,
        requestedMedicines: inventory,
        medicineStockists: groups,
        originalDemandId: demandId,
        draft: true,
        sent: false,
      });
      setStockistGroups(groups);
    } catch (e) {
      setError(e?.message || "Something went wrong while creating demand.");
    } finally {
      setLoading(false);
    }
  };

  const sendGroupDemand = async (group) => {
    if (!draftDemandId) {
      setError("Please create the demand first before sending.");
      return;
    }
    if (!group?.stockistId || !group?.stockist) {
      setError("Invalid stockist group selected.");
      return;
    }
    setError("");
    setSuccessMessage("");
    setGroupSendingId(group.stockistId);

    const demandId = draftDemandId;
    const endpoints = [
      `/api/demand/${demandId}/send`,
      `/api/demand/${demandId}/dispatch`,
      `/api/demand/${demandId}`,
    ];

    const body = {
      stockistId: group.stockistId,
      stockistName: getDisplayName(group.stockist),
      items: group.medicines.map((item) => ({
        name: item.requestedAs || item.medicineName,
        quantity: item.quantity || 1,
      })),
      status: "sent",
    };

    let lastError = null;

    try {
      for (const endpoint of endpoints) {
        try {
          if (endpoint.endsWith("/send") || endpoint.endsWith("/dispatch")) {
            await fetchJson(endpoint, {
              method: "POST",
              body: JSON.stringify(body),
            });
          } else {
            await fetchJson(endpoint, {
              method: "PATCH",
              body: JSON.stringify(body),
            });
          }
          const updatedGroups = stockistGroups.map((g) =>
            g.stockistId === group.stockistId ? { ...g, status: "sent" } : g,
          );
          setStockistGroups(updatedGroups);
          setSuccessMessage(`Demand sent to ${getDisplayName(group.stockist)}`);
          return;
        } catch (err) {
          lastError = err;
          if ([404, 405].includes(err?.status)) continue;
          throw err;
        }
      }
      throw lastError || new Error("Unable to send demand.");
    } catch (e) {
      setError(e?.message || "Failed to send demand.");
    } finally {
      setGroupSendingId(null);
    }
  };

  const removeStockistGroup = (groupId) => {
    setStockistGroups((prev) =>
      prev.filter((group) => group.stockistId !== groupId),
    );
  };

  return (
    <SecureScreen>
      <SafeAreaView style={styles.safe}>
        <LinearGradient colors={["#0f172a", "#1e293b"]} style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={20} color="#cbd5e1" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Demand</Text>
          <View style={styles.backBtn} />
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <MedicalDisclaimer compact />

          <View style={styles.card}>
            <Text style={styles.label}>Select Stockist</Text>
            <TextInput
              value={
                selectedStockist
                  ? getDisplayName(selectedStockist)
                  : stockistQuery
              }
              onChangeText={(value) => {
                setStockistQuery(value);
                if (selectedStockist) setSelectedStockist(null);
              }}
              placeholder="Search stockist by name"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
            {selectedStockist ? (
              <View style={styles.selectedRow}>
                <Text style={styles.selectedText}>
                  Selected: {getDisplayName(selectedStockist)}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedStockist(null)}
                  style={styles.clearBtn}
                >
                  <Feather name="x" size={16} color="#475569" />
                </TouchableOpacity>
              </View>
            ) : null}
            {stockistSuggestions.length > 0 && !selectedStockist ? (
              <View style={styles.suggestions}>
                {stockistSuggestions.map((stockist, idx) => (
                  <TouchableOpacity
                    key={`${resolveId(stockist) || getDisplayName(stockist)}-${idx}`}
                    style={[
                      styles.suggestionItem,
                      idx === stockistSuggestions.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                    onPress={() => chooseStockist(stockist)}
                  >
                    <Text style={styles.suggestionText}>
                      {getDisplayName(stockist)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <Text style={[styles.label, { marginTop: 16 }]}>Medicines</Text>
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
                      onBlur={() =>
                        setTimeout(() => setFocusedLineId(null), 150)
                      }
                    />
                    <TextInput
                      style={styles.quantityInput}
                      placeholder="Qty"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={String(line.quantity || "")}
                      onChangeText={(value) =>
                        updateLine(line.id, {
                          quantity: value.replace(/[^0-9]/g, ""),
                        })
                      }
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
            {successMessage ? (
              <View style={styles.successRow}>
                <Feather name="check-circle" size={14} color="#0f766e" />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}
            {successMessage ? (
              <TouchableOpacity
                style={styles.viewOrdersLink}
                onPress={() => router.push("/MedicalOwner/demand-history")}
              >
                <Text style={styles.viewOrdersLinkText}>
                  View in My Orders →
                </Text>
              </TouchableOpacity>
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
              {selectedStockist ? (
                <Text style={styles.summaryText}>
                  Selected Stockist: {getDisplayName(selectedStockist)}
                </Text>
              ) : null}

              {stockistGroups.map((group) => (
                <View key={group.stockistId} style={styles.stockistGroupCard}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupTitle} numberOfLines={1}>
                      {getDisplayName(group.stockist)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeStockistGroup(group.stockistId)}
                      style={styles.removeGroupBtn}
                    >
                      <Feather name="x" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  {group.medicines.map((item, idx) => (
                    <View
                      key={`${group.stockistId}-${idx}`}
                      style={styles.groupMedicineRow}
                    >
                      <View style={styles.groupMedicineLabel}>
                        <Text style={styles.medicineTitle}>
                          {item.medicineName}
                        </Text>
                        <Text style={styles.summaryText}>
                          Qty: {item.quantity || 1}
                        </Text>
                      </View>
                    </View>
                  ))}

                  <View style={styles.groupFooter}>
                    <View
                      style={[
                        styles.statusBadge,
                        group.status === "sent"
                          ? styles.statusBadgeSent
                          : styles.statusBadgeDraft,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          group.status === "sent"
                            ? styles.statusBadgeTextSent
                            : styles.statusBadgeTextDraft,
                        ]}
                      >
                        {group.status === "sent" ? "Sent" : "Draft"}
                      </Text>
                    </View>
                    {group.status !== "sent" ? (
                      <TouchableOpacity
                        onPress={() => sendGroupDemand(group)}
                        disabled={groupSendingId === group.stockistId}
                        style={[
                          styles.groupSendBtn,
                          groupSendingId === group.stockistId && {
                            opacity: 0.55,
                          },
                        ]}
                      >
                        {groupSendingId === group.stockistId ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.groupSendText}>Send</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </SecureScreen>
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
  quantityInput: {
    width: 76,
    marginLeft: 10,
    paddingVertical: Platform.OS === "web" ? 10 : 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#fff",
    color: "#0f172a",
    textAlign: "center",
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  selectedText: { color: "#334155", fontSize: 13, fontWeight: "600", flex: 1 },
  clearBtn: {
    marginLeft: 10,
    padding: 6,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
  },
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
  successRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#6ee7b7",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  successText: { color: "#0f766e", fontSize: 12, fontWeight: "600", flex: 1 },
  viewOrdersLink: { marginTop: 6, alignItems: "center", paddingVertical: 4 },
  viewOrdersLinkText: { color: "#0891b2", fontSize: 13, fontWeight: "700" },
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
  stockistGroupCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    backgroundColor: "#fafafa",
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  groupTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
    marginRight: 8,
  },
  removeGroupBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },
  groupMedicineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  groupMedicineLabel: {
    flex: 1,
  },
  groupFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  groupSendBtn: {
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 92,
    alignItems: "center",
  },
  groupSendText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  statusBadgeDraft: {
    backgroundColor: "#e2e8f0",
  },
  statusBadgeSent: {
    backgroundColor: "#d1fae5",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadgeTextDraft: {
    color: "#475569",
  },
  statusBadgeTextSent: {
    color: "#047857",
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
