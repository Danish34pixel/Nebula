import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

// Mock Logo component
const Logo = ({ style }) => (
  <View style={[styles.logoRow, style]}>
    <View style={styles.logoCircle}>
      <Feather name="shield" size={14} color="#fff" />
    </View>
    <Text style={styles.logoText}>MEDITRAP</Text>
  </View>
);

const Avatar = ({ name, size = 100, style }) => {
  const initials =
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const colors = [
    ["#6366f1", "#a855f7"], // indigo-500 to purple-500
    ["#3b82f6", "#2dd4bf"], // blue-500 to teal-400
    ["#f43f5e", "#fb923c"], // rose-500 to orange-400
    ["#8b5cf6", "#ec4899"], // violet-500 to pink-500
  ];
  const colorIndex = name?.charCodeAt(0) % colors.length || 0;

  return (
    <LinearGradient
      colors={colors[colorIndex]}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2.5,
          justifyContent: "center",
          alignItems: "center",
        },
        style,
      ]}
    >
      <Text style={{ color: "#fff", fontWeight: "900", fontSize: size / 2.8 }}>
        {initials}
      </Text>
    </LinearGradient>
  );
};

function formatDate(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "—";
    const options = { year: 'numeric', month: 'short', day: '2-digit' };
    return dt.toLocaleDateString(undefined, options);
  } catch {
    return "—";
  }
}

export default function IdentityCard({ stockist, qrDataUrl, onPrint }) {
  if (!stockist) return null;

  const displayName = stockist.contactPerson || stockist.name || "Authorized User";
  const idNum = stockist._id ? String(stockist._id).slice(-8).toUpperCase() : "MT-88291";

  return (
    <View style={styles.container}>
      <View style={styles.cardFrame}>
        {/* Main Background Gradient */}
        <LinearGradient
          colors={["#ffffff", "#f8fafc"]}
          style={styles.cardContent}
        >
          {/* Header Section */}
          <LinearGradient
            colors={["#4338ca", "#6366f1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerTop}>
              <Logo />
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>VERIFIED</Text>
              </View>
            </View>
            
            {/* Card Pattern Decoration */}
            <View style={styles.patternLayer}>
              <View style={[styles.patternCircle, { left: -50, top: -20, opacity: 0.1 }]} />
              <View style={[styles.patternCircle, { right: -30, bottom: -10, opacity: 0.15 }]} />
            </View>
          </LinearGradient>

          {/* Profile Section (Overlapping) */}
          <View style={styles.profileSection}>
            <View style={styles.photoWrapper}>
              {stockist.profileImageUrl ? (
                <Image
                  source={{ uri: stockist.profileImageUrl }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Avatar name={displayName} size={100} />
                </View>
              )}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.5)"]}
                style={styles.photoOverlay}
              />
            </View>
            
            <View style={styles.nameBadge}>
              <Text style={styles.roleText}>
                {String(stockist.role || stockist.roleType || "STOCKIST").toUpperCase().replace("PROPRITER", "PROPRIETOR")}
              </Text>
            </View>
          </View>

          {/* User Details Section */}
          <View style={styles.infoBody}>
            <Text style={styles.nameText} numberOfLines={1}>
              {displayName}
            </Text>
            
            <View style={styles.idContainer}>
              <Text style={styles.idLabel}>ID NO:</Text>
              <Text style={styles.idValue}>{idNum}</Text>
            </View>

            {/* Grid Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Feather name="user" size={12} color="#6366f1" />
                <Text style={styles.statValue} numberOfLines={1}>
                  {stockist.contactPerson || stockist.fullName || displayName}
                </Text>
                <Text style={styles.statLabel}>FULL NAME</Text>
              </View>
              <View style={styles.dividerV} />
              <View style={styles.statItem}>
                <Feather name="briefcase" size={12} color="#6366f1" />
                <Text style={styles.statValue} numberOfLines={1}>
                  {stockist.name || stockist.companyName || stockist.firmName || "N/A"}
                </Text>
                <Text style={styles.statLabel}>FIRM NAME</Text>
              </View>
              <View style={styles.dividerV} />
              <View style={styles.statItem}>
                <Feather name="droplet" size={12} color="#ef4444" />
                <Text style={styles.statValue} numberOfLines={1}>
                  {stockist.bloodGroup || stockist.blood || stockist.user?.bloodGroup || "O+"}
                </Text>
                <Text style={styles.statLabel}>BLOOD</Text>
              </View>
            </View>

            {/* QR and Security Section */}
            <View style={styles.bottomSection}>
              <View style={styles.qrGlassBox}>
                <View style={styles.qrInner}>
                  {qrDataUrl ? (
                    <Image source={{ uri: qrDataUrl }} style={styles.qrImage} />
                  ) : (
                    <Feather name="maximize" size={32} color="#e2e8f0" />
                  )}
                </View>
                <Text style={styles.scanHint}>SCAN TO VERIFY</Text>
              </View>
              
              <View style={styles.securitySeal}>
                <Feather name="shield" size={24} color="#f59e0b" />
                <Text style={styles.sealText}>AUTHENTIC</Text>
              </View>
            </View>
          </View>

        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    width: "100%",
    alignItems: "center",
  },
  cardFrame: {
    width: 320,
    height: 480,
    borderRadius: 32,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#1e1b4b",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
      },
      android: { elevation: 12 },
    }),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  cardContent: {
    flex: 1,
  },
  header: {
    height: 160,
    padding: 24,
    position: "relative",
    overflow: "hidden",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" },
  statusText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  patternLayer: { ...StyleSheet.absoluteFillObject },
  patternCircle: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#fff",
  },
  profileSection: {
    alignItems: "center",
    marginTop: -60,
    zIndex: 20,
  },
  photoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: "#fff",
    backgroundColor: "#fff",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  profileImage: { width: "100%", height: "100%" },
  avatarPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  photoOverlay: { ...StyleSheet.absoluteFillObject },
  nameBadge: {
    backgroundColor: "#1e1b4b",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: -15,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  roleText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  infoBody: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 15,
  },
  nameText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1e1b4b",
    marginBottom: 4,
    textAlign: "center",
  },
  idContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  idLabel: { fontSize: 12, color: "#64748b", fontWeight: "700" },
  idValue: { fontSize: 12, color: "#4338ca", fontWeight: "800", letterSpacing: 1 },
  statsGrid: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statValue: { fontSize: 11, fontWeight: "800", color: "#1e293b" },
  statLabel: { fontSize: 8, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" },
  dividerV: { width: 1, height: "100%", backgroundColor: "#e2e8f0" },
  bottomSection: {
    flexDirection: "row",
    width: "100%",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  qrGlassBox: {
    alignItems: "center",
    gap: 8,
  },
  qrInner: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  qrImage: { width: 70, height: 70 },
  scanHint: { fontSize: 9, fontWeight: "900", color: "#64748b" },
  securitySeal: {
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  sealText: { fontSize: 9, fontWeight: "900", color: "#f59e0b", letterSpacing: 1 },
});
