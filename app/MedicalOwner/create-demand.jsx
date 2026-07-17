import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import SecureScreen from "../../components/SecureScreen";
import { fetchJson } from "../../config/api";

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getName = (item) =>
  item?.name ||
  item?.title ||
  item?.companyName ||
  item?.contactPerson ||
  item?.medicalName ||
  item?.ownerName ||
  "Unknown";

const resolveId = (item) => item?._id || item?.id || null;

const loadOwnerDetails = async () => {
  const raw = await AsyncStorage.getItem("user").catch(() => null);
  if (!raw) return { id: null, name: "Unknown Medical Owner" };
  const user = JSON.parse(raw);
  const owner = user.user || user;
  return {
    id: resolveId(owner),
    name:
      owner?.medicalName ||
      owner?.fullName ||
      owner?.name ||
      owner?.shopName ||
      owner?.companyName ||
      owner?.email ||
      "Unknown Medical Owner",
  };
};

export default function CreateDemand() {
  const router = useRouter();
  const [medicines, setMedicines] = useState([]);
  const [stockists, setStockists] = useState([]);
  const [stockistQuery, setStockistQuery] = useState("");
  const [selectedStockist, setSelectedStockist] = useState(null);
  const [medicineQuery, setMedicineQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [medRes, stockRes] = await Promise.all([
          fetchJson("/medicine?limit=500"),
          fetchJson("/stockist?limit=1000"),
        ]);

        const medList = Array.isArray(medRes)
          ? medRes
          : Array.isArray(medRes?.data)
            ? medRes.data
            : Array.isArray(medRes?.medicines)
              ? medRes.medicines
              : Array.isArray(medRes?.items)
                ? medRes.items
                : [];

        const stockistList = Array.isArray(stockRes)
          ? stockRes
          : Array.isArray(stockRes?.data)
            ? stockRes.data
            : Array.isArray(stockRes?.stockists)
              ? stockRes.stockists
              : Array.isArray(stockRes?.items)
                ? stockRes.items
                : [];

        if (!active) return;
        setMedicines(medList);
        setStockists(stockistList);
      } catch (err) {
        // ignore load errors; search will gracefully show no results
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const stockistSuggestions = useMemo(() => {
    const query = normalizeText(stockistQuery);
    if (!query) return [];
    return (stockists || [])
      .filter((stockist) => normalizeText(getName(stockist)).includes(query))
      .slice(0, 6);
  }, [stockistQuery, stockists]);

  const medicineSuggestions = useMemo(() => {
    const query = normalizeText(medicineQuery);
    if (!query) return [];
    return (medicines || [])
      .filter((medicine) => normalizeText(getName(medicine)).includes(query))
      .slice(0, 6);
  }, [medicineQuery, medicines]);

  const addMedicine = (medicine) => {
    if (!medicine) return;
    const id = resolveId(medicine);
    const name = getName(medicine);
    setSelectedItems((prev) => {
      if (
        prev.some(
          (item) => item.medicineId === id || item.medicineName === name,
        )
      ) {
        return prev;
      }
      return [
        ...prev,
        {
          medicineId: id,
          medicineName: name,
          quantity: "1",
        },
      ];
    });
    setMedicineQuery("");
  };

  const updateQuantity = (id, quantity) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.medicineId === id
          ? { ...item, quantity: quantity.replace(/[^0-9]/g, "") }
          : item,
      ),
    );
  };

  const removeItem = (id) => {
    setSelectedItems((prev) => prev.filter((item) => item.medicineId !== id));
  };

  const chooseStockist = (stockist) => {
    setSelectedStockist(stockist);
    setStockistQuery("");
  };

  const payloadItems = useMemo(
    () =>
      selectedItems
        .map((item) => ({
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          quantity: Number(item.quantity) || 1,
        }))
        .filter((item) => item.medicineName && item.quantity > 0),
    [selectedItems],
  );

  const sendDemand = async () => {
    if (!selectedStockist) {
      setError("Please select a stockist for this demand.");
      return;
    }
    if (payloadItems.length === 0) {
      setError("Please add at least one medicine to demand.");
      return;
    }
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const owner = await loadOwnerDetails();
      const body = {
        stockistId: resolveId(selectedStockist),
        stockistName: getName(selectedStockist),
        purchaserId: owner.id,
        purchaserName: owner.name,
        items: payloadItems,
      };

      await fetchJson("/api/demand/create", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setSuccessMessage("Demand Sent Successfully");
      setSelectedItems([]);
      setSelectedStockist(null);
      setStockistQuery("");
      setMedicineQuery("");
    } catch (err) {
      setError(err?.message || "Failed to send demand.");
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.headerTitle}>Create Demand</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Select Stockist</Text>
            <TextInput
              value={stockistQuery}
              onChangeText={setStockistQuery}
              placeholder="Search stockist by name"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
            {stockistSuggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                {stockistSuggestions.map((stockist) => (
                  <TouchableOpacity
                    key={resolveId(stockist) || getName(stockist)}
                    onPress={() => chooseStockist(stockist)}
                    style={styles.suggestionRow}
                  >
                    <Text style={styles.suggestionText}>
                      {getName(stockist)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {selectedStockist ? (
              <View style={styles.selectedRow}>
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>Stockist</Text>
                </View>
                <Text style={styles.selectedName}>
                  {getName(selectedStockist)}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedStockist(null)}
                  style={styles.removeBtn}
                >
                  <Feather name="x" size={16} color="#475569" />
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={[styles.sectionLabel, { marginTop: 22 }]}>
              Add Medicines
            </Text>
            <TextInput
              value={medicineQuery}
              onChangeText={setMedicineQuery}
              placeholder="Search medicine by name"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />
            {medicineSuggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                {medicineSuggestions.map((medicine) => (
                  <TouchableOpacity
                    key={resolveId(medicine) || getName(medicine)}
                    onPress={() => addMedicine(medicine)}
                    style={styles.suggestionRow}
                  >
                    <Text style={styles.suggestionText}>
                      {getName(medicine)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {selectedItems.length > 0 ? (
              <View style={styles.itemsList}>
                {selectedItems.map((item) => (
                  <View
                    key={item.medicineId || item.medicineName}
                    style={styles.itemRow}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.medicineName}</Text>
                      <Text style={styles.itemLabel}>Quantity</Text>
                    </View>
                    <TextInput
                      style={styles.quantityInput}
                      value={String(item.quantity)}
                      keyboardType="numeric"
                      onChangeText={(value) =>
                        updateQuantity(item.medicineId, value)
                      }
                    />
                    <TouchableOpacity
                      onPress={() => removeItem(item.medicineId)}
                      style={styles.removeBtnSmall}
                    >
                      <Feather name="trash-2" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Feather name="info" size={18} color="#64748b" />
                <Text style={styles.emptyStateText}>
                  Search and add medicines to your demand list.
                </Text>
              </View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {successMessage ? (
              <View style={styles.successBanner}>
                <Feather name="check-circle" size={16} color="#10b981" />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!selectedStockist || selectedItems.length === 0 || loading) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={sendDemand}
              activeOpacity={0.85}
              disabled={
                !selectedStockist || selectedItems.length === 0 || loading
              }
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send Demand</Text>
              )}
            </TouchableOpacity>
          </View>
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
    fontSize: 18,
    fontWeight: "800",
    color: "#f8fafc",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#0f172a",
    fontSize: 15,
  },
  suggestionsBox: {
    marginTop: 10,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  suggestionRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  suggestionText: {
    color: "#334155",
    fontSize: 15,
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 16,
  },
  selectedBadge: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  selectedBadgeText: {
    color: "#059669",
    fontWeight: "700",
    fontSize: 13,
  },
  selectedName: {
    flex: 1,
    marginLeft: 12,
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 15,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  itemsList: {
    marginTop: 14,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  itemName: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  itemLabel: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
  quantityInput: {
    width: 70,
    marginLeft: 12,
    marginRight: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0f172a",
    textAlign: "center",
  },
  removeBtnSmall: {
    padding: 6,
  },
  emptyState: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyStateText: {
    color: "#475569",
    fontSize: 14,
  },
  errorText: {
    marginTop: 16,
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "600",
  },
  successBanner: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ecfdf5",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  successText: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  sendButton: {
    marginTop: 22,
    backgroundColor: "#0f172a",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.55,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
