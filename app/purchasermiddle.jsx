import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl } from "../config/api";

const PurchaserVerification = () => {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [approvalCount, setApprovalCount] = useState(0);
  const [message, setMessage] = useState(
    "Thanks for registering. Your documents are being reviewed by the selected stockists."
  );
  const timerRef = useRef(null);

  // Helper: validate a possible Mongo ObjectId (24 hex chars)
  const looksLikeObjectId = (id) =>
    typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const purchaserId = await AsyncStorage.getItem("pendingPurchaserId");
        const purchasingRequestId = await AsyncStorage.getItem("pendingPurchasingRequestId");
        const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

        // ── 1. Check the Purchaser document for approved flag ──────────────
        if (purchaserId && looksLikeObjectId(purchaserId)) {
          const res = await fetch(apiUrl(`/api/purchaser/${purchaserId}`), {
            headers: authHeader,
          });
          if (res.ok) {
            const json = await res.json();
            if (json && json.data) {
              if (json.data.approved || json.data.verified) {
                await AsyncStorage.multiRemove(["pendingPurchaserId", "pendingPurchasingRequestId"]);
                router.replace("/Purchaser/purchaser-login");
                return;
              }
            }
          }
        }

        // ── 2. Check the PurchaseCardRequest for approval count ───────────
        if (purchasingRequestId && looksLikeObjectId(purchasingRequestId)) {
          const res2 = await fetch(apiUrl(`/api/purchasing-card/status/${purchasingRequestId}`));
          if (res2.ok) {
            const json2 = await res2.json();
            if (json2 && json2.data) {
              const count = json2.data.approvals || 0;
              setApprovalCount(count);
              if (json2.data.status === "approved") {
                await AsyncStorage.multiRemove(["pendingPurchaserId", "pendingPurchasingRequestId"]);
                router.replace("/Purchaser/purchaser-login");
                return;
              }
            }
          } else if (res2.status === 404) {
            // Request may have been cleaned up after full approval — re-check Purchaser doc
            if (purchaserId && looksLikeObjectId(purchaserId)) {
              const pres = await fetch(apiUrl(`/api/purchaser/${purchaserId}`), {
                headers: authHeader,
              });
              if (pres.ok) {
                const pJson = await pres.json();
                if (pJson && pJson.data && (pJson.data.approved || pJson.data.verified)) {
                  await AsyncStorage.multiRemove(["pendingPurchaserId", "pendingPurchasingRequestId"]);
                  router.replace("/Purchaser/purchaser-login");
                  return;
                }
              }
            }
            await AsyncStorage.removeItem("pendingPurchasingRequestId");
          }
        }

        // Neither ID exists – nothing left to poll
        if (!purchaserId && !purchasingRequestId) {
          setChecking(false);
          return;
        }
      } catch (e) {
        console.warn("Polling error:", e.message);
      }

      if (!cancelled) {
        timerRef.current = setTimeout(checkStatus, 4000);
      }
    };

    checkStatus();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const isFailed = message.startsWith("Verification failed");

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#f8fafc", "#eff6ff", "#e0e7ff"]}
        style={styles.container}
      >
        <View style={styles.card}>
          <LinearGradient
            colors={isFailed ? ["#fee2e2", "#fecaca"] : ["#f0fdfa", "#ccfbf1"]}
            style={styles.iconCircle}
          >
            <Feather
              name={isFailed ? "x-circle" : "shield"}
              size={40}
              color={isFailed ? "#ef4444" : "#0d9488"}
            />
          </LinearGradient>

          <Text style={[styles.title, isFailed ? styles.titleError : null]}>
            {isFailed ? "Verification Failed" : "Awaiting Stockist Approval"}
          </Text>

          <Text style={styles.message}>{message}</Text>

          {!isFailed ? (
            <View style={styles.progressContainer}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i < approvalCount ? styles.progressDotActive : null,
                  ]}
                >
                  {i < approvalCount ? (
                    <Feather name="check" size={14} color="#fff" />
                  ) : null}
                </View>
              ))}
              <Text style={styles.progressLabel}>
                {approvalCount} of 3 stockists approved
              </Text>
            </View>
          ) : null}

          {checking && !isFailed ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#0d9488" size="large" />
              <Text style={styles.loadingText}>Checking status...</Text>
            </View>
          ) : null}

          {!isFailed ? (
            <View style={styles.footer}>
              <Feather name="info" size={16} color="#94a3b8" style={styles.infoIcon} />
              <Text style={styles.footerText}>
                You can close the app and come back. We'll unlock your account once all 3 stockists approve.
              </Text>
            </View>
          ) : null}

          {isFailed ? (
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => router.replace("/Purchaser/purchaser-signup")}
            >
              <Text style={styles.retryBtnText}>Back to Signup</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 16,
  },
  titleError: {
    color: "#b91c1c",
  },
  message: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  loadingContainer: {
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e2e8f0",
    borderWidth: 2,
    borderColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
  },
  progressDotActive: {
    backgroundColor: "#0d9488",
    borderColor: "#0d9488",
  },
  progressLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
    width: "100%",
    textAlign: "center",
    marginTop: 4,
  },
  footer: {
    marginTop: 40,
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  infoIcon: {
    marginRight: 10,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: "#b91c1c",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "bold",
  }
});

export default PurchaserVerification;
