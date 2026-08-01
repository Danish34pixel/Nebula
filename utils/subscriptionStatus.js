import { fetchJson } from "../config/api";

// Fetches the current user's payment/subscription state from the API.
// Reuses /auth/me, the existing "who am I" endpoint, so this works
// uniformly right after signup or after login.
export async function fetchSubscriptionStatus() {
  const res = await fetchJson("/auth/me");
  const user = res?.user || {};
  return {
    paymentStatus: user.paymentStatus,
    subscriptionEndDate: user.subscriptionEndDate,
  };
}

// Whole days remaining until subscriptionEndDate (0 if already past/today).
// Returns null when there's no valid end date to compute from.
export function daysRemaining(subscriptionEndDate) {
  if (!subscriptionEndDate) return null;
  const end = new Date(subscriptionEndDate).getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
}
