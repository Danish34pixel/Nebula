import { Stack, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";
import { SecurityProvider } from "../context/SecurityContext";
import AdToast from "../components/AdToast";
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
      <Stack screenOptions={{ headerShown: false }}>
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
        <Stack.Screen name="MedicalOwner/urgent-request" />
        <Stack.Screen name="Purchaser/urgent-requests" />
        <Stack.Screen name="urgent-request-chat/[id]" />
        <Stack.Screen name="announcement/[id]" />
        <Stack.Screen name="login" />
      </Stack>
      <GlobalFullscreenAd />
      <StatusBar style="auto" />
    </SafeAreaProvider>
    </SecurityProvider>
  );
}
