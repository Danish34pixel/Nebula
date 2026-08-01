import { postJson } from "../config/api";

// Creates a Razorpay order for the given plan. Shared by the full
// SubscriptionPlans picker and the inline trial-expired payment flow.
export const createSubscriptionOrder = (planKey) =>
  postJson("/payment/create-order", { planKey });

// Verifies a completed Razorpay checkout against the backend.
export const verifySubscriptionPayment = ({
  razorpay_payment_id,
  razorpay_order_id,
  razorpay_signature,
}) =>
  postJson("/payment/verify", {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
  });
