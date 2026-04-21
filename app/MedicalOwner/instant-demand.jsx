import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { apiUrl } from "../../config/api";
import { useRouter } from "expo-router";

export default function InstantDemand() {
  const router = useRouter();
  const [medicineName, setMedicineName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [matchedStockists, setMatchedStockists] = useState([]);
  const [statusMsg, setStatusMsg] = useState(null);

  const handleCreateDemand = async () => {
    const query = medicineName.trim();
    if (!query) {
      Alert.alert("Input Required", "Please enter a medicine name.");
      return;
    }

    setIsLoading(true);
    setHasSearched(false);
    setMatchedStockists([]);
    setStatusMsg(null);

    try {
      const url = apiUrl(
        `/api/stockist/by-medicine?name=${encodeURIComponent(query)}`,
      );
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok) throw new Error(json.message || "Search failed");

      const list = json.data || [];
      setMatchedStockists(list);
      setHasSearched(true);

      if (list.length > 0) {
        setStatusMsg(
          `✓ Found ${list.length} stockist${list.length > 1 ? "s" : ""} carrying "${query}"`,
        );
      } else {
        setStatusMsg(null);
      }
    } catch (e) {
      Alert.alert(
        "Error",
        e.message || "Failed to search. Please check your connection.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medicine Demand Check</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Intro Banner */}
        <LinearGradient
          colors={["#0ea5e9", "#06b6d4"]}
          style={styles.introBanner}
        >
          <Feather name="zap" size={28} color="#fff" />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.introTitle}>Instant Lookup</Text>
            <Text style={styles.introSub}>
              Find which stockists carry a medicine — instantly, no data saved.
            </Text>
          </View>
        </LinearGradient>

        {/* Input Card */}
        <View style={styles.card}>
          <Text style={styles.label}>MEDICINE NAME</Text>
          <View style={styles.inputRow}>
            <Feather
              name="search"
              size={18}
              color="#94a3b8"
              style={{ marginRight: 10 }}
            />
            <TextInput
              style={styles.input}
              placeholder="e.g. Paracetamol, Nadomac..."
              placeholderTextColor="#cbd5e1"
              value={medicineName}
              onChangeText={setMedicineName}
              returnKeyType="search"
              onSubmitEditing={handleCreateDemand}
            />
            {medicineName.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setMedicineName("");
                  setHasSearched(false);
                  setMatchedStockists([]);
                  setStatusMsg(null);
                }}
              >
                <Feather name="x" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.searchBtn, isLoading && { opacity: 0.7 }]}
            onPress={handleCreateDemand}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#0ea5e9", "#06b6d4"]}
              style={styles.searchBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather
                    name="search"
                    size={18}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.searchBtnText}>Create Demand</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Status message */}
        {statusMsg && (
          <View style={styles.successBanner}>
            <Feather name="check-circle" size={16} color="#059669" />
            <Text style={styles.successText}>{statusMsg}</Text>
          </View>
        )}

        {/* Results */}
        {hasSearched && !isLoading && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>Results</Text>

            {matchedStockists.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Feather name="inbox" size={36} color="#cbd5e1" />
                </View>
                <Text style={styles.emptyTitle}>
                  No stockist available for this medicine.
                </Text>
                <Text style={styles.emptyHint}>
                  Ask your admin to add inventory details to registered
                  stockists.
                </Text>
              </View>
            ) : (
              matchedStockists.map((s, idx) => (
                <TouchableOpacity
                  key={s._id || idx}
                  style={styles.stockistCard}
                  onPress={() => {
                    if (s._id) {
                      router.push(`/Stockist/${s._id}`);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.stockistAvatar}>
                    <Text style={styles.stockistAvatarText}>
                      {(s.name || "S").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.stockistInfo}>
                    <Text style={styles.stockistName} numberOfLines={1}>
                      {s.name || s.contactPerson || "Unnamed Stockist"}
                    </Text>
                    <View style={styles.phoneRow}>
                      <Feather name="phone" size={12} color="#64748b" />
                      <Text style={styles.phoneText}>
                        {s.phone || s.contactNo || "No contact listed"}
                      </Text>
                    </View>
                    {s.address?.city || s.address?.state ? (
                      <View style={styles.locationRow}>
                        <Feather name="map-pin" size={12} color="#94a3b8" />
                        <Text style={styles.locationText}>
                          {[s.address.city, s.address.state]
                            .filter(Boolean)
                            .join(", ")}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {s.phone ? (
                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(`tel:${s.phone}`);
                      }}
                    >
                      <Feather name="phone-call" size={18} color="#0ea5e9" />
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "bold", color: "#0f172a" },

  scrollContent: { padding: 20, paddingBottom: 50 },

  introBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  introTitle: { fontSize: 15, fontWeight: "bold", color: "#fff" },
  introSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    lineHeight: 18,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
    height: "100%",
    ...Platform.select({ web: { outlineStyle: "none" } }),
  },
  searchBtn: { borderRadius: 14, overflow: "hidden" },
  searchBtnGradient: {
    height: 54,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  searchBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 10,
  },
  successText: { color: "#15803d", fontSize: 14, fontWeight: "600" },

  resultsSection: { marginTop: 4 },
  resultsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 14,
  },

  emptyState: {
    alignItems: "center",
    padding: 36,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#64748b",
    textAlign: "center",
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },

  stockistCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  stockistAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  stockistAvatarText: { fontSize: 18, fontWeight: "bold", color: "#0284c7" },
  stockistInfo: { flex: 1 },
  stockistName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  phoneText: { fontSize: 13, color: "#475569", fontWeight: "500" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationText: { fontSize: 12, color: "#94a3b8" },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
  },
});
