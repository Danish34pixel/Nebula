import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ResetPassword } from "../../components/auth/ResetPassword";
import { resetPasswordWithToken } from "../../services/authService";

const ACCENT_COLOR = "#2563eb";
const REDIRECT_DELAY_MS = 2500;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [done, setDone] = useState(false);

  const normalizedToken = Array.isArray(token) ? token[0] : token;

  useEffect(() => {
    if (!normalizedToken) {
      setError("This reset link is invalid or missing a token.");
    }
  }, [normalizedToken]);

  useEffect(() => {
    if (!done) return undefined;
    const timer = setTimeout(() => router.replace("/login"), REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [done, router]);

  const handleSubmit = async () => {
    if (!normalizedToken) {
      setError("This reset link is invalid or missing a token.");
      return;
    }

    if (!password.trim() || !confirmPassword.trim()) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (password.trim().length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password.trim() !== confirmPassword.trim()) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await resetPasswordWithToken({
        token: normalizedToken,
        password: password.trim(),
        confirmPassword: confirmPassword.trim(),
      });
      if (data?.success === false && data?.message) {
        throw new Error(data.message);
      }
      setSuccessMessage(
        data?.message || "Password reset successful. Redirecting you to login…",
      );
      setDone(true);
    } catch (err) {
      // A 400 here means the link is invalid, expired, or already used.
      setError(err?.message || "This reset link is invalid or has expired. Please request a new one.");
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
                source={require("../../assets/images/main-logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {done ? (
              <View style={styles.card}>
                <View style={styles.successIconWrap}>
                  <Feather name="check-circle" size={40} color="#059669" />
                </View>
                <Text style={styles.title}>Password reset</Text>
                <Text style={styles.subtitle}>{successMessage}</Text>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={() => router.replace("/login")}
                >
                  <View style={[styles.submitGradient, { backgroundColor: ACCENT_COLOR }]}>
                    <Text style={styles.submitText}>Continue to Login</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <ResetPassword
                password={password}
                confirmPassword={confirmPassword}
                onPasswordChange={setPassword}
                onConfirmPasswordChange={setConfirmPassword}
                loading={loading}
                onSubmit={handleSubmit}
                onBack={() => router.replace("/login")}
                error={error}
                successMessage=""
                accentColor={ACCENT_COLOR}
              />
            )}
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  successIconWrap: { marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "800", color: "#0f172a", marginBottom: 6, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 20 },
  submitBtn: { borderRadius: 16, overflow: "hidden", alignSelf: "stretch" },
  submitGradient: { paddingVertical: 14, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
