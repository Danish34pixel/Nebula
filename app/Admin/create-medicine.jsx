import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Image,
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

export default function AdminCreateMedicine() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", company: "", stockists: [] });
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [stockistsList, setStockistsList] = useState([]);
  const [companySearch, setCompanySearch] = useState("");
  const [stockistSearch, setStockistSearch] = useState("");
  const [fetchingData, setFetchingData] = useState(true);

  // Use central helpers for API calls
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [jsonC, jsonS] = await Promise.all([
          requestJson("/api/company"),
          requestJson("/api/stockist"),
        ]);

        if (mounted) {
          setCompanies(jsonC.data || []);
          setStockistsList(jsonS.data || []);
        }
      } catch (e) {
        console.warn("[AdminCreateMedicine] Failed to load data:", e.message);
      } finally {
        if (mounted) setFetchingData(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Optimized filtering
  const filteredCompanies = useMemo(() => {
    const q = companySearch.toLowerCase();
    return companies.filter((c) => 
      (c.name || "").toLowerCase().includes(q) || 
      (c.email || "").toLowerCase().includes(q)
    );
  }, [companies, companySearch]);

  const filteredStockists = useMemo(() => {
    const q = stockistSearch.toLowerCase();
    return stockistsList.filter((s) => 
      (s.name || "").toLowerCase().includes(q) || 
      (s.email || "").toLowerCase().includes(q) || 
      (s.location || "").toLowerCase().includes(q)
    );
  }, [stockistsList, stockistSearch]);

  const setField = (path, value) => {
    setForm((f) => ({ ...f, [path]: value }));
  };

  const toggleStockist = (id) => {
    setForm((f) => ({
      ...f,
      stockists: f.stockists.includes(id)
        ? f.stockists.filter((s) => s !== id)
        : [...f.stockists, id],
    }));
  };

  const selectAllFilteredStockists = () => {
    const filteredIds = filteredStockists.map(s => s._id);
    setForm(f => ({
      ...f,
      stockists: [...new Set([...f.stockists, ...filteredIds])]
    }));
  };

  const clearAllStockists = () => {
    setForm(f => ({ ...f, stockists: [] }));
  };

  const submit = async () => {
    if (!form.name.trim()) return Alert.alert("Error", "Enter medicine name");
    if (!form.company) return Alert.alert("Error", "Select a company");

    setLoading(true);
    try {
      await postJson("/api/medicine/quick", form);
      Alert.alert("Success", "Medicine created", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to create medicine");
    } finally {
      setLoading(false);
    }
  };

  const CompanyCard = ({ company }) => {
    const isSelected = form.company === company._id;
    return (
      <TouchableOpacity
        onPress={() => setField("company", company._id)}
        style={[styles.miniCard, isSelected ? styles.miniCardSelected : null]}
      >
        <LinearGradient
          colors={isSelected ? ["#6366f1", "#4f46e5"] : ["#f1f5f9", "#f1f5f9"]}
          style={styles.miniIconBox}
        >
          <Feather name="briefcase" size={16} color={isSelected ? "#fff" : "#6366f1"} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.miniTitle, isSelected ? styles.textWhite : null]}>{company.name}</Text>
          <Text style={[styles.miniSub, isSelected ? { color: "rgba(255,255,255,0.7)" } : null]}>{company.email}</Text>
        </View>
        {isSelected ? <Feather name="check-circle" size={18} color="#fff" /> : null}
      </TouchableOpacity>
    );
  };

  const StockistCard = ({ stockist }) => {
    const isSelected = form.stockists.includes(stockist._id);
    return (
      <TouchableOpacity
        onPress={() => toggleStockist(stockist._id)}
        style={[styles.miniCard, isSelected ? styles.miniCardSelectedGreen : null]}
      >
        <LinearGradient
          colors={isSelected ? ["#10b981", "#059669"] : ["#f1f5f9", "#f1f5f9"]}
          style={styles.miniIconBox}
        >
          <Feather name="box" size={16} color={isSelected ? "#fff" : "#10b981"} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.miniTitle, isSelected ? styles.textWhite : null]}>{stockist.name}</Text>
          <Text style={[styles.miniSub, isSelected ? { color: "rgba(255,255,255,0.7)" } : null]}>{stockist.location}</Text>
        </View>
        {isSelected ? <Feather name="check" size={18} color="#fff" /> : null}
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
          <LinearGradient colors={["#f8fafc", "#e2e8f0", "#cbd5e1"]} style={{ flex: 1 }} />
          <View style={[styles.blurCircle, { top: height * 0.1, left: -50 }]} />
          <View style={[styles.blurCircle, { bottom: height * 0.1, right: -50, backgroundColor: "#818cf822" }]} />
        </View>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Medicine</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.mainBox}>
            <View style={styles.formHeader}>
              <Image source={require("../../assets/images/final-logo.png")} style={styles.logo} resizeMode="contain" />
              <Text style={styles.mainTitle}>Add New Medicine</Text>
              <Text style={styles.mainSub}>Register medicine with company and stockist Assignments</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
               <View style={styles.sectionLabelRow}>
                 <Feather name="activity" size={20} color="#3b82f6" />
                 <Text style={styles.sectionLabel}>Medicine Details</Text>
               </View>
               <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>MEDICINE NAME</Text>
                  <TextInput
                    style={styles.input}
                    value={form.name}
                    onChangeText={(v) => setField("name", v)}
                    placeholder="Enter medicine name"
                    placeholderTextColor="#94a3b8"
                  />
               </View>
            </View>

            <View style={styles.section}>
               <View style={styles.sectionLabelRow}>
                 <Feather name="briefcase" size={20} color="#6366f1" />
                 <Text style={styles.sectionLabel}>Company Assignment</Text>
               </View>
               
               <View style={styles.searchContainer}>
                  <View style={styles.searchBox}>
                    <Feather name="search" size={16} color="#94a3b8" />
                    <TextInput
                      style={styles.searchInput}
                      value={companySearch}
                      onChangeText={setCompanySearch}
                      placeholder="Find company..."
                      placeholderTextColor="#cbd5e1"
                    />
                    {companySearch.length > 0 ? (
                      <TouchableOpacity onPress={() => setCompanySearch("")}>
                        <Feather name="x" size={16} color="#94a3b8" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
               </View>

               <View style={styles.listWrapper}>
                  {fetchingData ? (
                    <ActivityIndicator color="#6366f1" style={{ marginVertical: 30 }} />
                  ) : filteredCompanies.length === 0 ? (
                    <EmptyState icon="frown" text="No companies found" color="#6366f1" />
                  ) : (
                    <View style={styles.grid}>
                      {filteredCompanies.map((c) => <CompanyCard key={c._id} company={c} />)}
                    </View>
                  )}
               </View>
            </View>

            <View style={[styles.section, { marginBottom: 30 }]}>
               <View style={styles.sectionLabelRow}>
                 <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                   <Feather name="users" size={20} color="#10b981" />
                   <Text style={[styles.sectionLabel, { marginLeft: 10 }]}>Assign Stockists</Text>
                 </View>
                 <View style={styles.actionLinks}>
                    <TouchableOpacity onPress={selectAllFilteredStockists}>
                      <Text style={styles.actionText}>Select All</Text>
                    </TouchableOpacity>
                    <View style={styles.miniDot} />
                    <TouchableOpacity onPress={clearAllStockists}>
                      <Text style={[styles.actionText, { color: "#ef4444" }]}>Clear</Text>
                    </TouchableOpacity>
                 </View>
               </View>
               
               <View style={styles.searchContainer}>
                  <View style={styles.searchBox}>
                    <Feather name="search" size={16} color="#94a3b8" />
                    <TextInput
                      style={styles.searchInput}
                      value={stockistSearch}
                      onChangeText={setStockistSearch}
                      placeholder="Search available stockists..."
                      placeholderTextColor="#cbd5e1"
                    />
                    {stockistSearch.length > 0 ? (
                      <TouchableOpacity onPress={() => setStockistSearch("")}>
                        <Feather name="x" size={16} color="#94a3b8" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
               </View>

               <View style={styles.listWrapper}>
                  {fetchingData ? (
                    <ActivityIndicator color="#10b981" style={{ marginVertical: 30 }} />
                  ) : filteredStockists.length === 0 ? (
                    <EmptyState icon="box" text="No stockists found" color="#10b981" />
                  ) : (
                    <View style={styles.grid}>
                      {filteredStockists.map((s) => <StockistCard key={s._id} stockist={s} />)}
                    </View>
                  )}
               </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading ? styles.disabledBtn : null]}
              onPress={submit}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ["#94a3b8", "#64748b"] : ["#3b82f6", "#4f46e5", "#3b82f6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>CREATE MEDICINE</Text>
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
  safeArea: { flex: 1, backgroundColor: "#f1f5f9" },
  container: { flex: 1 },
  blurCircle: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#3b82f618",
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
  scrollContent: { padding: 16, paddingBottom: 100 },
  mainBox: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 40,
    padding: 24,
    borderWidth: 1,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 8,
  },
  formHeader: { alignItems: "center", marginBottom: 30 },
  logo: { width: 120, height: 70, marginBottom: 16 },
  mainTitle: { fontSize: 28, fontWeight: "900", color: "#0f172a", letterSpacing: -1 },
  mainSub: { fontSize: 14, color: "#64748b", fontWeight: "500", textAlign: "center", marginTop: 6, lineHeight: 20 },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 24 },
  section: { marginBottom: 28 },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  sectionLabel: { fontSize: 17, fontWeight: "800", color: "#334155" },
  actionLinks: { flexDirection: 'row', alignItems: 'center' },
  actionText: { fontSize: 13, fontWeight: "700", color: "#6366f1", marginRight: 12 },
  miniDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#cbd5e1" },
  inputGroup: { backgroundColor: "#f8fafc", padding: 18, borderRadius: 24, borderWidth: 1, borderColor: "#e2e8f0" },
  fieldLabel: { fontSize: 11, fontWeight: "900", color: "#94a3b8", marginBottom: 10, letterSpacing: 1 },
  input: { fontSize: 17, color: "#0f172a", fontWeight: "700" },
  searchContainer: { marginBottom: 14 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1e293b" },
  listWrapper: { paddingVertical: 2 },
  grid: { },
  miniCard: {
    marginVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  miniCardSelected: { backgroundColor: "#4f46e5", borderColor: "#4338ca", elevation: 4 },
  miniCardSelectedGreen: { backgroundColor: "#10b981", borderColor: "#059669", elevation: 4 },
  miniIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 14 },
  miniTitle: { fontSize: 15, fontWeight: "800", color: "#1e293b" },
  miniSub: { fontSize: 11, fontWeight: "600", color: "#64748b", marginTop: 2 },
  textWhite: { color: "#fff" },
  emptyContainer: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 14, fontWeight: "700", textAlign: "center", marginTop: 10 },
  submitBtn: { marginTop: 10, borderRadius: 22, overflow: "hidden", elevation: 8, shadowColor: "#3b82f6", shadowOpacity: 0.3, shadowRadius: 15 },
  submitGradient: { paddingVertical: 20, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontSize: 17, fontWeight: "900", letterSpacing: 2 },
  disabledBtn: { opacity: 0.6 },
});
