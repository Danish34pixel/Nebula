import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchJson, postJson } from "../../config/api";

export default function PendingPayments() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchJson("/admin/pending-users");
      setItems(res.data || []);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to load pending users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleVerify = async (item) => {
    Alert.alert(
      "Verify Account",
      `Activate account for ${item.ownerName || item.fullName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Verify",
          onPress: async () => {
            try {
              await postJson(`/admin/verify-user/${item._id}?model=${item._userModel}`, {});
              setItems((prev) => prev.filter((i) => i._id !== item._id));
            } catch (err) {
              Alert.alert("Error", err.message || "Verification failed");
            }
          },
        },
      ]
    );
  };

  const handleReject = async (item) => {
    Alert.alert(
      "Reject Account",
      `Reject account for ${item.ownerName || item.fullName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await postJson(`/admin/reject-user/${item._id}?model=${item._userModel}`, {});
              setItems((prev) => prev.filter((i) => i._id !== item._id));
            } catch (err) {
              Alert.alert("Error", err.message || "Rejection failed");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.ownerName || item.fullName || "—"}</Text>
        <View style={[styles.badge, { backgroundColor: item.role === "purchaser" ? "#e0f2fe" : "#fef3c7" }]}>
          <Text style={[styles.badgeText, { color: item.role === "purchaser" ? "#0369a1" : "#92400e" }]}>
            {item.role === "purchaser" ? "Purchaser" : "Medical Owner"}
          </Text>
        </View>
      </View>
      <Text style={styles.email}>{item.email}</Text>
      <Text style={styles.meta}>
        Plan:{" "}
        <Text style={styles.planHighlight}>
          {item.subscriptionPlan
            ? { monthly: "1 Month", quarterly: "3 Months", yearly: "12 Months" }[item.subscriptionPlan]
            : "—"}
        </Text>
        {" · "}₹{((item.planAmount || 0) / 100).toFixed(0)}
      </Text>
      {item.subscriptionEndDate && (
        <Text style={styles.meta}>
          Expires:{" "}
          {new Date(item.subscriptionEndDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </Text>
      )}
      <Text style={styles.meta}>Signed up: {new Date(item.createdAt).toLocaleString()}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.verifyBtn} onPress={() => handleVerify(item)}>
          <Feather name="check" size={16} color="#fff" />
          <Text style={styles.verifyBtnText}>Verify</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)}>
          <Feather name="x" size={16} color="#fff" />
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.timelineBtn}
          onPress={() => router.push(`/Admin/user-timeline?id=${item._id}&model=${item._userModel}`)}
        >
          <Feather name="clock" size={16} color="#0891b2" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#0891b2" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>Pending Verifications ({items.length})</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No pending verifications</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  title: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, elevation: 2, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  name: { fontSize: 16, fontWeight: "700", color: "#1e293b", flex: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  email: { fontSize: 13, color: "#64748b", marginBottom: 4 },
  meta: { fontSize: 12, color: "#94a3b8", marginBottom: 2 },
  planHighlight: { color: "#0891b2", fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  verifyBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#10b981", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18 },
  verifyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  rejectBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ef4444", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18 },
  rejectBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  timelineBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#e0f2fe", justifyContent: "center", alignItems: "center" },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 60, fontSize: 16 },
});
