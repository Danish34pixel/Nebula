import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { apiUrl } from "../../config/api";

export default function MedicalMiddle() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState(
    "Thanks for registering. Your documents are under verification. We will notify you once your account is approved."
  );
  
  const timerRef = useRef(null);
  
  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const stockistId = await AsyncStorage.getItem("pendingStockistId");
        const userId = await AsyncStorage.getItem("pendingUserId");

        if (!stockistId && !userId) {
          if (!cancelled) {
            setChecking(false);
            setMessage("No active registration session found. Please try logging in.");
          }
          return;
        }

        if (stockistId) {
          const res = await fetch(apiUrl(`/api/auth/status/${stockistId}`));
          const json = await res.json().catch(() => ({}));
          
          if (res.ok && json && json.data) {
            if (json.data.approved || json.data.status === 'approved') {
              await AsyncStorage.removeItem("pendingStockistId");
              if (!cancelled) router.replace("/Stockist/stockist-login");
              return;
            } else if (json.data.declined || json.data.status === 'declined' || json.data.status === 'rejected') {
              if (!cancelled) {
                setMessage("Document verification failed");
                setChecking(false);
              }
              return;
            }
          }
        } else if (userId) {
          const res = await fetch(apiUrl(`/api/auth/status/${userId}`));
          const json = await res.json().catch(() => ({}));
          
          if (res.ok && json && json.data) {
            if (json.data.approved || json.data.status === 'approved') {
              await AsyncStorage.removeItem("pendingUserId");
              
              await AsyncStorage.multiRemove(["pendingUserId", "pendingUserCreds"]);
              
              // Navigate to normal medical owner login after approval
              if (!cancelled) router.replace("/login");
              return;
            } else if (json.data.declined || json.data.status === 'declined' || json.data.status === 'rejected') {
              if (!cancelled) {
                setMessage("Document verification failed");
                setChecking(false);
              }
              return;
            }
          }
        }
      } catch (e) {
        // ignore network errors and continue polling
      }
      
      if (!cancelled) {
        timerRef.current = setTimeout(checkStatus, 3000);
      }
    };

    checkStatus();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={["#f0fdfa", "#ecfeff"]} style={styles.container}>
        <View style={styles.content}>
          <View style={styles.card}>
            {checking ? (
              <View style={styles.iconContainer}>
                <ActivityIndicator size="large" color="#0891b2" />
              </View>
            ) : message.includes("failed") ? (
              <View style={[styles.iconContainer, { backgroundColor: "#fef2f2" }]}>
                <Feather name="x-circle" size={48} color="#ef4444" />
              </View>
            ) : (
              <View style={[styles.iconContainer, { backgroundColor: "#f0fdf4" }]}>
                <Feather name="info" size={48} color="#10b981" />
              </View>
            )}

            <Text style={styles.title}>
              {message === "Document verification failed"
                ? "Verification Failed"
                : "Documents under verification"}
            </Text>
            
            <Text style={styles.messageText}>{message}</Text>
            
            {message !== "Document verification failed" && (
              <Text style={styles.subtext}>
                You can safely close this screen. Check back later to see if you have been approved.
              </Text>
            )}

            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => router.replace("/")}
            >
              <Text style={styles.homeBtnText}>Return to Main Screen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f0fdfa" },
  container: { flex: 1 },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(14, 116, 144, 0.1)",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ecfeff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 16,
    textAlign: "center",
  },
  messageText: {
    fontSize: 16,
    color: "#475569",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
  },
  subtext: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  homeBtn: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  homeBtnText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 16,
  },
});
