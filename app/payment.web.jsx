import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { postJson } from "../config/api";
import { secureStorage } from "../utils/secureStore";

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.head.appendChild(script);
  });
}

export default function PaymentScreenWeb() {
  const router = useRouter();
  const [status, setStatus] = useState("loading"); // loading | ready | verifying | error
  const [errorMsg, setErrorMsg] = useState("");
  const rzpRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const raw = await secureStorage.getItem("pendingOrder");
        if (!raw) throw new Error("No pending order. Please select a plan first.");
        const orderData = JSON.parse(raw);
        if (!orderData.orderId || !orderData.keyId) throw new Error("Incomplete order data.");

        await loadRazorpayScript();
        if (cancelled) return;

        const options = {
          key: orderData.keyId,
          amount: String(orderData.amount),
          currency: orderData.currency || "INR",
          order_id: orderData.orderId,
          name: "MedTrap",
          description: orderData.plan?.label || "Subscription",

          handler: async (response) => {
            setStatus("verifying");
            try {
              const res = await postJson("/payment/verify", {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              });
              await secureStorage.setItem(
                "lastSubscription",
                JSON.stringify({
                  plan: orderData.plan,
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
          },

          modal: {
            ondismiss: () => {
              setStatus("error");
              setErrorMsg("Payment cancelled. Go back to select a plan and try again.");
            },
          },

          prefill: {},
          theme: { color: "#0891b2" },
        };

        rzpRef.current = new window.Razorpay(options);
        rzpRef.current.on("payment.failed", (resp) => {
          setStatus("error");
          setErrorMsg(resp.error?.description || "Payment failed. Please try again.");
        });

        setStatus("ready");
        rzpRef.current.open();
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg(err.message);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (status === "loading" || status === "ready") {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#0891b2" />
        <Text style={styles.loadingText}>
          {status === "ready" ? "Opening payment window…" : "Preparing payment…"}
        </Text>
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
