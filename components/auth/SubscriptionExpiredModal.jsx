import { Feather } from "@expo/vector-icons";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Shown at login time when the backend reports the trial/subscription has
// expired (AuthFlowScreen's trialExpired flag). Pay Now reuses the same
// handleGoToPayment -> /SubscriptionPlans -> payment.jsx chain as before;
// this component only changes how the message is presented (modal vs inline banner).
export const SubscriptionExpiredModal = ({
  visible,
  message,
  onPayNow,
  onClose,
  payButtonLabel = "Pay Now",
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Feather name="lock" size={36} color="#dc2626" />
        </View>
        <Text style={styles.title}>Subscription Required</Text>
        <Text style={styles.message}>{message}</Text>

        <TouchableOpacity
          style={styles.payBtn}
          onPress={onPayNow}
          activeOpacity={0.85}
        >
          <Text style={styles.payBtnText}>{payButtonLabel}</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#dc2626",
    borderRadius: 14,
    paddingVertical: 14,
    width: "100%",
  },
  payBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  closeBtn: { marginTop: 16 },
  closeText: { color: "#64748b", fontWeight: "600", fontSize: 13 },
});
