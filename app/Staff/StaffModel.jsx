import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function StaffModel({ staff, onClose }) {
  const router = useRouter();

  if (!staff) return null;

  const qrUrl = useMemo(() => {
    // Correct frontend URL for the staff profile
    const profileUrl = `https://meditrap.com/Staff/${staff._id}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      profileUrl
    )}`;
  }, [staff._id]);

  const formattedAddress = useMemo(() => {
    if (!staff.address) return "N/A";
    if (typeof staff.address === "object") {
      const { street, city, state, pincode } = staff.address;
      return [street, city, state, pincode].filter(Boolean).join(", ");
    }
    return staff.address;
  }, [staff.address]);

  const handleOpenFull = () => {
    onClose();
    router.push(`/Staff/${staff._id}`);
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!staff}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={styles.backdrop}
        />
        
        <View style={styles.modalCard}>
          <View style={styles.cardHeader}>
            <Image
              source={{
                uri: staff.image || staff.profileImageUrl || "https://via.placeholder.com/400",
              }}
              style={styles.profileImage}
            />
            <View style={styles.headerInfo}>
              <Text style={styles.staffName} numberOfLines={1}>
                {staff.fullName || staff.name}
              </Text>
              <Text style={styles.staffContact}>{staff.contact || staff.phone || "N/A"}</Text>
              <Text style={styles.staffEmail} numberOfLines={1}>{staff.email || "N/A"}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.addressBox}>
            <Feather name="map-pin" size={14} color="#94a3b8" />
            <Text style={styles.addressText} numberOfLines={2}>
              {formattedAddress}
            </Text>
          </View>

          <View style={styles.qrSection}>
            <View style={styles.qrWrapper}>
              <Image source={{ uri: qrUrl }} style={styles.qrImage} />
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={handleOpenFull}
                style={styles.openFullBtn}
              >
                <Text style={styles.openFullText}>Open Full Profile</Text>
                <Feather name="external-link" size={16} color="#fff" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
              <Text style={styles.qrLabel}>Scan to view profile</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: width * 0.9,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  staffName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 4,
  },
  staffContact: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 2,
  },
  staffEmail: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  closeBtn: {
    padding: 4,
  },
  addressBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 24,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: "#475569",
    marginLeft: 8,
    fontWeight: "500",
  },
  qrSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qrWrapper: {
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  qrImage: {
    width: 100,
    height: 100,
  },
  actions: {
    flex: 1,
    marginLeft: 20,
    alignItems: "stretch",
  },
  openFullBtn: {
    backgroundColor: "#10b981",
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  openFullText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  qrLabel: {
    textAlign: "center",
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },
});
