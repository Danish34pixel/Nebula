import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ForgotPassword } from "../components/auth/ForgotPassword";
import { requestPasswordReset } from "../services/authService";

const ACCENT_COLOR = "#2563eb";

// Standalone, role-agnostic Forgot Password screen at /forgot-password.
// The backend looks accounts up by email across every role (medical owner,
// stockist, purchaser, staff), so this single page serves all of them —
// each role's login screen links here instead of duplicating the flow.
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      // The endpoint always returns a generic success message regardless of
      // whether the email is registered — we never learn (or leak) account
      // existence here.
      await requestPasswordReset({ email: trimmed });
      setSent(true);
      setSuccessMessage(
        "If an account exists with this email, a password reset link has been sent. Please check your inbox (and spam folder).",
      );
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={["#eff6ff", "#ffffff", "#f0fdf4"]} style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../assets/images/main-logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <ForgotPassword
              identifier={email}
              onIdentifierChange={setEmail}
              loading={loading}
              onSubmit={handleSubmit}
              onBack={() => router.replace("/login")}
              error={error}
              successMessage={successMessage}
              accentColor={ACCENT_COLOR}
              sent={sent}
            />
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#eff6ff" },
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    paddingBottom: 32,
  },
  logoContainer: { alignItems: "center", marginBottom: 24 },
  logoImage: { width: 120, height: 80 },
});
