import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchJson } from "../config/api";
import { getHomeRouteForRole } from "../utils/getHomeRouteForRole";
import { secureStorage } from "../utils/secureStore";

const POLL_MS = 6000;

const PLAN_LABELS = {
  monthly: "1 Month",
  quarterly: "3 Months",
  yearly: "12 Months",
};

export default function PaymentPending() {
  const router = useRouter();
  const [subInfo, setSubInfo] = useState(null);
  const [activated, setActivated] = useState(false);
  const [rejected, setRejected] = useState(false);

  const intervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetchJson("/auth/me");
      const status = res?.user?.accountStatus;
      if (status === "active") {
        stopPolling();
        setActivated(true);
        const dest = getHomeRouteForRole(res.user.role, res.user._id);
        setTimeout(() => router.replace(dest), 1800);
      } else if (status === "rejected") {
        stopPolling();
        setRejected(true);
      }
    } catch {
      // Silent — network hiccup, keep polling
    }
  }, [router, stopPolling]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // already running
    checkStatus(); // immediate first check
    intervalRef.current = setInterval(checkStatus, POLL_MS);
  }, [checkStatus]);

  // Load cached subscription info for display
  useEffect(() => {
    secureStorage.getItem("lastSubscription").then((raw) => {
      if (raw) {
        try {
          setSubInfo(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  // Start polling, pause when app goes background, resume on foreground
  useEffect(() => {
    startPolling();

    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === "active" && prev !== "active") {
        startPolling();
      } else if (next !== "active") {
        stopPolling();
      }
    });

    return () => {
      stopPolling();
      sub.remove();
    };
  }, [startPolling, stopPolling]);

  const handleLogout = async () => {
    stopPolling();
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

  if (activated) {
    return (
      <SafeAreaView style={styles.safe}>
        <LinearGradient
          colors={["#f0fdf4", "#dcfce7"]}
          style={styles.container}
        >
          <View style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: "#bbf7d0" }]}>
              <Feather name="check-circle" size={52} color="#16a34a" />
            </View>
            <Text style={[styles.title, { color: "#15803d" }]}>
              Account Activated!
            </Text>
            <Text style={styles.subtitle}>Taking you in...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (rejected) {
    return (
      <SafeAreaView style={styles.safe}>
        <LinearGradient
          colors={["#fff1f2", "#fee2e2"]}
          style={styles.container}
        >
          <View style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: "#fecaca" }]}>
              <Feather name="x-circle" size={52} color="#dc2626" />
            </View>
            <Text style={[styles.title, { color: "#b91c1c" }]}>
              Account Rejected
            </Text>
            <Text style={styles.subtitle}>
              Your account was not approved. Please contact support for
              assistance.
            </Text>
            <TouchableOpacity
              style={[styles.logoutBtn, { backgroundColor: "#dc2626" }]}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

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
                <Text style={styles.planLabel}>{planLabel} Subscription</Text>
                {endDate && (
                  <Text style={styles.planExpiry}>Valid until {endDate}</Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.steps}>
            <Step done icon="check-circle" label="Signup complete" />
            <Step done icon="check-circle" label="Payment confirmed" />
            <Step icon="clock" label="Admin verification (pending)" pulse />
            <Step icon="unlock" label="Account activated" />
          </View>

          <Text style={styles.note}>
            Checking automatically every few seconds. You&apos;ll be taken in as
            soon as your account is approved.
          </Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.refreshBtn} onPress={checkStatus}>
              <Feather name="refresh-cw" size={16} color="#0891b2" />
              <Text style={styles.refreshText}>Check Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
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
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 12,
  },
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
  note: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 28,
  },
  btnRow: { flexDirection: "row", gap: 12, width: "100%" },
  refreshBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#0891b2",
    borderRadius: 16,
    paddingVertical: 13,
  },
  refreshText: { color: "#0891b2", fontWeight: "700", fontSize: 14 },
  logoutBtn: {
    flex: 1,
    backgroundColor: "#0891b2",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
