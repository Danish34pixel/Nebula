import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl } from "../../config/api";
import { secureStorage } from "../../utils/secureStore";

const MedicalManagement = () => {
  const router = useRouter();
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [devToken, setDevToken] = useState("");
  const [isDev, setIsDev] = useState(__DEV__);

  const listEndpoints = [
    "/api/auth/medical-owners?status=pending",
    "/api/auth/medicalOwner?status=pending",
    "/api/auth?role=medicalOwner&status=pending",
    "/api/auth?role=medicalOwner",
    "/api/auth/medical-owners",
    "/api/auth/medicalOwner",
  ];

  const actionEndpoints = (id, action) => [
    `/api/auth/medical-owner/${id}/${action}`,
    `/api/auth/medicalOwner/${id}/${action}`,
    `/api/auth/${id}/${action}`,
    `/api/auth/medical-owner/${id}?action=${action}`,
    `/api/auth/medicalOwner/${id}?action=${action}`,
    `/api/auth/${id}?action=${action}`,
    `/api/auth/approve/${id}`,
    `/api/auth/decline/${id}`,
    `/api/auth/${action}/${id}`,
    `/api/auth?${action}=${id}`,
  ];

  const getAuthHeaders = async () => {
    const token = await secureStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchFromCandidates = async (candidates) => {
    const headers = await getAuthHeaders();

    for (const endpoint of candidates) {
      try {
        console.log("[MedicalManagement] trying list endpoint", endpoint);
        const res = await fetch(apiUrl(endpoint), { headers });
        const body = await res.json().catch(() => null);

        if (res.ok) {
          if (Array.isArray(body)) {
            return { success: true, data: body, endpoint };
          }

          if (body && Array.isArray(body.data)) {
            return { success: true, data: body.data, endpoint };
          }

          if (body && Array.isArray(body.users)) {
            return { success: true, data: body.users, endpoint };
          }
        }

        if (res.status === 404 || res.status === 400) {
          continue;
        }

        // If backend returns a valid error other than 404, stop and report it.
        return {
          success: false,
          error: body?.message || `Failed to load from ${endpoint}`,
        };
      } catch (e) {
        if (e.message?.includes("Network request failed")) {
          return {
            success: false,
            error: "Network request failed. Check the API server.",
          };
        }
      }
    }

    return {
      success: false,
      error: "No supported medical owner endpoint found on the backend.",
    };
  };

  const fetchOwners = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFromCandidates(listEndpoints);
      if (!result.success) {
        throw new Error(result.error);
      }
      setOwners(result.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const tryAction = async (id, action) => {
    const headers = {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    };

    for (const endpoint of actionEndpoints(id, action)) {
      try {
        console.log(
          "[MedicalManagement] trying action endpoint",
          endpoint,
          action,
        );
        const res = await fetch(apiUrl(endpoint), {
          method: "PATCH",
          headers,
        });
        const body = await res.json().catch(() => null);
        if (res.ok) {
          return { success: true, endpoint, body };
        }
        if (res.status === 404 || res.status === 400) {
          continue;
        }
        return {
          success: false,
          error: body?.message || `Failed action at ${endpoint}`,
        };
      } catch (e) {
        if (e.message?.includes("Network request failed")) {
          return {
            success: false,
            error: "Network request failed. Check the API server.",
          };
        }
      }
    }
    return {
      success: false,
      error: "No supported approval endpoint found on the backend.",
    };
  };

  const updateOwnerStatus = async (id, status) => {
    setOwners((prev) =>
      prev.map((owner) => (owner._id === id ? { ...owner, status } : owner)),
    );
  };

  const handleApprove = async (id) => {
    try {
      const result = await tryAction(id, "approve");
      if (!result.success) {
        throw new Error(result.error);
      }
      await updateOwnerStatus(id, "approved");
      Alert.alert("Success", "Medical retailer approved.");
    } catch (e) {
      Alert.alert(
        "Approval Failed",
        e.message || "Unable to approve medical retailer.",
      );
    }
  };

  const handleDecline = async (id) => {
    try {
      const result = await tryAction(id, "decline");
      if (!result.success) {
        throw new Error(result.error);
      }
      setOwners((prev) => prev.filter((owner) => owner._id !== id));
      Alert.alert("Success", "Medical retailer declined.");
    } catch (e) {
      Alert.alert(
        "Decline Failed",
        e.message || "Unable to decline medical retailer.",
      );
    }
  };

  useEffect(() => {
    fetchOwners();
    (async () => {
      const token = await secureStorage.getItem("token");
      if (token) setDevToken(token);
    })();
  }, []);

  const saveDevToken = async () => {
    if (!devToken) return Alert.alert("Error", "Enter a token to save");
    await secureStorage.setItem("token", devToken);
    Alert.alert("Success", "Token saved for dev testing");
    fetchOwners();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Medical Owner Approvals</Text>
          <TouchableOpacity onPress={fetchOwners} style={styles.refreshBtn}>
            <Feather name="refresh-cw" size={20} color="#0d9488" />
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

        {loading && (
          <ActivityIndicator
            size="large"
            color="#0d9488"
            style={{ marginTop: 20 }}
          />
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}

        <ScrollView contentContainerStyle={styles.list}>
          {owners.length === 0 && !loading && !error ? (
            <View style={styles.emptyState}>
              <Feather name="info" size={24} color="#2563eb" />
              <Text style={styles.emptyText}>
                No pending medical owners found.
              </Text>
            </View>
          ) : null}

          {owners.map((owner) => {
            const isApproved =
              owner.approved ||
              owner.status === "approved" ||
              owner.status === "Approved";
            const displayName =
              owner.medicalName ||
              owner.ownerName ||
              owner.name ||
              owner.companyName ||
              owner.title ||
              "Unknown";
            const displaySub =
              owner.email || owner.contactNo || "No contact details";

            return (
              <View key={owner._id} style={styles.card}>
                <View style={styles.cardInfo}>
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      isApproved && styles.approvedOpacity,
                    ]}
                  >
                    <Feather name="home" size={24} color="#9ca3af" />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{displayName}</Text>
                    <Text style={styles.userSub}>{displaySub}</Text>
                    <Text style={styles.userStatus}>
                      {isApproved ? "Approved" : "Pending approval"}
                    </Text>
                  </View>
                </View>

                {!isApproved && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleApprove(owner._id)}
                    >
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.declineBtn]}
                      onPress={() => handleDecline(owner._id)}
                    >
                      <Text style={styles.actionBtnText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
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
  devLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 6,
  },
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#c7d2fe",
    backgroundColor: "#eff6ff",
    marginBottom: 16,
  },
  emptyText: {
    marginTop: 12,
    color: "#1d4ed8",
    fontSize: 16,
    textAlign: "center",
  },
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
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  approvedOpacity: { opacity: 0.5 },
  userDetails: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  userSub: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  userStatus: { marginTop: 6, fontSize: 12, color: "#64748b" },
  actions: { flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 100,
    alignItems: "center",
  },
  approveBtn: { backgroundColor: "#22c55e" },
  declineBtn: { backgroundColor: "#ef4444" },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

export default MedicalManagement;
