import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SecureScreen from "../../components/SecureScreen";
import { fetchJson, postJson } from "../../config/api";

const ROLE_LABELS = {
  user: "Medical Owner",
  purchaser: "Purchaser",
  stockist: "Stockist",
  admin: "Admin",
};

function formatDateTime(dateStr) {
  if (!dateStr) return "No date";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AnnouncementDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const targetRoles = useMemo(
    () =>
      Array.isArray(announcement?.targetRoles)
        ? announcement.targetRoles
        : [],
    [announcement?.targetRoles],
  );

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetchJson(`/announcements/${id}`);
        const data = res?.data || res;
        if (alive) {
          setAnnouncement(data);
          if (data?._id) {
            postJson(`/announcements/${data._id}/read`, {}).catch(() => {});
          }
        }
      } catch (err) {
        if (alive) {
          setError(err?.message || "Failed to load announcement.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    if (id) load();

    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <SecureScreen>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Announcement</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {loading ? (
            <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
          ) : error ? (
            <View style={styles.card}>
              <Feather name="alert-triangle" size={28} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : announcement ? (
            <View style={styles.card}>
              <View style={styles.badge}>
                <Feather name="megaphone" size={14} color="#fff" />
                <Text style={styles.badgeText}>Announcement</Text>
              </View>

              <Text style={styles.title}>{announcement.title}</Text>
              <Text style={styles.time}>
                {formatDateTime(announcement.createdAt)}
              </Text>

              <View style={styles.messageCard}>
                <Text style={styles.messageLabel}>Message</Text>
                <Text style={styles.message}>{announcement.message}</Text>
              </View>

              {announcement.readBy ? (
                <Text style={styles.readInfo}>
                  Seen by {announcement.readBy.length || 0} users
                </Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </SecureScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    backgroundColor: "#6366f1",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 14,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    color: "#0f172a",
  },
  time: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 13,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    flexWrap: "wrap",
  },
  metaPill: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  messageCard: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 18,
  },
  messageLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.65)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    color: "#fff",
  },
  readInfo: {
    marginTop: 14,
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
  errorText: {
    marginTop: 10,
    color: "#b91c1c",
    fontSize: 14,
    fontWeight: "600",
  },
});
