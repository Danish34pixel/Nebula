import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl } from "../../config/api";

const { width } = Dimensions.get("window");

export default function StaffDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [stockistName, setStockistName] = useState(null);

  // Load staff data
  const loadStaff = useCallback(async () => {
    if (!id) {
      setError("Staff ID missing in route.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) setUser(JSON.parse(userStr));

      const res = await fetch(apiUrl(`/api/staff/${id}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load staff.");
      }
      setStaff(data?.data || null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // Resolve Stockist Name
  useEffect(() => {
    const resolveStockist = async () => {
      try {
        if (!staff) return;
        const s = staff.stockist;

        // If s is an object
        if (s && typeof s === "object") {
          setStockistName(s.name || s.companyName || s.title || null);
          return;
        }

        // If s is a string ID
        if (s && typeof s === "string") {
          const token = await AsyncStorage.getItem("token");
          const res = await fetch(apiUrl(`/api/stockist/${s}`), {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const data = await res.json().catch(() => ({}));

          if (res.ok && data?.data) {
            setStockistName(data.data.name || data.data.companyName || null);
            return;
          }
        }

        // Fallback to local user
        if (user) {
          setStockistName(user.name || user.companyName || null);
        }
      } catch (e) {
        console.error("Resolve Stockist Failed:", e);
      }
    };
    resolveStockist();
  }, [staff, user]);

  const handleDelete = () => {
    Alert.alert("Delete Staff", "Are you sure you want to delete this staff member?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("token");
            const res = await fetch(apiUrl(`/api/staff/${id}`), {
              method: "DELETE",
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res.ok) {
              Alert.alert("Success", "Staff member deleted successfully.");
              router.back();
            } else {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.message || "Failed to delete staff.");
            }
          } catch (e) {
            Alert.alert("Error", String(e));
          }
        },
      },
    ]);
  };

  const formattedAddress = useMemo(() => {
    if (!staff?.address) return "N/A";
    if (typeof staff.address === "object") {
      const { street, city, state, pincode } = staff.address;
      return [street, city, state, pincode].filter(Boolean).join(", ");
    }
    return staff.address;
  }, [staff]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading staff details...</Text>
      </View>
    );
  }

  if (error || !staff) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error || "Staff not found."}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.cardWrapper}>
          <View style={styles.idCard}>
            {/* Header Curves */}
            <View style={styles.headerCurves}>
              <LinearGradient colors={["#2563eb", "#1e40af"]} style={styles.curveLarge} />
              <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.curveSmall} />
            </View>

            {/* Header Content */}
            <View style={styles.cardHeader}>
              <View style={styles.companyRow}>
                <View style={styles.logoBadge}>
                  <Feather name="user" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.companyName} numberOfLines={1}>
                    {stockistName || "MEDITRAP"}
                  </Text>
                  <Text style={styles.systemTag}>Staff Management System</Text>
                </View>
              </View>
            </View>

            {/* Body */}
            <View style={styles.cardBody}>
              <View style={styles.photoContainer}>
                <View style={[styles.photoFrame, { borderColor: "#2563eb" }]}>
                  <Image
                    source={{
                      uri: staff.image || staff.profileImageUrl || "https://via.placeholder.com/400",
                    }}
                    style={styles.profileImage}
                  />
                </View>
                <View style={styles.idBadge}>
                  <Text style={styles.idBadgeText}>STAFF ID CARD</Text>
                </View>
              </View>

              <Text style={styles.staffName}>{staff.fullName || staff.name}</Text>

              <View style={styles.detailsTable}>
                <DetailRow label="Staff ID" value={staff.staffId || staff.id || "N/A"} />
                <DetailRow
                  label="Joining Date"
                  value={
                    staff.joiningDate ||
                    new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                  }
                />
                <DetailRow label="Contact" value={staff.contact || staff.contactNo || staff.phone || "N/A"} />
                <DetailRow label="Email" value={staff.email || "N/A"} />
                <DetailRow label="Address" value={formattedAddress} multiline />
              </View>
            </View>

            {/* Barcode */}
            <View style={styles.barcodeSection}>
              <View style={styles.barcodeLines}>
                {[3, 7, 2, 8, 4, 9, 3, 5, 7, 2, 8, 4, 6, 3, 7, 2, 9, 4, 8, 3, 7, 2, 5, 8].map((h, i) => (
                  <View key={i} style={[styles.barcodeLine, { height: h * 6 }]} />
                ))}
              </View>
              <Text style={styles.barcodeLabel}>{staff.staffId || staff.id || "000000000000"}</Text>
            </View>

            {/* Footer Curves */}
            <View style={styles.footerCurves}>
              <LinearGradient colors={["#1e40af", "#2563eb"]} style={styles.curveLargeBottom} />
              <LinearGradient colors={["#2563eb", "#3b82f6"]} style={styles.curveSmallBottom} />
            </View>
            <View style={styles.footerAccent} />
          </View>
          <Text style={styles.tagline}>Official Staff Identification Card</Text>
        </View>

        {/* Actions for Admin */}
        {user?.role === "admin" ? (
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.editBtn} onPress={() => Alert.alert("Feature Coming Soon", "Edit functionality will be available in the next update.")}>
              <Feather name="edit-2" size={18} color="#fff" />
              <Text style={styles.btnText}>Edit Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Feather name="trash-2" size={18} color="#fff" />
              <Text style={styles.btnText}>Delete Member</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionText}>Review staff profile in management dashboard</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const DetailRow = ({ label, value, multiline }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailColon}>:</Text>
    <Text style={[styles.detailValue, multiline && { flex: 1 }]} numberOfLines={multiline ? 2 : 1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#64748b", fontWeight: "600" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  errorText: { marginTop: 16, color: "#1e293b", textAlign: "center", fontSize: 16, fontWeight: "600" },
  backBtn: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 32, backgroundColor: "#2563eb", borderRadius: 12 },
  backBtnText: { color: "#fff", fontWeight: "700" },
  scrollContent: { padding: 20 },
  cardWrapper: { alignItems: "center", marginBottom: 24 },
  idCard: {
    width: width * 0.9,
    backgroundColor: "#fff",
    borderRadius: 32,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  headerCurves: { position: "absolute", top: 0, right: 0, left: 0, height: 120, zIndex: 0 },
  curveLarge: { position: "absolute", top: 0, right: 0, width: "100%", height: 110, borderBottomLeftRadius: 1000 },
  curveSmall: { position: "absolute", top: 0, right: 0, width: "80%", height: 80, borderBottomLeftRadius: 1000 },
  cardHeader: { padding: 24, zIndex: 1 },
  companyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#2563eb", justifyContent: "center", alignItems: "center" },
  companyName: { fontSize: 20, fontWeight: "900", color: "#fff" },
  systemTag: { fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  cardBody: { padding: 24, alignItems: "center" },
  photoContainer: { position: "relative", marginBottom: 20 },
  photoFrame: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, overflow: "hidden", backgroundColor: "#f1f5f9" },
  profileImage: { width: "100%", height: "100%" },
  idBadge: {
    position: "absolute",
    bottom: -15,
    alignSelf: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  idBadgeText: { color: "#fff", fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  staffName: { fontSize: 28, fontWeight: "900", color: "#1e3a8a", marginTop: 12, textAlign: "center" },
  detailsTable: { width: "100%", marginTop: 24, gap: 12 },
  detailRow: { flexDirection: "row", alignItems: "flex-start" },
  detailLabel: { width: 100, fontSize: 14, fontWeight: "700", color: "#64748b" },
  detailColon: { marginHorizontal: 8, color: "#cbd5e1" },
  detailValue: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  barcodeSection: { marginTop: 20, alignItems: "center", zIndex: 1, backgroundColor: "#fff", padding: 12, borderRadius: 12 },
  barcodeLines: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 60 },
  barcodeLine: { width: 2, backgroundColor: "#000", borderRadius: 1 },
  barcodeLabel: { fontSize: 10, color: "#64748b", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", marginTop: 4 },
  footerCurves: { position: "absolute", bottom: 0, left: 0, right: 0, height: 100, zIndex: 0 },
  curveLargeBottom: { position: "absolute", bottom: 0, left: 0, width: "100%", height: 80, borderTopRightRadius: 1000 },
  curveSmallBottom: { position: "absolute", bottom: 0, left: 0, width: "70%", height: 60, borderTopRightRadius: 1000 },
  footerAccent: { position: "absolute", bottom: 0, left: 0, right: 0, height: 8, backgroundColor: "#2563eb", opacity: 0.5 },
  tagline: { fontSize: 12, color: "#94a3b8", textAlign: "center", fontStyle: "italic", marginTop: 8 },
  actionsContainer: { gap: 12, marginHorizontal: 20 },
  editBtn: { backgroundColor: "#2563eb", height: 56, borderRadius: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 },
  deleteBtn: { backgroundColor: "#ef4444", height: 56, borderRadius: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  permissionInfo: { padding: 16, backgroundColor: "#f1f5f9", borderRadius: 12, alignItems: "center" },
  permissionText: { fontSize: 13, color: "#64748b", fontWeight: "600" },
});
