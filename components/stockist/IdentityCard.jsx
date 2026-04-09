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
  <Text style={[styles.logoText, style]}>LUVOX PVT LTD</Text>
);

const Avatar = ({ name, size = 48, style }) => {
  const initials =
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const colors = [
    ["#fb923c", "#f472b6"], // orange-400 to pink-400
    ["#22d3ee", "#60a5fa"], // cyan-400 to blue-400
    ["#c084fc", "#f472b6"], // purple-400 to pink-400
    ["#4ade80", "#22d3ee"], // green-400 to cyan-400
  ];
  const colorIndex = name?.charCodeAt(0) % colors.length || 0;

  return (
    <LinearGradient
      colors={colors[colorIndex]}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          justifyContent: "center",
          alignItems: "center",
        },
        style,
      ]}
    >
      <Text style={{ color: "#fff", fontWeight: "bold", fontSize: size / 2.5 }}>
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
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return dt.toLocaleDateString(undefined, options);
  } catch {
    return "—";
  }
}

export default function IdentityCard({ stockist, qrDataUrl, onPrint }) {
  if (!stockist) return null;

  const displayName = stockist.contactPerson || stockist.name || "Employee Name";
  const idNum = stockist._id ? String(stockist._id).slice(-8).toUpperCase() : "00000000";

  return (
    <View style={styles.container}>
      <View style={styles.cardFrame}>
        <View style={styles.cardContent}>
          {/* Header */}
          <LinearGradient
            colors={["#1e3a8a", "#1e40af"]}
            style={styles.header}
          >
            <Logo style={styles.logoText} />
            <View style={styles.authorizedBadge}>
              <Text style={styles.authorizedText}>AUTHORIZED</Text>
            </View>
          </LinearGradient>

          {/* Accent Stripe */}
          <View style={styles.accentStripe} />

          {/* Body */}
          <View style={styles.body}>
            {/* Photo Section */}
            <View style={styles.photoContainer}>
              {/* Corner Brackets */}
              <View style={[styles.bracket, styles.bracketTL]} />
              <View style={[styles.bracket, styles.bracketTR]} />
              <View style={[styles.bracket, styles.bracketBL]} />
              <View style={[styles.bracket, styles.bracketBR]} />

              {stockist.profileImageUrl ? (
                <Image
                  source={{ uri: stockist.profileImageUrl }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Avatar name={displayName} size={80} />
                </View>
              )}
            </View>

            {/* Role Badge */}
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {stockist.roleType || stockist.designation || "STOCKIST"}
              </Text>
            </View>

            {/* Name */}
            <Text style={styles.nameText} numberOfLines={2}>
              {displayName.toUpperCase()}
            </Text>

            {/* Underline */}
            <LinearGradient
              colors={["#2563eb", "#fbbf24"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.underline}
            />

            {/* ID Section */}
            <View style={styles.idBox}>
              <Text style={styles.idLabel}>ID NUMBER</Text>
              <Text style={styles.idValue}>{idNum}</Text>
            </View>

            {/* Contact Info Table */}
            <View style={styles.infoTable}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>PHONE</Text>
                <Text style={styles.infoValue}>
                  {stockist.phone || stockist.contactNo || "—"}
                </Text>
              </View>

              <View style={styles.gridRow}>
                <View style={[styles.infoCol, { flex: 1 }]}>
                  <Text style={styles.infoLabel}>DOB</Text>
                  <Text style={styles.infoValue}>{formatDate(stockist.dob)}</Text>
                </View>
                <View style={[styles.infoCol, { flex: 0.5 }]}>
                  <Text style={styles.infoLabel}>BLOOD</Text>
                  <Text style={styles.infoValue}>{stockist.bloodGroup || "—"}</Text>
                </View>
              </View>
            </View>

            {/* QR Section */}
            <View style={styles.qrSection}>
              <View style={styles.qrWrapper}>
                {qrDataUrl ? (
                  <Image source={{ uri: qrDataUrl }} style={styles.qrImage} />
                ) : (
                  <View style={styles.qrPlaceholder}>
                    <Feather name="grid" size={32} color="#1e3a8a" />
                  </View>
                )}
              </View>
              <Text style={styles.scanLabel}>SCAN ID</Text>
            </View>

            {/* Signature Area */}
            <View style={styles.signatureArea}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>AUTHORIZED SIGN</Text>
            </View>
          </View>

          {/* Footer */}
          <LinearGradient
            colors={["#1e3a8a", "#1e40af"]}
            style={styles.footer}
          >
            <Text style={styles.addressText} numberOfLines={1}>
              {typeof stockist.address === "object" && stockist.address
                ? `${stockist.address.street || ""}, ${stockist.address.city || ""}, ${stockist.address.state || ""} - ${stockist.address.pincode || ""}`
                : stockist.address || stockist.location || "N/A"}
            </Text>
            <Text style={styles.webText}>www.luvox.com</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Print Button */}
      <TouchableOpacity onPress={onPrint} style={styles.printBtn}>
        <Feather name="printer" size={20} color="#fff" />
        <Text style={styles.printBtnText}>PRINT ID CARD</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: "center",
  },
  cardFrame: {
    width: 280,
    height: 480,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  cardContent: {
    flex: 1,
  },
  header: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 8,
  },
  logoText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
  },
  authorizedBadge: {
    backgroundColor: "#fbbf24",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 50,
    marginTop: 4,
  },
  authorizedText: {
    color: "#1e3a8a",
    fontSize: 8,
    fontWeight: "900",
  },
  accentStripe: {
    height: 4,
    backgroundColor: "#fbbf24",
  },
  body: {
    flex: 1,
    alignItems: "center",
    padding: 12,
  },
  photoContainer: {
    position: "relative",
    width: 84,
    height: 84,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  bracket: {
    position: "absolute",
    width: 12,
    height: 12,
    borderColor: "#2563eb",
  },
  bracketTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  bracketTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  bracketBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  bracketBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  roleBadge: {
    backgroundColor: "#1e3a8a",
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  roleText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
  nameText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  underline: {
    height: 2,
    width: 48,
    marginBottom: 12,
  },
  idBox: {
    width: "100%",
    backgroundColor: "#f9fafb",
    borderLeftWidth: 4,
    borderLeftColor: "#2563eb",
    padding: 6,
    borderRadius: 4,
    marginBottom: 12,
  },
  idLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#6b7280",
    marginBottom: 2,
  },
  idValue: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1e3a8a",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  infoTable: {
    width: "100%",
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
  },
  infoCol: {
    gap: 2,
  },
  infoLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#6b7280",
  },
  infoValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#111827",
  },
  qrSection: {
    alignItems: "center",
    backgroundColor: "#f9fafb",
    width: "100%",
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  qrWrapper: {
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2563eb",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  qrImage: {
    width: 64,
    height: 64,
  },
  qrPlaceholder: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  scanLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: "#374151",
    marginTop: 6,
  },
  signatureArea: {
    width: "100%",
    alignItems: "center",
    marginTop: "auto",
  },
  signatureLine: {
    width: 80,
    height: 1,
    backgroundColor: "#9ca3af",
    marginBottom: 2,
  },
  signatureLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#6b7280",
  },
  footer: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  addressText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 8,
    fontWeight: "600",
    marginBottom: 2,
  },
  webText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
  printBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e40af",
    width: 280,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    gap: 10,
  },
  printBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
  },
});
