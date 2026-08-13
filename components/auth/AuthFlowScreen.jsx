import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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
import {
  authenticateWithPassword,
  persistAuthState,
} from "../../services/authService";
import { getHomeRouteForRole } from "../../utils/getHomeRouteForRole";
import { secureStorage } from "../../utils/secureStore";
import LegalConsentText from "../LegalConsentText";
import PrivacyPolicyLink from "../PrivacyPolicyLink";
import { LoginForm } from "./LoginForm";

const extractAuthPayload = (data) => {
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
  return { accessToken, refreshToken, user };
};

// Email + Password login only. Forgot Password lives at its own route
// (/forgot-password); there is no OTP login/verification step here.
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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [blockedAccountStatus, setBlockedAccountStatus] = useState(null);

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
    const { accessToken, refreshToken, user } = extractAuthPayload(data);

    await persistAuthState({
      accessToken,
      refreshToken,
      user,
      role,
      rememberMe,
      identifier,
    });
    if (accessToken) {
      await secureStorage.setItem("token", accessToken);
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
    const destination = getHomeRouteForRole(dbRole, uid);

    if (__DEV__) {
      console.log("[AuthFlowScreen] login success:", {
        requestedRole: role,
        returnedRole: user?.role,
        dbRole,
        uid,
        destination,
        user,
      });
    }

    router.replace(destination);
  };

  // A normal failed login (wrong password, etc.) never carries a token. A
  // token alongside success:false is specifically the payment-required/
  // trial-expired case, regardless of the exact message text or
  // paymentStatus value the backend sends — matching on message text would
  // be brittle since it isn't a fixed enum. Returns true if this response
  // was the trial-expired case (and state has been updated).
  const applyTrialExpiredIfNeeded = async (data, fallbackMessage) => {
    const { accessToken, refreshToken, user } = extractAuthPayload(data);

    if (__DEV__) {
      console.log("[AuthFlowScreen] applyTrialExpiredIfNeeded check:", {
        hasAccessToken: Boolean(accessToken),
        hasUser: Boolean(user),
        rawData: data,
      });
    }

    if (!accessToken) return false;

    await persistAuthState({
      accessToken,
      refreshToken,
      user,
      role,
      rememberMe,
      identifier,
    });
    setTrialExpired(true);
    setBlockedAccountStatus(data?.accountStatus || null);
    setError(data?.message || fallbackMessage);
    return true;
  };

  const handlePasswordLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError("Please enter your credentials to continue.");
      return;
    }

    setLoading(true);
    setError("");
    setTrialExpired(false);
    setBlockedAccountStatus(null);
    try {
      const data = await authenticateWithPassword({
        identifier,
        password,
        role,
      });

      if (__DEV__) {
        console.log("[AuthFlowScreen] login response resolved:", data);
      }

      if (data?.success === false) {
        if (
          await applyTrialExpiredIfNeeded(
            data,
            "Please complete your subscription payment to access your account.",
          )
        ) {
          return;
        }

        throw new Error(data.message || "Login failed. Please try again.");
      }

      await saveRememberedIdentifier();
      await applyAuthResult(data);
    } catch (err) {
      if (__DEV__) {
        console.log("[AuthFlowScreen] login error:", {
          message: err?.message,
          status: err?.status,
          body: err?.body,
        });
      }

      // The backend may reject with a non-2xx status (rather than resolving
      // with success:false) — the payload with the token/paymentStatus still
      // arrives on err.body in that case, so check it before giving up.
      if (
        err?.body &&
        (await applyTrialExpiredIfNeeded(
          err.body,
          "Please complete your subscription payment to access your account.",
        ))
      ) {
        return;
      }

      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // The token was already persisted when the trial-expired response came
  // in, so /SubscriptionPlans -> /payment(.web) can call the authenticated
  // create-order/verify endpoints without the user logging in again.
  // pending_admin_verification means payment already went through — send
  // them to the status screen instead of the plan picker to avoid a
  // duplicate charge.
  const handleGoToPayment = () => {
    // Modal renders as a global overlay outside the navigator's screen
    // stack, so it stays visible over whatever gets pushed on top unless
    // explicitly closed first.
    setTrialExpired(false);
    if (blockedAccountStatus === "pending_admin_verification") {
      router.push("/payment-pending");
    } else {
      router.push("/SubscriptionPlans");
    }
  };

  const handleCloseSubscriptionModal = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  // Forgot Password lives at its own route (/forgot-password) rather than
  // as an inline step here — it's a standalone, role-agnostic flow since the
  // backend looks accounts up by email across every role.
  const goToForgotPassword = () => {
    router.push("/forgot-password");
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
              onForgotPassword={goToForgotPassword}
              error={error}
              accentColor={accentColor}
              title={title}
              subtitle={subtitle}
              trialExpired={trialExpired}
              onMakePayment={handleGoToPayment}
              onCloseSubscriptionModal={handleCloseSubscriptionModal}
              paymentButtonLabel={
                blockedAccountStatus === "pending_admin_verification"
                  ? "Check Status"
                  : "Pay Now"
              }
            />
            <LegalConsentText style={{ marginTop: 16 }} />

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
  footer: { marginTop: 24, alignItems: "center" },
  footerText: { fontSize: 14, color: "#64748b", marginBottom: 6 },
  authLink: { marginTop: 10 },
  authLinkText: { color: "#2563eb" },
  createAccountText: { fontSize: 15, fontWeight: "700" },
});

export default AuthFlowScreen;
