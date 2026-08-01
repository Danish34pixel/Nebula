import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PLANS } from "../constants/subscriptionPlans";
import { createSubscriptionOrder } from "../services/payment";
import { secureStorage } from "../utils/secureStore";

export default function SubscriptionPlans() {
  const router = useRouter();
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selected) {
      Alert.alert("Select a plan", "Please choose a subscription plan to continue.");
      return;
    }

    setLoading(true);
    try {
      const res = await createSubscriptionOrder(selected);
      if (!res.success) throw new Error(res.message || "Failed to create order");

      // Pass order data to payment screen via SecureStore (route params can't carry this safely)
      await secureStorage.setItem("pendingOrder", JSON.stringify(res));
      router.replace("/payment");
    } catch (err) {
      Alert.alert("Error", err.message || "Could not start payment. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={["#f0f9ff", "#f8fafc"]} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Subscribe to unlock full access to MedTrap
          </Text>
        </View>

        <View style={styles.plans}>
          {PLANS.map((plan) => {
            const isSelected = selected === plan.key;
            return (
              <TouchableOpacity
                key={plan.key}
                onPress={() => setSelected(plan.key)}
                activeOpacity={0.85}
                style={[styles.card, isSelected && styles.cardSelected]}
              >
                {plan.badge && (
                  <View style={styles.badgeWrap}>
                    <LinearGradient
                      colors={plan.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.badge}
                    >
                      <Text style={styles.badgeText}>{plan.badge}</Text>
                    </LinearGradient>
                  </View>
                )}

                <View style={styles.cardRow}>
                  <View style={styles.cardLeft}>
                    <LinearGradient
                      colors={plan.gradient}
                      style={styles.iconCircle}
                    >
                      <Feather name="calendar" size={18} color="#fff" />
                    </LinearGradient>
                    <View style={styles.cardText}>
                      <Text style={styles.planLabel}>{plan.label}</Text>
                      <Text style={styles.planDesc}>{plan.description}</Text>
                    </View>
                  </View>

                  <View style={styles.cardRight}>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                    <View
                      style={[
                        styles.radio,
                        isSelected && styles.radioSelected,
                      ]}
                    >
                      {isSelected && (
                        <View style={styles.radioDot} />
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.features}>
          {[
            "Full access to all medicines & demands",
            "Admin-verified account",
            "Priority support",
          ].map((f) => (
            <View key={f} style={styles.featureRow}>
              <Feather name="check-circle" size={16} color="#10b981" />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.ctaBtn, !selected && styles.ctaBtnDisabled]}
          onPress={handleContinue}
          disabled={loading || !selected}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={selected ? ["#0891b2", "#0e7490"] : ["#cbd5e1", "#94a3b8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.ctaText}>
                  {selected
                    ? `Pay ${PLANS.find((p) => p.key === selected)?.price}`
                    : "Select a Plan"}
                </Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.refundLink}
          onPress={() => router.push("/refund-policy")}
        >
          <Text style={styles.refundLinkText}>
            View Refund & Cancellation Policy
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24 },
  header: { marginBottom: 28, marginTop: 8 },
  title: { fontSize: 28, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  subtitle: { fontSize: 15, color: "#475569" },
  plans: { gap: 14, marginBottom: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    position: "relative",
    overflow: "hidden",
  },
  cardSelected: {
    borderColor: "#0891b2",
    backgroundColor: "#f0f9ff",
  },
  badgeWrap: { position: "absolute", top: 0, right: 0 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderBottomLeftRadius: 12 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardText: { flex: 1 },
  planLabel: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 2 },
  planDesc: { fontSize: 12, color: "#64748b" },
  cardRight: { alignItems: "flex-end", gap: 8 },
  planPrice: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: { borderColor: "#0891b2" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#0891b2" },
  features: { gap: 10, marginBottom: 28 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { fontSize: 14, color: "#475569" },
  ctaBtn: { borderRadius: 18, overflow: "hidden" },
  ctaBtnDisabled: { opacity: 0.7 },
  ctaGradient: {
    height: 58,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  refundLink: { alignItems: "center", marginTop: 16, paddingVertical: 8 },
  refundLinkText: {
    color: "#0891b2",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
