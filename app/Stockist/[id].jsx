import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { apiUrl, fetchJson } from "../../config/api";
import { secureStorage } from "../../utils/secureStore";
import usePreventScreenCapture from "../../utils/usePreventScreenCapture";

export default function StockistDetailScreen() {
  usePreventScreenCapture();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [stockist, setStockist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStockistDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await secureStorage.getItem("token");
        const headers = {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const res = await fetch(apiUrl(`/api/stockist/${id}`), { headers });
        if (!res.ok) throw new Error("Failed to fetch stockist");
        const data = await res.json();

        // Handle various response formats
        const stockistData = data.stockist || data.data || data;
        setStockist(stockistData);
      } catch (err) {
        console.error("Error fetching stockist:", err);
        setError(err.message || "Failed to load stockist details");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchStockistDetail();
    }
  }, [id]);

  const handleBackPress = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress}>
            <Feather name="chevron-left" size={24} color="#4b5563" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Stockist Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#06b6d4" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !stockist) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress}>
            <Feather name="chevron-left" size={24} color="#4b5563" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Stockist Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || "Stockist not found"}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleBackPress}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const name = stockist.name || stockist.title || "Stockist";
  const phone =
    stockist.phone || stockist.contactNo || stockist.cntxNumber || "";
  const address = stockist.address
    ? typeof stockist.address === "string"
      ? stockist.address
      : `${stockist.address.street || ""}${stockist.address.city ? ", " + stockist.address.city : ""}`
    : "";
  const medicines = stockist.medicines || stockist.Medicines || [];
  const companies = stockist.companies || stockist.items || [];

  const handleCall = async (phoneNum) => {
    console.log(
      "handleCall triggered with phone:",
      phoneNum,
      "stockist id:",
      id,
      "name:",
      name,
    );

    const safePhone = phoneNum
      ? String(phoneNum)
          .trim()
          .replace(/[^+0-9]/g, "")
      : "";
    if (!safePhone) {
      console.log("Missing or invalid phone number");
      alert("Phone number not available");
      return;
    }

    try {
      if (Platform.OS === "web") {
        window.location.href = `tel:${safePhone}`;
      } else {
        await Linking.openURL(`tel:${safePhone}`);
      }
    } catch (err) {
      console.error("Failed to initiate call:", err);
      try {
        router.push({
          pathname: "/purchasermiddle",
          params: {
            stockistId: id,
            phone: phoneNum,
            stockistName: name,
            action: "call",
          },
        });
      } catch (error) {
        console.error("Error pushing route as fallback:", error);
      }
    }
  };

  const handleContactNow = () => {
    router.push({
      pathname: "/purchasermiddle",
      params: {
        stockistId: id,
        stockistNumber: phone,
        stockistName: name,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Feather name="chevron-left" size={24} color="#4b5563" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stockist Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <LinearGradient colors={["#22d3ee", "#14b8a6"]} style={styles.avatar}>
            <Text style={styles.avatarText}>
              {name?.charAt(0)?.toUpperCase() || "S"}
            </Text>
          </LinearGradient>
          <View style={styles.headerInfo}>
            <Text style={styles.nameText}>{name}</Text>
            <Text style={styles.addressText}>{address}</Text>
          </View>
        </View>

        {/* Contact Card */}
        <View style={styles.card} pointerEvents="auto">
          <Text style={styles.cardTitle}>Contact Information</Text>
          <View style={styles.divider} />

          <View style={styles.contactRow}>
            <Feather name="phone" size={20} color="#06b6d4" />
            <TouchableOpacity
              style={styles.contactInfo}
              onPress={() => handleCall(phone)}
            >
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>{phone || "N/A"}</Text>
            </TouchableOpacity>
            {phone && (
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => handleCall(phone)}
              >
                <Feather name="phone-call" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.contactRow}>
            <Feather name="map-pin" size={20} color="#06b6d4" />
            <View style={styles.contactInfo} pointerEvents="none">
              <Text style={styles.contactLabel}>Address</Text>
              <Text style={styles.contactValue}>{address || "N/A"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.callNowContainer}>
            <TouchableOpacity
              style={styles.contactNowBtn}
              onPress={() => {
                console.log(
                  "Call Now button pressed, phone:",
                  phone,
                  "id:",
                  id,
                  "name:",
                  name,
                );
                if (!phone) {
                  alert("Phone number not available");
                  return;
                }
                handleCall(phone);
              }}
              activeOpacity={0.7}
            >
              <Feather name="phone-call" size={20} color="#fff" />
              <Text style={styles.contactNowBtnText}>Call Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Medicines Section */}
        {medicines && medicines.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Available Medicines</Text>
            <View style={styles.divider} />
            <View style={styles.tagsContainer}>
              {medicines.map((medicine, idx) => {
                const medName =
                  typeof medicine === "string"
                    ? medicine
                    : medicine?.name || medicine?.title || "Medicine";
                return (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>{medName}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Companies Section */}
        {companies && companies.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Partner Companies</Text>
            <View style={styles.divider} />
            <View style={styles.companiesContainer}>
              {companies.map((company, idx) => {
                const compName =
                  typeof company === "string"
                    ? company
                    : company?.name || company?.title || "Company";
                return (
                  <View key={idx} style={styles.companyBadge}>
                    <Text style={styles.companyBadgeText}>{compName}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Additional Info */}
        <View style={styles.card}>
          <View style={styles.verifiedBox}>
            <View style={styles.verifiedDot} />
            <Text style={styles.verifiedText}>Verified Stockist</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    marginBottom: 20,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#06b6d4",
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  headerCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  headerInfo: {
    flex: 1,
  },
  nameText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: "#6b7280",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactLabel: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
  },
  contactValue: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600",
    marginTop: 2,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#06b6d4",
    justifyContent: "center",
    alignItems: "center",
  },
  callNowContainer: {
    width: "100%",
  },
  contactNowBtn: {
    backgroundColor: "#06b6d4",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  contactNowBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#06b6d4",
  },
  tagText: {
    fontSize: 12,
    color: "#0369a1",
    fontWeight: "500",
  },
  companiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  companyBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  companyBadgeText: {
    fontSize: 13,
    color: "#92400e",
    fontWeight: "600",
  },
  verifiedBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  verifiedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10b981",
    marginRight: 8,
  },
  verifiedText: {
    fontSize: 14,
    color: "#10b981",
    fontWeight: "600",
  },
});
