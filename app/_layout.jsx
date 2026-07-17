import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AdToast from "../components/AdToast";
import LegalFooter from "../components/LegalFooter";
import { SecurityProvider } from "../context/SecurityContext";
import { secureStorage } from "../utils/secureStore";

const AUTH_ROUTES = new Set([
  "/",
  "/login",
  "/MedicalOwner/MedicalSignup",
  "/MedicalOwner/MedicalMiddle",
  "/Purchaser/purchaser-login",
  "/Purchaser/purchaser-signup",
  "/Stockist/stockist-login",
  "/Stockist/stockist-signup",
  "/Stockist/stockist-verification",
  "/Stockist/stockist-dashboard",
  "/Stockist/demand-inbox",
  "/Staff/staff-login",
  "/Staff/Createstaff",
  "/profile",
]);

const LEGAL_ROUTES = new Set([
  "/about",
  "/privacy-policy",
  "/terms-and-conditions",
  "/refund-policy",
  "/return-policy",
  "/shipping-policy",
  "/contact-us",
]);

function GlobalFullscreenAd() {
  const pathname = usePathname();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = await secureStorage.getItem("token");
        if (alive) setHasSession(Boolean(token));
      } catch {
        if (alive) setHasSession(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pathname]);

  if (!hasSession || AUTH_ROUTES.has(pathname)) {
    return null;
  }

  return <AdToast />;
}

export default function RootLayout() {
  return (
    // SecurityProvider must be the outermost wrapper so every screen can
    // access globalEnabled, isRoleProtected, and logSecurityEvent via
    // useSecurityConfig() without prop drilling.
    <SecurityProvider>
      <SafeAreaProvider>
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }} style={{ flex: 1 }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="Purchaser/purchaser-login" />
            <Stack.Screen name="Purchaser/purchaser-signup" />
            <Stack.Screen name="purchasermiddle" />
            <Stack.Screen name="Purchaser/[id]" />
            <Stack.Screen name="Home/index" />
            <Stack.Screen name="Stockist/stockist-login" />
            <Stack.Screen name="Stockist/stockist-signup" />
            <Stack.Screen name="Stockist/stockist-verification" />
            <Stack.Screen name="Stockist/stockist-dashboard" />
            <Stack.Screen name="Stockist/demand-inbox" />
            <Stack.Screen name="Admin/index" />
            <Stack.Screen name="Admin/users" />
            <Stack.Screen name="Admin/stockists" />
            <Stack.Screen name="Admin/medical-management" />
            <Stack.Screen name="Admin/create-company" />
            <Stack.Screen name="Admin/create-medicine" />
            <Stack.Screen name="Admin/ads" />
            <Stack.Screen name="Admin/announcements" />
            <Stack.Screen name="Staff/Createstaff" />
            <Stack.Screen name="Staff/[id]" />
            <Stack.Screen name="MedicalOwner/MedicalSignup" />
            <Stack.Screen name="MedicalOwner/MedicalMiddle" />
            <Stack.Screen name="MedicalOwner/create-demand" />
            <Stack.Screen name="MedicalOwner/demand-history" />
            <Stack.Screen name="MedicalOwner/urgent-request" />
            <Stack.Screen name="Purchaser/urgent-requests" />
            <Stack.Screen name="urgent-request-chat/[id]" />
            <Stack.Screen name="announcement/[id]" />
            <Stack.Screen name="about" />
            <Stack.Screen name="privacy-policy" />
            <Stack.Screen name="terms-and-conditions" />
            <Stack.Screen name="refund-policy" />
            <Stack.Screen name="return-policy" />
            <Stack.Screen name="shipping-policy" />
            <Stack.Screen name="contact-us" />
            <Stack.Screen name="login" />
          </Stack>
          {(() => {
            const pathname = usePathname();
            const shouldShowFooter = LEGAL_ROUTES.has(pathname);

            return shouldShowFooter ? <LegalFooter /> : null;
          })()}
        </View>
        <GlobalFullscreenAd />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </SecurityProvider>
  );
}
