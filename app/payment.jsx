import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RazorpayCheckout from "../components/RazorpayCheckout";
import { verifySubscriptionPayment } from "../services/payment";
import { secureStorage } from "../utils/secureStore";

export default function PaymentScreen() {
  const router = useRouter();
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await secureStorage.getItem("pendingOrder");
        if (!raw) throw new Error("No pending order found. Please select a plan first.");
        const parsed = JSON.parse(raw);
        if (!parsed.orderId || !parsed.keyId) throw new Error("Incomplete order data.");
        setOrderData(parsed);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  const handleSuccess = async (response) => {
    try {
      const res = await verifySubscriptionPayment({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
      });

      await secureStorage.setItem(
        "lastSubscription",
        JSON.stringify({
          plan: orderData?.plan,
          subscriptionPlan: res.subscriptionPlan,
          subscriptionEndDate: res.subscriptionEndDate,
        })
      );
      await secureStorage.removeItem("pendingOrder");
      router.replace("/payment-pending");
    } catch (verifyErr) {
      Alert.alert("Verification Failed", verifyErr.message || "Please contact support.");
    }
  };

  const handleDismiss = () => {
    Alert.alert("Payment Cancelled", "Complete payment to activate your account.", [
      { text: "Go Back", onPress: () => router.back() },
    ]);
  };

  const handleError = (message) => {
    Alert.alert("Payment Failed", message || "Payment failed. Try again.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!orderData) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#0891b2" />
        <Text style={styles.loadingText}>Preparing payment...</Text>
        <TouchableOpacity
          style={styles.refundLink}
          onPress={() => router.push("/refund-policy")}
        >
          <Text style={styles.refundLinkText}>
            View Refund & Cancellation Policy
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <RazorpayCheckout
      orderData={orderData}
      onSuccess={handleSuccess}
      onError={handleError}
      onDismiss={handleDismiss}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  errorText: { color: "#ef4444", fontSize: 16, textAlign: "center" },
  loadingText: { marginTop: 12, color: "#64748b", fontSize: 15 },
  refundLink: { marginTop: 20, paddingVertical: 8 },
  refundLinkText: {
    color: "#0891b2",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
