import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { secureStorage } from "../utils/secureStore";

// Shown in place of the dashboard when paymentStatus === "payment_due".
// Routes into the existing SubscriptionPlans -> payment(.web) -> payment-pending
// flow, which still owns the actual Razorpay checkout — this component only
// decides when that flow gets triggered.
export default function PaymentRequiredGate() {
  const router = useRouter();

  const handleLogout = async () => {
    await secureStorage.removeItem("token");
    await secureStorage.removeItem("refreshToken");
    await AsyncStorage.removeItem("user");
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Feather name="lock" size={44} color="#dc2626" />
        </View>
        <Text style={styles.title}>Payment Required</Text>
        <Text style={styles.subtitle}>
          Your free trial has ended. Complete your subscription payment to
          keep using MedTrap.
        </Text>

        <TouchableOpacity
          style={styles.payBtn}
          onPress={() => router.push("/SubscriptionPlans")}
          activeOpacity={0.85}
        >
          <Text style={styles.payBtnText}>Complete Payment</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#475569",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#0891b2",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: "100%",
  },
  payBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  logoutBtn: { marginTop: 20 },
  logoutText: { color: "#64748b", fontWeight: "600", fontSize: 14 },
});
