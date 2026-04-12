import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl } from "../../config/api";
import { secureStorage } from "../../utils/secureStore";

export default function PurchaserDashboard() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [purchaser, setPurchaser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("card"); // 'card' | 'medical'
  const [medicines, setMedicines] = useState([]);
  const [medSearch, setMedSearch] = useState("");
  const [medLoading, setMedLoading] = useState(false);

  useEffect(() => {
    const fetchPurchaser = async () => {
      setLoading(true);
      try {
        const token = await secureStorage.getItem("token");
        const headers = {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const res = await fetch(apiUrl(`/api/purchaser/${id}`), { headers });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to fetch details");
        setPurchaser(json.data || json);
      } catch (err) {
        setError(err.message || "Failed to fetch purchaser details");
      } finally {
        setLoading(false);
      }
    };
    fetchPurchaser();
  }, [id]);

  useEffect(() => {
    if (activeTab !== "medical") return;
    const fetchMedicines = async () => {
      setMedLoading(true);
      try {
        const token = await secureStorage.getItem("token");
        const headers = {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const res = await fetch(apiUrl("/api/medicine"), { headers });
        const json = await res.json();
        const nextMedicines = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
          ? json
          : [];
        setMedicines(nextMedicines);
      } catch (e) {
        console.warn("Failed to load medicines", e.message);
        setMedicines([]);
      } finally {
        setMedLoading(false);
      }
    };
    fetchMedicines();
  }, [activeTab]);

  const handleLogout = async () => {
    await secureStorage.multiRemove(["token", "refreshToken", "user", "pendingPurchaserId", "pendingPurchasingRequestId"]);
    router.replace("/Purchaser/purchaser-login");
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return apiUrl(path.startsWith("/") ? path : `/${path}`);
  };

  const medicinesList = Array.isArray(medicines) ? medicines : [];
  const filteredMedicines = medicinesList.filter((m) => {
    const q = medSearch.trim().toLowerCase();
    if (!q) return true;

    // Collect all searchable text from the medicine document
    const tokens = [];
    const extract = (val) => {
      if (!val) return;
      if (typeof val === "string") { tokens.push(val.toLowerCase()); return; }
      if (typeof val === "number") { tokens.push(String(val)); return; }
      if (Array.isArray(val)) { val.forEach(extract); return; }
      if (typeof val === "object") { Object.values(val).forEach(extract); }
    };
    extract(m);

    return tokens.some((t) => t.includes(q));
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Feather name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!purchaser) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No details found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Bar */}
      <LinearGradient colors={["#1d4ed8", "#1e3a8a"]} style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.avatarSmall}>
            {purchaser.photo ? (
              <Image source={{ uri: getImageUrl(purchaser.photo) }} style={styles.avatarImg} />
            ) : (
              <Feather name="user" size={18} color="#fff" />
            )}
          </View>
          <View>
            <Text style={styles.topBarName}>{purchaser.fullName}</Text>
            <Text style={styles.topBarRole}>Authorized Purchaser</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Feather name="log-out" size={18} color="#bfdbfe" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "card" ? styles.tabActive : null]}
          onPress={() => setActiveTab("card")}
        >
          <Feather name="credit-card" size={16} color={activeTab === "card" ? "#1d4ed8" : "#94a3b8"} />
          <Text style={[styles.tabLabel, activeTab === "card" ? styles.tabLabelActive : null]}>
            My Card
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "medical" ? styles.tabActive : null]}
          onPress={() => setActiveTab("medical")}
        >
          <Feather name="activity" size={16} color={activeTab === "medical" ? "#1d4ed8" : "#94a3b8"} />
          <Text style={[styles.tabLabel, activeTab === "medical" ? styles.tabLabelActive : null]}>
            Medical
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── TAB: ID CARD ── */}
      {activeTab === "card" ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.idCard}>
            {/* Header */}
            <LinearGradient colors={["#1d4ed8", "#1e3a8a", "#312e81"]} style={styles.cardHeader}>
              <View style={styles.headerDecoration}>
                <View style={styles.decoCircle1} />
                <View style={styles.decoCircle2} />
              </View>
              <View style={styles.headerContent}>
                <View>
                  <Text style={styles.headerTitle}>PURCHASER ID CARD</Text>
                  <Text style={styles.headerSubtitle}>Authorized Purchaser</Text>
                </View>
                <View style={styles.idBadge}>
                  <Text style={styles.idBadgeText}>ID: {id?.slice(-8).toUpperCase()}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Card Body */}
            <View style={styles.cardBody}>
              <View style={styles.mainRow}>
                {/* Photo */}
                <View style={styles.photoContainer}>
                  <View style={styles.photoFrame}>
                    {purchaser.photo ? (
                      <Image
                        source={{ uri: getImageUrl(purchaser.photo) }}
                        style={styles.photo}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Feather name="user" size={48} color="#94a3b8" />
                      </View>
                    )}
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
                    </View>
                  </View>
                  <View style={styles.signatureLine} />
                  <Text style={styles.signatureLabel}>Signature</Text>
                </View>

                {/* Info */}
                <View style={styles.infoSection}>
                  <View style={styles.fieldBox}>
                    <Text style={styles.fieldLabel}>FULL NAME</Text>
                    <Text style={styles.fullName}>{purchaser.fullName}</Text>
                  </View>
                  <View style={styles.fieldBox}>
                    <Text style={styles.fieldLabel}>CONTACT NUMBER</Text>
                    <View style={styles.contactRow}>
                      <Feather name="phone-call" size={14} color="#2563eb" />
                      <Text style={styles.contactText}>{purchaser.contactNo}</Text>
                    </View>
                  </View>
                  <View style={styles.fieldBox}>
                    <Text style={styles.fieldLabel}>ID NUMBER</Text>
                    <Text style={styles.monoId}>{purchaser._id}</Text>
                  </View>
                </View>
              </View>

              {/* Address */}
              <View style={styles.addressBox}>
                <Text style={styles.fieldLabel}>REGISTERED ADDRESS</Text>
                <View style={styles.addressRow}>
                  <Feather name="map-pin" size={16} color="#2563eb" />
                  <Text style={styles.addressText}>{purchaser.address}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Aadhar Section */}
              <View style={styles.govSection}>
                <View style={styles.govHeader}>
                  <Feather name="shield" size={18} color="#1e293b" />
                  <Text style={styles.govTitle}>GOVERNMENT ID VERIFICATION</Text>
                </View>
                {purchaser.aadharImage ? (
                  <View style={styles.aadharFrame}>
                    <Image
                      source={{ uri: getImageUrl(purchaser.aadharImage) }}
                      style={styles.aadharImage}
                      resizeMode="contain"
                    />
                    <View style={styles.aadharFooter}>
                      <Text style={styles.aadharLabel}>Aadhar Card (Verified)</Text>
                      <View style={styles.verifiedTag}>
                        <Feather name="check" size={12} color="#065f46" />
                        <Text style={styles.verifiedTagText}>Verified</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noGovId}>
                    <Feather name="file-text" size={32} color="#94a3b8" />
                    <Text style={styles.noGovIdText}>No Government ID Uploaded</Text>
                  </View>
                )}
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <View>
                  <Text style={styles.footerLabel}>Issue Date</Text>
                  <Text style={styles.footerValue}>{new Date().toLocaleDateString("en-IN")}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.footerLabel}>Valid Until</Text>
                  <Text style={styles.footerValue}>Permanent</Text>
                </View>
              </View>
              <Text style={styles.officialFootnote}>This is an official purchaser identification card</Text>
            </View>
            <LinearGradient
              colors={["#60a5fa", "#a855f7", "#ec4899", "#60a5fa"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.hologram}
            />
          </View>
        </ScrollView>
      ) : null}

      {/* ── TAB: MEDICAL DASHBOARD ── */}
      {activeTab === "medical" ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Summary Cards */}
          <View style={styles.statsRow}>
            <LinearGradient colors={["#1d4ed8", "#2563eb"]} style={styles.statCard}>
              <Feather name="package" size={22} color="#bfdbfe" />
              <Text style={styles.statValue}>{medicines.length}</Text>
              <Text style={styles.statLabel}>Medicines</Text>
            </LinearGradient>
            <LinearGradient colors={["#0d9488", "#0f766e"]} style={styles.statCard}>
              <Feather name="check-circle" size={22} color="#99f6e4" />
              <Text style={styles.statValue}>Active</Text>
              <Text style={styles.statLabel}>Card Status</Text>
            </LinearGradient>
            <LinearGradient colors={["#7c3aed", "#6d28d9"]} style={styles.statCard}>
              <Feather name="users" size={22} color="#ddd6fe" />
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>Stockists</Text>
            </LinearGradient>
          </View>

          {/* Medicine Search */}
          <View style={styles.sectionHeader}>
            <Feather name="search" size={18} color="#1d4ed8" />
            <Text style={styles.sectionTitle}>Search Medicines</Text>
          </View>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              value={medSearch}
              onChangeText={setMedSearch}
              placeholder="Search by name or company..."
              placeholderTextColor="#9ca3af"
            />
            {medSearch.length > 0 ? (
              <TouchableOpacity onPress={() => setMedSearch("")}>
                <Feather name="x" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {medLoading ? (
            <ActivityIndicator color="#1d4ed8" style={{ marginTop: 32 }} />
          ) : filteredMedicines.length === 0 ? (
            <View style={styles.emptyMed}>
              <Feather name="inbox" size={40} color="#cbd5e1" />
              <Text style={styles.emptyMedText}>
                {medSearch ? "No medicines match your search" : "No medicines available"}
              </Text>
            </View>
          ) : (
            filteredMedicines.map((m, idx) => (
              <View key={m._id || idx} style={styles.medCard}>
                <View style={styles.medIconBox}>
                  <Feather name="box" size={20} color="#1d4ed8" />
                </View>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{m.name}</Text>
                  <Text style={styles.medCompany}>
                    {m.company?.name || m.company || "Unknown Company"}
                  </Text>
                </View>
                <View style={styles.medBadge}>
                  <Text style={styles.medBadgeText}>Available</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f1f5f9" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  loadingText: { marginTop: 12, color: "#0284c7", fontWeight: "600" },
  errorText: { marginTop: 12, color: "#ef4444", textAlign: "center", fontSize: 16 },
  emptyText: { color: "#94a3b8", fontSize: 16 },
  retryBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: "#3b82f6", borderRadius: 12 },
  retryText: { color: "#fff", fontWeight: "bold" },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 40, height: 40 },
  topBarName: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  topBarRole: { color: "#bfdbfe", fontSize: 11, fontWeight: "500" },
  logoutBtn: { padding: 8 },

  // Tabs
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#1d4ed8" },
  tabLabel: { fontSize: 14, fontWeight: "600", color: "#94a3b8" },
  tabLabelActive: { color: "#1d4ed8" },

  // ID Card
  idCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: { paddingHorizontal: 24, paddingVertical: 20, position: "relative" },
  headerDecoration: { ...StyleSheet.absoluteFillObject, opacity: 0.1, overflow: "hidden" },
  decoCircle1: { width: 150, height: 150, borderRadius: 75, borderWidth: 20, borderColor: "#fff", position: "absolute", top: -50, left: -50 },
  decoCircle2: { width: 100, height: 100, borderRadius: 50, borderWidth: 15, borderColor: "#fff", position: "absolute", bottom: -30, right: -20 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#fff", letterSpacing: 1 },
  headerSubtitle: { fontSize: 11, color: "#bfdbfe", fontWeight: "600", marginTop: 2 },
  idBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  idBadgeText: { color: "#fff", fontSize: 12, fontWeight: "bold", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  cardBody: { padding: 20 },
  mainRow: { flexDirection: "row", gap: 16 },
  photoContainer: { alignItems: "center" },
  photoFrame: { width: 110, height: 140, borderRadius: 12, backgroundColor: "#f8fafc", borderWidth: 3, borderColor: "#e2e8f0", overflow: "hidden" },
  photo: { width: "100%", height: "100%" },
  photoPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  verifiedBadge: { position: "absolute", bottom: -8, right: -8, backgroundColor: "#22c55e", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 2, borderColor: "#fff" },
  verifiedBadgeText: { color: "#fff", fontSize: 7, fontWeight: "bold" },
  signatureLine: { width: 80, height: 2, backgroundColor: "#1e293b", marginTop: 12 },
  signatureLabel: { fontSize: 10, color: "#64748b", marginTop: 4, fontWeight: "600" },
  infoSection: { flex: 1, gap: 12 },
  fieldBox: { borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 8 },
  fieldLabel: { fontSize: 9, fontWeight: "800", color: "#64748b", marginBottom: 4, letterSpacing: 0.5 },
  fullName: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f8fafc", padding: 8, borderRadius: 8 },
  contactText: { fontSize: 14, fontWeight: "bold", color: "#1e293b" },
  monoId: { fontSize: 10, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", color: "#475569", fontWeight: "600" },
  addressBox: { marginTop: 20, gap: 8 },
  addressRow: { flexDirection: "row", gap: 8, backgroundColor: "#f8fafc", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#f1f5f9" },
  addressText: { flex: 1, fontSize: 13, color: "#334155", lineHeight: 20, fontWeight: "500" },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 20 },
  govSection: { gap: 14 },
  govHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  govTitle: { fontSize: 13, fontWeight: "800", color: "#1e293b", letterSpacing: 0.5 },
  aadharFrame: { backgroundColor: "#f8fafc", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  aadharImage: { width: "100%", height: 180, borderRadius: 8, backgroundColor: "#fff" },
  aadharFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  aadharLabel: { fontSize: 12, fontWeight: "700", color: "#475569" },
  verifiedTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#dcfce7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  verifiedTagText: { color: "#065f46", fontSize: 10, fontWeight: "bold" },
  noGovId: { padding: 28, alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 16, borderStyle: "dashed", borderWidth: 2, borderColor: "#cbd5e1" },
  noGovIdText: { marginTop: 8, color: "#94a3b8", fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 28, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  footerLabel: { fontSize: 9, color: "#94a3b8", fontWeight: "700", marginBottom: 2 },
  footerValue: { fontSize: 12, fontWeight: "bold", color: "#64748b" },
  officialFootnote: { textAlign: "center", fontSize: 10, color: "#94a3b8", marginTop: 14 },
  hologram: { height: 6, width: "100%" },

  // Medical Dashboard
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1f2937" },
  emptyMed: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyMedText: { color: "#94a3b8", fontSize: 15, fontWeight: "600", textAlign: "center" },
  medCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  medIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  medInfo: { flex: 1 },
  medName: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  medCompany: { fontSize: 12, color: "#64748b", marginTop: 2 },
  medBadge: { backgroundColor: "#dcfce7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  medBadgeText: { color: "#15803d", fontSize: 11, fontWeight: "700" },
});
