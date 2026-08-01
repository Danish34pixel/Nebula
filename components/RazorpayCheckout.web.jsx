import { useEffect, useRef } from "react";

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

// Web Razorpay checkout (window.Razorpay + checkout.js). Metro/webpack picks
// this file over RazorpayCheckout.jsx automatically on web builds. Renders
// nothing itself — Razorpay draws its own overlay on top of the page.
export default function RazorpayCheckout({ orderData, onSuccess, onError, onDismiss }) {
  const rzpRef = useRef(null);

  useEffect(() => {
    if (!orderData) return;
    let cancelled = false;

    (async () => {
      try {
        if (!orderData.orderId || !orderData.keyId) {
          throw new Error("Incomplete order data.");
        }
        await loadRazorpayScript();
        if (cancelled) return;

        const options = {
          key: orderData.keyId,
          amount: String(orderData.amount),
          currency: orderData.currency || "INR",
          order_id: orderData.orderId,
          name: "MedTrap",
          description: orderData.plan?.label || "Subscription",
          handler: (response) => onSuccess(response),
          modal: {
            ondismiss: () => onDismiss(),
          },
          prefill: {},
          theme: { color: "#0891b2" },
        };

        rzpRef.current = new window.Razorpay(options);
        rzpRef.current.on("payment.failed", (resp) => {
          onError(resp.error?.description || "Payment failed. Please try again.");
        });
        rzpRef.current.open();
      } catch (err) {
        if (!cancelled) onError(err.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderData]);

  return null;
}
