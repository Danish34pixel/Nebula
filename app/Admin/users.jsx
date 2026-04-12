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

const UserAdmin = () => {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [devToken, setDevToken] = useState("");
  const [isDev, setIsDev] = useState(__DEV__);

  // Fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("token");
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(isDev ? { "x-dev-admin": "1" } : {}),
      };
      
      const res = await fetch(apiUrl("/api/purchaser"), { headers });
      const json = await res.json();

      if (res.status === 403) {
        throw new Error("Access denied. Open this screen with an admin account.");
      }
      if (!res.ok)
        throw new Error(json.message || `Failed to load purchasers (${res.status})`);

      setUsers(json.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Purchasers (Admin)</Text>
          <TouchableOpacity onPress={fetchUsers} style={styles.refreshBtn}>
             <Feather name="refresh-cw" size={20} color="#3b82f6" />
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

        {loading && <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 20 }} />}
        {error && <Text style={styles.errorText}>{error}</Text>}

        <ScrollView contentContainerStyle={styles.list}>
          {users.map((user) => {
            const imgSrc = user.profileImageUrl || user.licenseImageUrl || user.photo || user.aadharImage;
            const isApproved = user.approved || user.status === "approved" || user.status === "Approved";

            return (
              <TouchableOpacity 
                key={user._id} 
                style={styles.card}
                onPress={() => router.push(`/Purchaser/${user._id}`)}
              >
                <View style={styles.cardInfo}>
                  {imgSrc ? (
                    <Image
                      source={{ uri: imgSrc }}
                      style={[styles.avatar, isApproved && styles.approvedOpacity]}
                    />
                  ) : (
                    <View style={[styles.avatarPlaceholder, isApproved && styles.approvedOpacity]}>
                      <Feather name="user" size={24} color="#9ca3af" />
                    </View>
                  )}

                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>
                      {user.title || user.name || user.fullName || user.companyName}
                    </Text>
                    <Text style={styles.userSub}>
                      {user.email || user.phone || user.contactNo}
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
                  {isApproved && (
                    <View style={styles.statusLabel}>
                       <Text style={styles.statusLabelText}>APPROVED</Text>
                    </View>
                  )}
                  {!isApproved && (
                    <View style={styles.statusLabel}>
                      <Text style={styles.statusLabelText}>PENDING</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f9fafb" },
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
    backgroundColor: "#10b981",
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
  approveBtn: { backgroundColor: "#3b82f6" },
  declineBtn: { backgroundColor: "#ef4444" },
  actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  statusLabel: { backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  statusLabelText: { fontSize: 12, fontWeight: "700", color: "#9ca3af" },
});

export default UserAdmin;
