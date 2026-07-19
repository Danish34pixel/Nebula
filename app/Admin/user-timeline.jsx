import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchJson } from "../../config/api";

const EVENT_ICONS = {
  signup: "user-plus",
  payment_initiated: "credit-card",
  payment_verified_signature: "check-circle",
  payment_verified_webhook: "zap",
  payment_failed: "x-circle",
  admin_verified: "shield",
  admin_rejected: "slash",
};

export default function UserTimeline() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchJson(`/admin/users/${id}/timeline`)
      .then((res) => setEvents(res.data || []))
      .catch((e) => setError(e.message));
  }, [id]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>User Timeline</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={events}
        keyExtractor={(e) => e._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No events recorded yet.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Feather
                name={EVENT_ICONS[item.eventType] || "activity"}
                size={16}
                color="#0891b2"
              />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.eventType}>{item.eventType.replace(/_/g, " ")}</Text>
              <Text style={styles.ts}>
                {new Date(item.createdAt).toLocaleString("en-IN")}
              </Text>
              {item.metadata && Object.keys(item.metadata).length > 0 && (
                <Text style={styles.meta} numberOfLines={2}>
                  {Object.entries(item.metadata)
                    .filter(([k]) => !["adminId"].includes(k))
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                </Text>
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 17, fontWeight: "700", color: "#1e293b" },
  error: { color: "#ef4444", padding: 16 },
  list: { padding: 16, gap: 12 },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 60 },
  row: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
  },
  rowText: { flex: 1 },
  eventType: { fontSize: 14, fontWeight: "600", color: "#1e293b", textTransform: "capitalize" },
  ts: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  meta: { fontSize: 12, color: "#64748b", marginTop: 4 },
});
