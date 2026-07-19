import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import { postJson } from "../config/api";
import { secureStorage } from "../utils/secureStore";

export default function PaymentScreen() {
  const router = useRouter();
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState(null);
  const webViewRef = useRef(null);

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

  const htmlContent = orderData
    ? `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
var options = {
  key: "${orderData.keyId}",
  amount: "${orderData.amount}",
  currency: "${orderData.currency || "INR"}",
  order_id: "${orderData.orderId}",
  name: "MedTrap",
  description: "${orderData.plan?.label || "Subscription"}",
  handler: function(response) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ status: "success", ...response }));
  },
  modal: {
    ondismiss: function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ status: "dismissed" }));
    }
  }
};
var rzp = new Razorpay(options);
rzp.on("payment.failed", function(resp) {
  window.ReactNativeWebView.postMessage(JSON.stringify({ status: "failed", error: resp.error }));
});
rzp.open();
</script>
</body>
</html>`
    : null;

  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.status === "success") {
        try {
          const res = await postJson("/payment/verify", {
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_order_id: data.razorpay_order_id,
            razorpay_signature: data.razorpay_signature,
          });

          // Store plan info for the pending screen
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
      } else if (data.status === "dismissed") {
        Alert.alert("Payment Cancelled", "Complete payment to activate your account.", [
          { text: "Go Back", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Payment Failed", data.error?.description || "Payment failed. Try again.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch {
      // ignore malformed messages
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!htmlContent) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#0891b2" />
        <Text style={styles.loadingText}>Preparing payment...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: htmlContent }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  webview: { flex: 1 },
  errorText: { color: "#ef4444", fontSize: 16, textAlign: "center" },
  loadingText: { marginTop: 12, color: "#64748b", fontSize: 15 },
});
