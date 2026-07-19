import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { secureStorage } from "../utils/secureStore";

const PLAN_LABELS = {
  monthly: "1 Month",
  quarterly: "3 Months",
  yearly: "12 Months",
};

export default function PaymentPending() {
  const router = useRouter();
  const [subInfo, setSubInfo] = useState(null);

  useEffect(() => {
    secureStorage.getItem("lastSubscription").then((raw) => {
      if (raw) {
        try { setSubInfo(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const handleLogout = async () => {
    await secureStorage.removeItem("token");
    await secureStorage.removeItem("refreshToken");
    await secureStorage.removeItem("user");
    await secureStorage.removeItem("lastSubscription");
    router.replace("/");
  };

  const planKey = subInfo?.subscriptionPlan || subInfo?.plan?.key;
  const planLabel = PLAN_LABELS[planKey] || subInfo?.plan?.label || "—";
  const endDate = subInfo?.subscriptionEndDate
    ? new Date(subInfo.subscriptionEndDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={["#f0fdf4", "#eff6ff"]} style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Feather name="clock" size={48} color="#0891b2" />
          </View>
          <Text style={styles.title}>Payment Received!</Text>
          <Text style={styles.subtitle}>
            Your payment was successful. Our team will review and activate your
            account shortly.
          </Text>

          {planKey && (
            <View style={styles.planBox}>
              <Feather name="check-circle" size={20} color="#10b981" />
              <View style={styles.planText}>
                <Text style={styles.planLabel}>
                  {planLabel} Subscription
                </Text>
                {endDate && (
                  <Text style={styles.planExpiry}>
                    Valid until {endDate}
                  </Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.steps}>
            <Step done icon="check-circle" label="Signup complete" />
            <Step done icon="check-circle" label="Payment confirmed" />
            <Step icon="clock" label="Admin verification (pending)" />
            <Step icon="unlock" label="Account activated" />
          </View>

          <Text style={styles.note}>
            You will be able to log in once admin verifies your account. This
            typically takes a few hours.
          </Text>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

function Step({ done, icon, label }) {
  return (
    <View style={styles.step}>
      <Feather name={icon} size={20} color={done ? "#10b981" : "#94a3b8"} />
      <Text style={[styles.stepLabel, done && styles.stepDone]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#1e293b", marginBottom: 12 },
  subtitle: {
    fontSize: 15,
    color: "#475569",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  planBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 14,
    width: "100%",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  planText: { flex: 1 },
  planLabel: { fontSize: 15, fontWeight: "700", color: "#166534" },
  planExpiry: { fontSize: 13, color: "#16a34a", marginTop: 2 },
  steps: { width: "100%", gap: 14, marginBottom: 24 },
  step: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepLabel: { fontSize: 14, color: "#94a3b8" },
  stepDone: { color: "#1e293b", fontWeight: "600" },
  note: { fontSize: 13, color: "#64748b", textAlign: "center", marginBottom: 28 },
  logoutBtn: {
    backgroundColor: "#0891b2",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  logoutText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
