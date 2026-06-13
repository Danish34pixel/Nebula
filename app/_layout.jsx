import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";
import { SecurityProvider } from "../context/SecurityContext";

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
        <Stack.Screen name="Staff/Createstaff" />
        <Stack.Screen name="Staff/[id]" />
        <Stack.Screen name="MedicalOwner/MedicalSignup" />
        <Stack.Screen name="MedicalOwner/MedicalMiddle" />
        <Stack.Screen name="login" />
      </Stack>
      <StatusBar style="auto" />
    </SafeAreaProvider>
    </SecurityProvider>
  );
}
