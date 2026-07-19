import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  authenticateWithPassword,
  persistAuthState,
  requestOtp,
  resetPassword,
  verifyOtp,
} from "../../services/authService";
import { getHomeRouteForRole } from "../../utils/getHomeRouteForRole";
import LegalConsentText from "../LegalConsentText";
import PrivacyPolicyLink from "../PrivacyPolicyLink";
import { ForgotPassword } from "./ForgotPassword";
import { LoginForm } from "./LoginForm";
import { OTPInput } from "./OTPInput";
import { ResendTimer } from "./ResendTimer";
import { ResetPassword } from "./ResetPassword";

const AuthFlowScreen = ({
  role,
  accentColor,
  backgroundColors,
  title,
  subtitle,
  logoSource,
  signupRoute,
  signupLabel,
  signupText,
  footerText,
}) => {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("login");
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    const loadRememberedIdentifier = async () => {
      try {
        const candidates = [
          `remembered${role.charAt(0).toUpperCase()}${role.slice(1)}Identifier`,
          "rememberedIdentifier",
          "rememberedEmail",
        ];
        for (const key of candidates) {
          const saved = await AsyncStorage.getItem(key);
          if (saved) {
            setIdentifier(saved);
            setRememberMe(true);
            break;
          }
        }
      } catch (err) {
        console.warn("Unable to load remembered identifier", err);
      }
    };

    loadRememberedIdentifier();
  }, [role]);

  useEffect(() => {
    if (step !== "otp" || canResend || secondsLeft <= 0) return;

    const timer = setTimeout(() => setSecondsLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, secondsLeft, canResend]);

  useEffect(() => {
    if (step === "otp" && secondsLeft <= 0) {
      setCanResend(true);
    }
  }, [step, secondsLeft]);

  const handleRememberToggle = async () => {
    const nextValue = !rememberMe;
    setRememberMe(nextValue);
    if (!nextValue) {
      await AsyncStorage.removeItem("rememberedIdentifier");
      await AsyncStorage.removeItem(
        `remembered${role.charAt(0).toUpperCase()}${role.slice(1)}Identifier`,
      );
    }
  };

  const saveRememberedIdentifier = async () => {
    if (!rememberMe || !identifier.trim()) return;
    await AsyncStorage.setItem("rememberedIdentifier", identifier.trim());
    await AsyncStorage.setItem(
      `remembered${role.charAt(0).toUpperCase()}${role.slice(1)}Identifier`,
      identifier.trim(),
    );
  };

  const applyAuthResult = async (data) => {
    const accessToken =
      data?.accessToken ||
      data?.token ||
      data?.access_token ||
      data?.data?.accessToken ||
      data?.data?.token;
    const refreshToken =
      data?.refreshToken ||
      data?.refresh_token ||
      data?.data?.refreshToken ||
      data?.data?.refresh_token;
    const user =
      data?.user ||
      data?.data?.user ||
      data?.purchaser ||
      data?.data?.purchaser ||
      data?.profile ||
      data?.data?.profile;

    await persistAuthState({
      accessToken,
      refreshToken,
      user,
      role,
      rememberMe,
      identifier,
    });
    if (accessToken) {
      await AsyncStorage.setItem("token", accessToken);
    }

    // stockist still uses approved: boolean — keep its pending-verification gate
    if (role === "stockist") {
      const isApproved =
        user?.approved === true ||
        user?.status === "approved" ||
        user?.status === "Approved";
      if (!isApproved && user?._id) {
        await AsyncStorage.setItem("pendingStockistId", String(user._id));
        router.replace("/Stockist/stockist-verification");
        return;
      }
    }

    // Route by DB role (user.role) via single source of truth
    const dbRole = user?.role || role;
    const uid = user?._id || user?.id || "";
    router.replace(getHomeRouteForRole(dbRole, uid));
  };

  const handlePasswordLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError("Please enter your credentials to continue.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await authenticateWithPassword({
        identifier,
        password,
        role,
      });
      if (data?.success === false && data?.message) {
        throw new Error(data.message);
      }
      await saveRememberedIdentifier();
      await applyAuthResult(data);
    } catch (err) {
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpRequest = async () => {
    if (!identifier.trim()) {
      setError("Please enter your email or mobile number.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await requestOtp({
        identifier,
        role,
        purpose: step === "forgot" ? "forgot_password" : "login",
      });
      setSuccessMessage(
        "OTP sent successfully. Please check your inbox or phone.",
      );
      setStep("otp");
      setOtp("");
      setSecondsLeft(60);
      setCanResend(false);
      await saveRememberedIdentifier();
    } catch (err) {
      setError(err?.message || "OTP request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (otp.length !== 6) {
      setError("Enter the full 6-digit OTP.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await verifyOtp({
        identifier,
        role,
        otp,
        purpose: step === "forgot" ? "forgot_password" : "login",
      });
      if (data?.success === false && data?.message) {
        throw new Error(data.message);
      }

      if (step === "forgot") {
        setSuccessMessage("OTP verified. Please choose a new password.");
        setStep("reset");
      } else {
        await applyAuthResult(data);
      }
    } catch (err) {
      setError(err?.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (newPassword.trim().length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await resetPassword({
        identifier,
        role,
        otp,
        password: newPassword.trim(),
      });
      if (data?.success === false && data?.message) {
        throw new Error(data.message);
      }
      setSuccessMessage(
        "Password reset successfully. Please sign in with your new password.",
      );
      setStep("login");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOtp("");
    } catch (err) {
      setError(err?.message || "Password reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchToForgotPassword = () => {
    setError("");
    setSuccessMessage("");
    setStep("forgot");
  };

  const switchToLogin = () => {
    setError("");
    setSuccessMessage("");
    setStep("login");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setPassword("");
  };

  const renderActiveStep = () => {
    if (step === "forgot") {
      return (
        <ForgotPassword
          identifier={identifier}
          onIdentifierChange={setIdentifier}
          loading={loading}
          onSubmit={handleOtpRequest}
          onBack={switchToLogin}
          error={error}
          successMessage={successMessage}
          accentColor={accentColor}
        />
      );
    }

    if (step === "otp") {
      return (
        <View style={styles.otpCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to {identifier}.
            </Text>
          </View>

          {error ? (
            <View style={styles.messageBoxError}>
              <Feather name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.messageText}>{error}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.messageBoxSuccess}>
              <Feather name="check-circle" size={16} color="#059669" />
              <Text style={styles.messageText}>{successMessage}</Text>
            </View>
          ) : null}

          <OTPInput
            value={otp}
            onChange={setOtp}
            accentColor={accentColor}
            loading={loading}
          />

          <ResendTimer
            secondsLeft={secondsLeft}
            canResend={canResend}
            onResend={handleOtpRequest}
            accentColor={accentColor}
            loading={loading}
          />

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleOtpVerify}
            disabled={loading}
          >
            <View
              style={[styles.submitGradient, { backgroundColor: accentColor }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Verify OTP</Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={switchToLogin}
          >
            <Text style={[styles.secondaryText, { color: accentColor }]}>
              Back to login
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === "reset") {
      return (
        <ResetPassword
          password={newPassword}
          confirmPassword={confirmPassword}
          onPasswordChange={setNewPassword}
          onConfirmPasswordChange={setConfirmPassword}
          loading={loading}
          onSubmit={handleResetPassword}
          onBack={switchToLogin}
          error={error}
          successMessage={successMessage}
          accentColor={accentColor}
        />
      );
    }

    return (
      <>
        <LoginForm
          identifier={identifier}
          password={password}
          onIdentifierChange={setIdentifier}
          onPasswordChange={setPassword}
          rememberMe={rememberMe}
          onRememberMeChange={handleRememberToggle}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword((prev) => !prev)}
          loading={loading}
          onSubmit={handlePasswordLogin}
          onOtpSubmit={() => {
            setError("");
            setSuccessMessage("");
            handleOtpRequest();
          }}
          onForgotPassword={switchToForgotPassword}
          error={error}
          successMessage={successMessage}
          accentColor={accentColor}
          title={title}
          subtitle={subtitle}
        />
        <LegalConsentText style={{ marginTop: 16 }} />
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={backgroundColors} style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/")
              }
              style={styles.backBtn}
            >
              <Feather name="arrow-left" size={22} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <Image
                source={logoSource}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            {renderActiveStep()}

            {signupRoute ? (
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {footerText || "New to MedTrap?"}
                </Text>
                <TouchableOpacity onPress={() => router.push(signupRoute)}>
                  <Text
                    style={[styles.createAccountText, { color: accentColor }]}
                  >
                    {signupLabel || "Create your account"}
                  </Text>
                </TouchableOpacity>
                <PrivacyPolicyLink
                  style={styles.authLink}
                  textStyle={styles.authLinkText}
                />
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#eff6ff" },
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  headerRow: { paddingHorizontal: 16, paddingTop: 16 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    elevation: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    paddingBottom: 32,
  },
  logoContainer: { alignItems: "center", marginBottom: 24 },
  logoImage: { width: 120, height: 80 },
  otpCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  header: { marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748b" },
  messageBoxError: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    gap: 8,
  },
  messageBoxSuccess: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    gap: 8,
  },
  messageText: { flex: 1, fontSize: 13, color: "#334155" },
  submitBtn: { borderRadius: 16, overflow: "hidden", marginTop: 20 },
  submitGradient: { paddingVertical: 14, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  secondaryLink: { alignItems: "center", marginTop: 12 },
  secondaryText: { fontSize: 14, fontWeight: "700" },
  footer: { marginTop: 24, alignItems: "center" },
  footerText: { fontSize: 14, color: "#64748b", marginBottom: 6 },
  authLink: { marginTop: 10 },
  authLinkText: { color: "#2563eb" },
  createAccountText: { fontSize: 15, fontWeight: "700" },
});

export default AuthFlowScreen;
