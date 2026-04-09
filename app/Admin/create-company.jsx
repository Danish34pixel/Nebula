import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl, fetchJson, requestJson, postJson } from "../../config/api";

const { width, height } = Dimensions.get("window");

// Memoized helper for empty states
const EmptyState = ({ icon, text, color = "#94a3b8" }) => (
  <View style={styles.emptyContainer}>
    <Feather name={icon} size={40} color={`${color}44`} />
    <Text style={[styles.emptyText, { color }]}>{text}</Text>
  </View>
);

export default function AdminCreateCompany() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", stockists: [] });
  const [loading, setLoading] = useState(false);
  const [stockistsList, setStockistsList] = useState([]);
  const [stockistsLoading, setStockistsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const json = await requestJson("/api/stockist");
        if (mounted) setStockistsList(json.data || []);
      } catch (err) {
        console.warn("[AdminCreateCompany] Failed to load stockists:", err.message);
      } finally {
        if (mounted) setStockistsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const toggleStockist = (id) => {
    setForm((f) => ({
      ...f,
      stockists: f.stockists.includes(id)
        ? f.stockists.filter((s) => s !== id)
        : [...f.stockists, id],
    }));
  };

  const filteredStockists = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return stockistsList.filter((s) => 
      (s.name || "").toLowerCase().includes(q) || 
      (s.email || "").toLowerCase().includes(q) || 
      (s.location || "").toLowerCase().includes(q)
    );
  }, [stockistsList, searchQuery]);

  const selectAllFiltered = () => {
    const filteredIds = filteredStockists.map(s => s._id);
    setForm(f => ({
      ...f,
      stockists: [...new Set([...f.stockists, ...filteredIds])]
    }));
  };

  const clearAll = () => {
    setForm(f => ({ ...f, stockists: [] }));
  };

  const submit = async () => {
    if (!form.name.trim()) {
      Alert.alert("Error", "Please enter a company name");
      return;
    }

    setLoading(true);
    try {
      await postJson("/api/company", {
        name: form.name.trim(),
        stockists: form.stockists,
      });

      Alert.alert("Success", "Company created successfully", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  const StockistCard = ({ stockist }) => {
    const isSelected = form.stockists.includes(stockist._id);
    return (
      <TouchableOpacity
        onPress={() => toggleStockist(stockist._id)}
        style={[styles.stockistCard, isSelected ? styles.stockistCardSelected : null]}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isSelected ? ["#0d9488", "#0f766e"] : ["#f8fafc", "#f8fafc"]}
          style={styles.iconBox}
        >
          <Feather name="box" size={20} color={isSelected ? "#fff" : "#14b8a6"} />
        </LinearGradient>
        
        <View style={styles.stockistInfo}>
          <Text style={[styles.stockistName, isSelected ? styles.textWhite : null]}>
            {stockist.name}
          </Text>
          <Text style={[styles.stockistSub, isSelected ? { color: 'rgba(255,255,255,0.7)' } : null]}>{stockist.email}</Text>
          <Text style={[styles.stockistLoc, isSelected ? { color: 'rgba(255,255,255,0.6)' } : null]}>📍 {stockist.location}</Text>
        </View>

        <View style={[styles.checkbox, isSelected ? styles.checkboxSelected : null]}>
          <Feather name={isSelected ? "check" : "circle"} size={14} color={isSelected ? "#0d9488" : "#cbd5e1"} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={StyleSheet.absoluteFill}>
          <View style={[styles.blurCircle, { top: height * 0.1, right: -50 }]} />
          <View style={[styles.blurCircle, { bottom: height * 0.1, left: -50, backgroundColor: "#0d948811" }]} />
        </View>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={28} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Establish Company</Text>
          <View style={{ width: 42 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <LinearGradient 
            colors={["#0d9488", "#14b8a6", "#0d9488"]} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.welcomeCard}
          >
            <View style={styles.welcomeInfo}>
              <View>
                <Text style={styles.welcomeTitle}>Meditrap Admin</Text>
                <Text style={styles.welcomeSub}>New Company Registration</Text>
              </View>
              <View style={styles.welcomeIconBox}>
                <Feather name="layers" size={26} color="#fff" />
              </View>
            </View>
            <View style={styles.verifiedRow}>
              <View style={styles.shieldPulse}>
                <Feather name="shield" size={14} color="#fff" />
              </View>
              <Text style={styles.verifiedText}>Secure Cloud Infrastructure Enabled</Text>
            </View>
          </LinearGradient>

          <View style={styles.mainBox}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconBox, { backgroundColor: "#fff7ed" }]}>
                  <Feather name="briefcase" size={18} color="#f97316" />
                </View>
                <Text style={styles.sectionTitle}>Identity Details</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>LEGAL COMPANY NAME *</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                  placeholder="e.g. Medico Global"
                  placeholderTextColor="#cbd5e1"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconBox, { backgroundColor: "#f0fdfa" }]}>
                  <Feather name="users" size={18} color="#0d9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>Partner Stockists</Text>
                  <Text style={styles.sectionSub}>Link partners to this company</Text>
                </View>
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedCountText}>{form.stockists.length}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                 <TouchableOpacity onPress={selectAllFiltered} style={styles.actionBtn}>
                   <Text style={styles.actionBtnText}>Select All</Text>
                 </TouchableOpacity>
                 <View style={styles.actionDot} />
                 <TouchableOpacity onPress={clearAll} style={styles.actionBtn}>
                   <Text style={[styles.actionBtnText, { color: "#ef4444" }]}>Clear All</Text>
                 </TouchableOpacity>
              </View>

              <View style={styles.searchBox}>
                <Feather name="search" size={18} color="#94a3b8" />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Find partner..."
                  placeholderTextColor="#cbd5e1"
                />
                {searchQuery.length > 0 ? (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Feather name="x" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.stockistWrapper}>
                {stockistsLoading ? (
                  <ActivityIndicator color="#0d9488" style={{ marginVertical: 30 }} />
                ) : filteredStockists.length === 0 ? (
                  <EmptyState icon="users" text="No stockists found" color="#0d9488" />
                ) : (
                  <View style={styles.grid}>
                    {filteredStockists.map((s) => (
                      <StockistCard key={s._id} stockist={s} />
                    ))}
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading ? styles.submitBtnDisabled : null]}
              onPress={submit}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ["#94a3b8", "#64748b"] : ["#0d9488", "#14b8a6"]}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.submitText}>REGISTERING...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitText}>CREATE COMPANY</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  container: { flex: 1 },
  blurCircle: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#14b8a614",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#64748b",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1e293b", letterSpacing: -0.5 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  welcomeCard: {
    borderRadius: 32,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#0d9488",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  welcomeInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  welcomeTitle: { fontSize: 26, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  welcomeSub: { fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: "500" },
  welcomeIconBox: { backgroundColor: "rgba(255,255,255,0.25)", padding: 12, borderRadius: 18 },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  shieldPulse: { backgroundColor: "rgba(255,255,255,0.15)", padding: 6, borderRadius: 10 },
  verifiedText: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  mainBox: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 40,
    padding: 24,
    borderWidth: 1,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 12,
  },
  section: { marginBottom: 24, width: '100%' },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  sectionIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  sectionSub: { fontSize: 13, color: "#64748b", fontWeight: "500", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 24 },
  inputGroup: { width: '100%' },
  label: { fontSize: 11, fontWeight: "900", color: "#94a3b8", marginBottom: 10, letterSpacing: 1.2 },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  selectedBadge: { backgroundColor: "#f0fdfa", width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  selectedCountText: { fontSize: 13, color: "#0d9488", fontWeight: "800" },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  actionBtn: { paddingVertical: 4, marginRight: 12 },
  actionBtnText: { fontSize: 13, fontWeight: "800", color: "#0d9488" },
  actionDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#cbd5e1" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1e293b" },
  stockistWrapper: { width: '100%' },
  grid: { },
  stockistCard: {
    marginVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderRadius: 24,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  stockistCardSelected: { borderColor: "#14b8a6", backgroundColor: "#0d9488" },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: "center", alignItems: "center", marginRight: 14 },
  stockistInfo: { flex: 1 },
  stockistName: { fontSize: 15, fontWeight: "800", color: "#1e293b" },
  stockistSub: { fontSize: 12, color: "#64748b", fontWeight: "500", marginTop: 2 },
  stockistLoc: { fontSize: 11, color: "#94a3b8", fontWeight: "600", marginTop: 4 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: { backgroundColor: "#fff" },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, fontWeight: "700", textAlign: "center", marginTop: 12 },
  textWhite: { color: "#fff" },
  submitBtn: { borderRadius: 24, overflow: "hidden", marginTop: 10, elevation: 8, shadowColor: "#0d9488", shadowOpacity: 0.25, shadowRadius: 15 },
  submitGradient: { paddingVertical: 20, alignItems: "center" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  submitText: { color: "#fff", fontSize: 17, fontWeight: "900", letterSpacing: 1.5 },
  submitBtnDisabled: { opacity: 0.7 },
});
