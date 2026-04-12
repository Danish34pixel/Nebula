import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl } from "../../config/api";

const { width } = Dimensions.get("window");

const StockistVerification = () => {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState(
    "Thanks for registering. Your documents are under verification. We will notify you once your account is approved."
  );
  
  const [isApproved, setIsApproved] = useState(false);
  const timerRef = useRef(null);

  // Helper: validate a possible Mongo ObjectId (24 hex chars)
  const looksLikeObjectId = (id) =>
    typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

  const checkStatus = async () => {
    try {
      const stockistId = 
        (await AsyncStorage.getItem("pendingStockistId")) || 
        (await AsyncStorage.getItem("pendingUserId"));

      console.log("[Verification] Checking status for ID:", stockistId);

      if (!stockistId) {
        // Fallback: Check if user is already logged in or has a basic user record
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            if (user._id) {
               console.log("[Verification] Found existing user in storage, using that ID:", user._id);
               // Proceed with this ID
               checkWithId(user._id);
               return;
            }
          } catch (e) {}
        }

        console.warn("[Verification] No pending ID found in storage.");
        setChecking(false);
        setMessage("No active registration session found. If you just registered, please try logging in.");
        return;
      }

      checkWithId(stockistId);
    } catch (e) {
      console.warn("Polling error:", e.message);
    }
  };

  const checkWithId = async (id) => {
    try {
      if (looksLikeObjectId(id)) {
        console.log(`[Verification] Fetching status for: ${id}`);
        const res = await fetch(apiUrl(`/api/auth/status/${id}`));
        if (res.ok) {
          const json = await res.json();
          if (json && json.data) {
            const { approved, status, verified } = json.data;
            console.log("[Verification] Backend status:", { approved, status, verified });
            
            const approvedValue = approved === true || status === "approved" || status === "Approved" || verified === true;
            setIsApproved(approvedValue);
            
            if (approvedValue) {
              console.log("[Verification] Approval confirmed! Redirecting...");
              await AsyncStorage.multiRemove(["pendingStockistId", "pendingUserId"]);
              setChecking(false);
              // Check if it's a medical owner or stockist based on the route if possible, 
              // but stockist-login is a safe bet for this screen.
              router.replace("/Stockist/stockist-dashboard"); 
              return;
            } else if (json.data.declined || status === "declined" || status === "Declined") {
              setMessage("Document verification failed. Your registration was declined.");
              setChecking(false);
              return;
            }
          }
        }
      }
    } catch (err) {
       console.warn("Fetch error:", err);
    }
    
    timerRef.current = setTimeout(checkStatus, 3000);
  };

  useEffect(() => {
    checkStatus();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const isFailed = message === "Document verification failed. Your registration was declined.";

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#f8fafc", "#f0fdfa", "#ccfbf1"]}
        style={styles.container}
      >
        <View style={styles.card}>
          <LinearGradient
            colors={isFailed ? ["#fee2e2", "#fecaca"] : ["#f0fdfa", "#99f6e4"]}
            style={styles.iconCircle}
          >
            <Feather 
              name={isFailed ? "x-circle" : "shield"} 
              size={40} 
              color={isFailed ? "#ef4444" : "#0d9488"} 
            />
          </LinearGradient>

          <Text style={[styles.title, isFailed && styles.titleError]}>
            {isFailed ? "Verification Failed" : "Pending Verification"}
          </Text>

          <Text style={styles.message}>{message}</Text>

          {checking && !isFailed && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#0d9488" size="large" />
              <Text style={styles.loadingText}>Checking document status...</Text>
            </View>
          )}

          {!isFailed && (
            <View style={styles.footer}>
              <Feather name="info" size={16} color="#94a3b8" style={styles.infoIcon} />
              <Text style={styles.footerText}>
                You can close the app and wait. We'll give you access once the admin approves your license.
              </Text>
            </View>
          )}

          {isFailed && (
            <TouchableOpacity 
               style={styles.retryBtn} 
               onPress={() => router.replace("/Stockist/stockist-signup")}
            >
               <Text style={styles.retryBtnText}>Back to Signup</Text>
            </TouchableOpacity>
          )}

          {!isFailed && (
            <TouchableOpacity 
               style={styles.refreshActionBtn} 
               onPress={() => {
                 console.log("[Verification] Manual status check requested.");
                 setChecking(true);
                 if (timerRef.current) clearTimeout(timerRef.current);
                 checkStatus(); 
               }}
               disabled={isApproved}
            >
               <Text style={styles.refreshActionBtnText}>
                 {checking ? "Checking..." : "Check Status Now"}
               </Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#1e293b", textAlign: "center", marginBottom: 16 },
  titleError: { color: "#b91c1c" },
  message: { fontSize: 15, color: "#64748b", textAlign: "center", lineHeight: 22, marginBottom: 32 },
  loadingContainer: { alignItems: "center", gap: 12 },
  loadingText: { fontSize: 13, color: "#94a3b8", fontWeight: "500" },
  footer: { marginTop: 40, flexDirection: "row", backgroundColor: "#f8fafc", padding: 16, borderRadius: 16, alignItems: "center" },
  infoIcon: { marginRight: 10 },
  footerText: { flex: 1, fontSize: 12, color: "#64748b", fontStyle: "italic" },
  retryBtn: { marginTop: 20, backgroundColor: "#b91c1c", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  retryBtnText: { color: "#fff", fontWeight: "bold" },
  refreshActionBtn: { marginTop: 24, backgroundColor: "#0d9488", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16 },
  refreshActionBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 }
});

export default StockistVerification;
