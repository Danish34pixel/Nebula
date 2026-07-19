import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
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

const PLAN_LABELS = {
  monthly: "1 Month",
  quarterly: "3 Months",
  yearly: "12 Months",
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PendingPayments() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
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
    try {
      await postJson(`/admin/verify-user/${item._id}?model=${item._userModel}`, {});
      setItems((prev) => prev.filter((i) => i._id !== item._id));
    } catch (err) {
      Alert.alert("Error", err.message || "Verification failed");
    }
  };

  const handleReject = async (item) => {
    try {
      await postJson(`/admin/reject-user/${item._id}?model=${item._userModel}`, {});
      setItems((prev) => prev.filter((i) => i._id !== item._id));
    } catch (err) {
      Alert.alert("Error", err.message || "Rejection failed");
    }
  };

  const renderItem = ({ item }) => {
    const name = item.ownerName || item.fullName || "—";
    const role = item.role === "purchaser" ? "Purchaser" : "Medical Owner";
    const roleColor = item.role === "purchaser" ? "#0369a1" : "#92400e";
    const roleBg = item.role === "purchaser" ? "#e0f2fe" : "#fef3c7";
    const planLabel = PLAN_LABELS[item.subscriptionPlan] || "—";

    return (
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={styles.nameBlock}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.email}>{item.email}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: roleBg }]}>
            <Text style={[styles.roleBadgeText, { color: roleColor }]}>{role}</Text>
          </View>
        </View>

        {/* Subscription info */}
        <View style={styles.infoGrid}>
          <InfoRow
            icon="calendar"
            label="Plan"
            value={planLabel}
            highlight
          />
          <InfoRow
            icon="clock"
            label="Expires"
            value={formatDateShort(item.subscriptionEndDate)}
          />
          <InfoRow
            icon="credit-card"
            label="Paid at"
            value={formatDate(item.paidAt)}
          />
          <InfoRow
            icon="user-check"
            label="Signed up"
            value={formatDate(item.createdAt)}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={() => handleVerify(item)}
          >
            <LinearGradient
              colors={["#10b981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              <Feather name="check" size={15} color="#fff" />
              <Text style={styles.btnText}>Verify & Activate</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => handleReject(item)}
          >
            <Feather name="x" size={15} color="#ef4444" />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.timelineBtn}
            onPress={() =>
              router.push(
                `/Admin/user-timeline?id=${item._id}&model=${item._userModel}`
              )
            }
          >
            <Feather name="clock" size={15} color="#0891b2" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Payment Verification</Text>
          <Text style={styles.headerSub}>
            {items.length} user{items.length !== 1 ? "s" : ""} awaiting approval
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => { setRefreshing(true); load(true); }}
          style={styles.refreshBtn}
        >
          <Feather name="refresh-cw" size={20} color="#0891b2" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i._id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          items.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            colors={["#0891b2"]}
            tintColor="#0891b2"
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyWrap}>
              <Feather name="check-circle" size={48} color="#10b981" />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySub}>No pending verifications</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, highlight }) {
  return (
    <View style={styles.infoRow}>
      <Feather name={icon} size={13} color="#94a3b8" style={{ width: 18 }} />
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1e293b" },
  headerSub: { fontSize: 12, color: "#64748b", marginTop: 1 },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
  },
  list: { padding: 16, gap: 14 },
  listEmpty: { flex: 1 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  nameBlock: { flex: 1, marginRight: 10 },
  name: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 2 },
  email: { fontSize: 13, color: "#64748b" },
  roleBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  roleBadgeText: { fontSize: 12, fontWeight: "700" },
  infoGrid: { gap: 6, marginBottom: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoLabel: { fontSize: 12, color: "#94a3b8", width: 60 },
  infoValue: { fontSize: 13, color: "#334155", flex: 1 },
  infoValueHighlight: { color: "#0891b2", fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, alignItems: "center" },
  verifyBtn: { flex: 1, borderRadius: 12, overflow: "hidden" },
  btnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  rejectBtnText: { color: "#ef4444", fontWeight: "700", fontSize: 13 },
  timelineBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingTop: 80,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  emptySub: { fontSize: 14, color: "#94a3b8" },
});
