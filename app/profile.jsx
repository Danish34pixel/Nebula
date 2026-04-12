import React, { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { apiUrl } from "../config/api";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const storedUserStr = await AsyncStorage.getItem("user");
        const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
        if (storedUser && mounted) setUser(storedUser);

        const tokenAtRequest = await AsyncStorage.getItem("token");

        if (!tokenAtRequest) {
          if (!storedUser && mounted) {
            router.replace("/Stockist/stockist-login");
            return;
          }
          if (mounted) setLoading(false);
          return;
        }

        const res = await fetch(apiUrl("/api/auth/me"), {
          headers: { Authorization: `Bearer ${tokenAtRequest}` },
        });
        const json = await res.json().catch(() => ({}));

        if (!mounted) return;

        if (res.ok && json && json.success && json.user) {
          setUser(json.user);
          try {
            const currentToken = await AsyncStorage.getItem("token");
            if (currentToken && tokenAtRequest === currentToken) {
              await AsyncStorage.setItem("user", JSON.stringify(json.user));
            }
          } catch (e) { }
        } else {
          if (json && json.message) setError(json.message);
        }
      } catch (err) {
        if (mounted) setError("Failed to load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
    } catch (e) { }
    router.replace("/Stockist/stockist-login");
  };

  const normalizeImageUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    if (url.startsWith("//")) return `https:${url}`;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return apiUrl(url.startsWith("/") ? url : `/${url}`);
  };

  const profileImg = normalizeImageUrl(
    user?.profileImageUrl || user?.profileImage || user?.photo || (user && user.logo && user.logo.url) || null
  );
  const storeName = user?.name || user?.medicalName || "";
  const ownerName = user?.contactPerson || user?.ownerName || "";
  const emailAddr = user?.email || "";
  const phone = user?.phone || user?.contactNo || user?.cntxNumber || "";
  const addressFormatted =
    typeof user?.address === "object" && user.address !== null
      ? [user.address.street, user.address.city, user.address.state, user.address.pincode].filter(Boolean).join(", ")
      : user?.address || "";
  const licenseNo = user?.licenseNumber || user?.drugLicenseNo || user?.druglicenseNo || null;
  const licenseImg = normalizeImageUrl(user?.licenseImageUrl || user?.drugLicenseImage || user?.licenseImage || null);

  const getInitials = () => {
    const name = user?.ownerName || user?.name || user?.medicalName || "";
    if (!name) return "U";
    return name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  };

  if (loading && !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06b6d4" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.avatarContainer}>
            {profileImg ? (
              <Image source={{ uri: profileImg }} style={styles.avatarImage} />
            ) : (
              <LinearGradient colors={["#22d3ee", "#06b6d4"]} style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{getInitials()}</Text>
              </LinearGradient>
            )}
            <View style={styles.avatarDotOuter} />
            <View style={styles.avatarDotInner} />
          </View>
          <Text style={styles.pageTitle}>Your Profile</Text>
          <Text style={styles.pageSubtitle}>Manage your medical store information</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <View style={styles.errorIconBox}>
              <Text style={styles.errorIconText}>⚠</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Error Loading Profile</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </View>
        ) : null}

        {!user ? (
          <View style={styles.notLoggedInBox}>
            <Text style={styles.notLoggedInText}>You are not logged in.</Text>
            <TouchableOpacity onPress={() => router.push("/Stockist/stockist-login")}>
              <Text style={styles.notLoggedInLink}>Sign in to view your profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.contentGrid}>

            {/* Store Information Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Feather name="box" size={24} color="#06b6d4" />
                <Text style={styles.cardTitle}>Store Information</Text>
              </View>
              <View style={styles.infoGrid}>
                <View style={[styles.infoBox, { backgroundColor: "#ecfeff", borderColor: "#a5f3fc" }]}>
                  <View style={styles.infoBoxHeader}>
                    <Feather name="home" size={18} color="#0891b2" />
                    <Text style={styles.infoBoxLabel}>Medical Store Name</Text>
                  </View>
                  <Text style={styles.infoBoxValue}>{storeName}</Text>
                </View>

                <View style={[styles.infoBox, { backgroundColor: "#fff7ed", borderColor: "#fed7aa" }]}>
                  <View style={styles.infoBoxHeader}>
                    <Feather name="user" size={18} color="#c2410c" />
                    <Text style={styles.infoBoxLabel}>Owner Name</Text>
                  </View>
                  <Text style={styles.infoBoxValue}>{ownerName}</Text>
                </View>

                <View style={[styles.infoBox, { backgroundColor: "#faf5ff", borderColor: "#e9d5ff" }]}>
                  <View style={styles.infoBoxHeader}>
                    <Feather name="mail" size={18} color="#7e22ce" />
                    <Text style={styles.infoBoxLabel}>Email Address</Text>
                  </View>
                  <Text style={styles.infoBoxValue}>{emailAddr}</Text>
                </View>

                <View style={[styles.infoBox, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}>
                  <View style={styles.infoBoxHeader}>
                    <Feather name="phone" size={18} color="#15803d" />
                    <Text style={styles.infoBoxLabel}>Contact Number</Text>
                  </View>
                  <Text style={styles.infoBoxValue}>{phone}</Text>
                </View>
              </View>
            </View>

            {/* Address and License Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Feather name="map-pin" size={24} color="#06b6d4" />
                <Text style={styles.cardTitle}>Location & License</Text>
              </View>
              <View style={styles.verticalInfoList}>
                <View style={[styles.infoBox, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
                  <View style={styles.infoBoxHeader}>
                    <Feather name="map" size={18} color="#2563eb" />
                    <Text style={styles.infoBoxLabel}>Store Address</Text>
                  </View>
                  <Text style={styles.infoBoxValue}>{addressFormatted}</Text>
                </View>

                <View style={[styles.infoBox, { backgroundColor: "#fffbeb", borderColor: "#fef08a", marginTop: 12 }]}>
                  <View style={styles.infoBoxHeader}>
                    <Feather name="file-text" size={18} color="#b45309" />
                    <Text style={styles.infoBoxLabel}>Drug License Number</Text>
                  </View>
                  {licenseNo ? (
                    <Text style={[styles.infoBoxValue, styles.monoText]}>{licenseNo}</Text>
                  ) : (
                    <Text style={[styles.infoBoxValue, { color: "#9ca3af" }]}>Not provided</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Drug License Image Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Feather name="image" size={24} color="#06b6d4" />
                <Text style={styles.cardTitle}>Drug License</Text>
              </View>
              <View style={styles.imageContainer}>
                {licenseImg ? (
                  <Image source={{ uri: licenseImg }} style={styles.licenseImage} resizeMode="contain" />
                ) : (
                  <View style={styles.noImageContainer}>
                    <Feather name="image" size={48} color="#d1d5db" />
                    <Text style={styles.noImageText}>No image uploaded</Text>
                    <Text style={styles.noImageSubText}>Upload your drug license</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Actions Card */}
            <View style={styles.card}>
              <Text style={[styles.cardTitle, { marginBottom: 16 }]}>Quick Actions</Text>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <LinearGradient colors={["#ef4444", "#dc2626"]} style={styles.logoutGradient}>
                  <Feather name="log-out" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.logoutText}>Logout</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", margin: 24, borderRadius: 24, padding: 32 },
  loadingText: { marginTop: 16, fontSize: 16, color: "#475569", fontWeight: "500" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 32, marginTop: 16, position: "relative" },
  backButton: { position: "absolute", left: 0, top: 0, padding: 10, zIndex: 10, backgroundColor: "#e2e8f0", borderRadius: 20 },
  avatarContainer: { position: "relative", marginBottom: 16 },
  avatarImage: { width: 80, height: 80, borderRadius: 24, backgroundColor: "#fff" },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  avatarInitials: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  avatarDotOuter: { position: "absolute", top: -4, right: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: "#fb923c" },
  avatarDotInner: { position: "absolute", bottom: -4, left: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: "#fcd34d" },
  pageTitle: { fontSize: 28, fontWeight: "bold", color: "#06b6d4", marginBottom: 8 },
  pageSubtitle: { fontSize: 15, color: "#64748b", fontWeight: "500" },
  errorBox: { flexDirection: "row", backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 2, padding: 16, borderRadius: 16, marginBottom: 24 },
  errorIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#fee2e2", justifyContent: "center", alignItems: "center", marginRight: 12 },
  errorIconText: { color: "#dc2626", fontSize: 16 },
  errorTitle: { fontWeight: "bold", color: "#991b1b", marginBottom: 4 },
  errorText: { color: "#b91c1c" },
  notLoggedInBox: { backgroundColor: "#fff", padding: 32, borderRadius: 24, alignItems: "center", borderWidth: 2, borderColor: "#f1f5f9" },
  notLoggedInText: { color: "#334155", fontSize: 16, marginBottom: 8 },
  notLoggedInLink: { color: "#0891b2", fontSize: 16, textDecorationLine: "underline" },
  contentGrid: { gap: 16 },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 15, elevation: 4, borderWidth: 1, borderColor: "#f1f5f9", marginBottom: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b", marginLeft: 8 },
  infoGrid: { gap: 12 },
  infoBox: { padding: 16, borderRadius: 16, borderWidth: 1 },
  infoBoxHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  infoBoxLabel: { fontSize: 13, fontWeight: "600", color: "#475569", marginLeft: 8 },
  infoBoxValue: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  verticalInfoList: { gap: 12 },
  monoText: { fontFamily: "monospace", fontSize: 15, letterSpacing: 1 },
  imageContainer: { height: 250, borderRadius: 16, borderWidth: 2, borderColor: "#e5e7eb", borderStyle: "dashed", backgroundColor: "#f8fafc", overflow: "hidden", justifyContent: "center", alignItems: "center" },
  licenseImage: { width: "100%", height: "100%", backgroundColor: "#fff" },
  noImageContainer: { alignItems: "center" },
  noImageText: { marginTop: 12, fontWeight: "bold", color: "#6b7280" },
  noImageSubText: { marginTop: 4, fontSize: 13, color: "#9ca3af" },
  logoutButton: { borderRadius: 16, overflow: "hidden", elevation: 2, shadowColor: "#ef4444", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  logoutGradient: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 14 },
  logoutText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default Profile;
