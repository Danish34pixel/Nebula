import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl } from "../../config/api";

const StockistAdmin = () => {
  const router = useRouter();
  const [stockists, setStockists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState({});
  const [declining, setDeclining] = useState({});
  const [devToken, setDevToken] = useState("");
  const [isDev, setIsDev] = useState(__DEV__);

  const APPROVED_STORAGE_KEY = "admin_approved_stockists";

  // Fetch all stockists
  const fetchStockists = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const limit = 100;
      const firstRes = await fetch(apiUrl(`/api/stockist?page=1&limit=${limit}`), { headers });
      const firstJson = await firstRes.json();
      if (!firstRes.ok) {
        throw new Error(firstJson.message || `Failed to load stockists (${firstRes.status})`);
      }

      let fetched = firstJson.data || [];
      const totalPages = Math.max(1, Number(firstJson.totalPages || 1));

      if (totalPages > 1) {
        const pageRequests = [];
        for (let p = 2; p <= totalPages; p += 1) {
          pageRequests.push(fetch(apiUrl(`/api/stockist?page=${p}&limit=${limit}`), { headers }));
        }
        const responses = await Promise.all(pageRequests);
        for (const res of responses) {
          if (!res.ok) continue;
          const json = await res.json();
          if (Array.isArray(json?.data)) fetched = fetched.concat(json.data);
        }
      }

      // Apply local overrides
      try {
        const raw = await AsyncStorage.getItem(APPROVED_STORAGE_KEY);
        if (raw) {
          const approvedIds = JSON.parse(raw);
          if (Array.isArray(approvedIds) && approvedIds.length) {
            fetched = fetched.map((st) =>
              approvedIds.includes(st._id)
                ? { ...st, approved: true, status: "approved" }
                : st
            );
          }
        }
      } catch (e) {
        console.warn("Failed to read approved IDs", e);
      }

      setStockists(fetched);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockists();
    
    // Load dev token if exists
    (async () => {
      const savedToken = await AsyncStorage.getItem("token");
      if (savedToken) setDevToken(savedToken);
    })();
  }, []);

  const saveDevToken = async () => {
    if (!devToken) return Alert.alert("Error", "Enter a token to save");
    await AsyncStorage.setItem("token", devToken);
    Alert.alert("Success", "Token saved for dev testing");
  };

  const approveStockist = async (id) => {
    setApproving((p) => ({ ...p, [id]: true }));
    try {
      const token = await AsyncStorage.getItem("token");
      const headers = { 
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(isDev && { "x-dev-admin": "1" })
      };

      const res = await fetch(apiUrl(`/api/stockist/${id}/approve`), {
        method: "PATCH",
        headers,
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || `Approval failed (${res.status})`);

      // Update local state
      setStockists((s) =>
        s.map((st) =>
          st._id === id
            ? { ...st, approved: true, status: "approved" }
            : st
        )
      );

      // Persist locally
      try {
        const raw = await AsyncStorage.getItem(APPROVED_STORAGE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        if (!arr.includes(id)) {
          arr.push(id);
          await AsyncStorage.setItem(APPROVED_STORAGE_KEY, JSON.stringify(arr));
        }
      } catch (e) {}

      await fetchStockists();
    } catch (e) {
      Alert.alert("Error", e.message || String(e));
    } finally {
      setApproving((p) => ({ ...p, [id]: false }));
    }
  };

  const declineStockist = async (id) => {
    setDeclining((p) => ({ ...p, [id]: true }));
    try {
      const token = await AsyncStorage.getItem("token");
      const headers = { 
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(isDev && { "x-dev-admin": "1" })
      };

      const res = await fetch(apiUrl(`/api/stockist/${id}/decline`), {
        method: "PATCH",
        headers,
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || `Decline failed (${res.status})`);

      setStockists((s) => s.filter((st) => st._id !== id));

      // Cleanup local persistence
      try {
        const raw = await AsyncStorage.getItem(APPROVED_STORAGE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        const newArr = arr.filter((x) => x !== id);
        await AsyncStorage.setItem(APPROVED_STORAGE_KEY, JSON.stringify(newArr));
      } catch (e) {}

    } catch (e) {
      Alert.alert("Error", e.message || String(e));
    } finally {
      setDeclining((p) => ({ ...p, [id]: false }));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Stockists (Admin)</Text>
          <TouchableOpacity onPress={fetchStockists} style={styles.refreshBtn}>
             <Feather name="refresh-cw" size={20} color="#0d9488" />
          </TouchableOpacity>
        </View>

        {isDev && (
          <View style={styles.devSection}>
            <Text style={styles.devLabel}>Dev Admin Token</Text>
            <View style={styles.devInputRow}>
              <TextInput
                style={styles.devInput}
                value={devToken}
                onChangeText={setDevToken}
                placeholder="Paste admin token here"
              />
              <TouchableOpacity style={styles.saveBtn} onPress={saveDevToken}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading && <ActivityIndicator size="large" color="#0d9488" style={{ marginTop: 20 }} />}
        {error && <Text style={styles.errorText}>{error}</Text>}

        <ScrollView contentContainerStyle={styles.list}>
          {stockists.map((s) => {
            const imgSrc = s.profileImageUrl || s.licenseImageUrl;
            const isApproved = s.approved || s.status === "approved" || s.status === "Approved";
            const isProcessing = s.status === "processing" || s.status === "Processing" || (!isApproved && s.status !== "declined");

            return (
              <View key={s._id} style={styles.card}>
                <View style={styles.cardInfo}>
                  {imgSrc ? (
                    <Image
                      source={{ uri: imgSrc }}
                      style={[styles.avatar, isApproved && styles.approvedOpacity]}
                    />
                  ) : (
                    <View style={[styles.avatarPlaceholder, isApproved && styles.approvedOpacity]}>
                      <Feather name="package" size={24} color="#9ca3af" />
                    </View>
                  )}

                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>
                      {s.title || s.name || s.companyName}
                    </Text>
                    <Text style={styles.userSub}>
                      {s.email || s.phone}
                    </Text>
                    {isApproved && (
                      <View style={styles.approvedBadge}>
                         <Feather name="check" size={12} color="#10b981" />
                         <Text style={styles.approvedText}>Approved</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.actions}>
                  {isProcessing && !isApproved && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => approveStockist(s._id)}
                        disabled={approving[s._id]}
                      >
                        {approving[s._id] ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.actionBtnText}>Approve</Text>
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.declineBtn]}
                        onPress={() => declineStockist(s._id)}
                        disabled={declining[s._id]}
                      >
                        {declining[s._id] ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.actionBtnText}>Decline</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                  {isApproved && (
                    <View style={styles.statusLabel}>
                       <Text style={styles.statusLabelText}>APPROVED</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f0fdfa" },
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    justifyContent: "space-between",
  },
  backBtn: { padding: 8 },
  title: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  refreshBtn: { padding: 8 },
  devSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  devLabel: { fontSize: 12, fontWeight: "600", color: "#4b5563", marginBottom: 6 },
  devInputRow: { flexDirection: "row", gap: 8 },
  devInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: "#0d9488",
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 8,
  },
  saveBtnText: { color: "#fff", fontWeight: "600" },
  errorText: { color: "#ef4444", textAlign: "center", marginVertical: 10 },
  list: { paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardInfo: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 64, height: 64, borderRadius: 12, marginRight: 16 },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  approvedOpacity: { opacity: 0.5 },
  userDetails: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "bold", color: "#1f2937" },
  userSub: { fontSize: 14, color: "#6b7280" },
  approvedBadge: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  approvedText: { color: "#10b981", fontSize: 12, fontWeight: "600", marginLeft: 4 },
  actions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, minWidth: 100, alignItems: "center" },
  approveBtn: { backgroundColor: "#0d9488" },
  declineBtn: { backgroundColor: "#ef4444" },
  actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  statusLabel: { backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  statusLabelText: { fontSize: 12, fontWeight: "700", color: "#9ca3af" },
});

export default StockistAdmin;
