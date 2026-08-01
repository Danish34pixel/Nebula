import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RazorpayCheckout from "../components/RazorpayCheckout";
import { verifySubscriptionPayment } from "../services/payment";
import { secureStorage } from "../utils/secureStore";

export default function PaymentScreenWeb() {
  const router = useRouter();
  const [status, setStatus] = useState("loading"); // loading | ready | verifying | error
  const [errorMsg, setErrorMsg] = useState("");
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const raw = await secureStorage.getItem("pendingOrder");
        if (!raw) throw new Error("No pending order. Please select a plan first.");
        const parsed = JSON.parse(raw);
        if (!parsed.orderId || !parsed.keyId) throw new Error("Incomplete order data.");
        if (!cancelled) {
          setOrderData(parsed);
          setStatus("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg(err.message);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSuccess = async (response) => {
    setStatus("verifying");
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
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Payment verification failed. Contact support.");
    }
  };

  const handleDismiss = () => {
    setStatus("error");
    setErrorMsg("Payment cancelled. Go back to select a plan and try again.");
  };

  const handleError = (message) => {
    setStatus("error");
    setErrorMsg(message || "Payment failed. Please try again.");
  };

  if (status === "loading" || status === "ready") {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#0891b2" />
        <Text style={styles.loadingText}>
          {status === "ready" ? "Opening payment window…" : "Preparing payment…"}
        </Text>
        {status === "ready" && (
          <RazorpayCheckout
            orderData={orderData}
            onSuccess={handleSuccess}
            onError={handleError}
            onDismiss={handleDismiss}
          />
        )}
      </SafeAreaView>
    );
  }

  if (status === "verifying") {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Verifying payment…</Text>
      </SafeAreaView>
    );
  }

  // error
  return (
    <SafeAreaView style={styles.center}>
      <Text style={styles.errorText}>{errorMsg}</Text>
      <Text
        style={styles.backLink}
        onPress={() => router.replace("/SubscriptionPlans")}
      >
        ← Back to plans
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 28 },
  loadingText: { marginTop: 14, color: "#64748b", fontSize: 15, textAlign: "center" },
  errorText: { color: "#ef4444", fontSize: 15, textAlign: "center", marginBottom: 20 },
  backLink: { color: "#0891b2", fontSize: 15, fontWeight: "600" },
});
