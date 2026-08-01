import { StyleSheet, View } from "react-native";
import WebView from "react-native-webview";

function buildCheckoutHtml(orderData) {
  return `<!DOCTYPE html>
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
</html>`;
}

// Native (WebView-based) Razorpay checkout. Shared by app/payment.jsx and
// any other screen that needs to trigger the same checkout inline — same
// key/handler/theme, no matter who mounts it.
export default function RazorpayCheckout({ orderData, onSuccess, onError, onDismiss }) {
  if (!orderData) return null;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.status === "success") {
        onSuccess(data);
      } else if (data.status === "dismissed") {
        onDismiss();
      } else {
        onError(data.error?.description || "Payment failed. Try again.");
      }
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: buildCheckoutHtml(orderData) }}
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
  webview: { flex: 1 },
});
