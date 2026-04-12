import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl } from "../../config/api";
import { secureStorage } from "../../utils/secureStore";

export default function StockistLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    // Load remembered email if exists
    (async () => {
      const savedEmail =
        (await AsyncStorage.getItem("rememberedStockistEmail")) ||
        (await AsyncStorage.getItem("rememberedEmail"));
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    })();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "stockist" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Store Auth State
      if (data.accessToken) await secureStorage.setItem("token", data.accessToken);
      if (data.user) await AsyncStorage.setItem("user", JSON.stringify(data.user));

      if (rememberMe) {
        await AsyncStorage.setItem("rememberedStockistEmail", email);
        await AsyncStorage.removeItem("rememberedEmail");
      } else {
        await AsyncStorage.removeItem("rememberedStockistEmail");
        await AsyncStorage.removeItem("rememberedEmail");
      }

      // Check Approval Status
      const user = data.user;
      const isApproved = user?.approved || user?.status === "approved" || user?.status === "Approved";
      
      if (!isApproved && user?._id) {
        // Redirect to verification if not approved
        await AsyncStorage.setItem("pendingStockistId", String(user._id));
        router.replace("/Stockist/stockist-verification");
      } else {
        await AsyncStorage.multiRemove(["pendingStockistId", "pendingUserId"]);
        router.replace("/Stockist/stockist-dashboard");
      }
    } catch (err) {
      Alert.alert("Login Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#faf5ff", "#f0f9ff", "#e0e7ff"]}
        style={styles.container}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.inner}
        >
          {/* Back Button */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#1e293b" />
          </TouchableOpacity>

          <View style={styles.content}>
            {/* Logo Section */}
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <Image 
                  source={require("../../assets/images/main-logo.png")} 
                  style={styles.logoImage} 
                  resizeMode="contain" 
                />
              </View>
            </View>

            {/* Form Card */}
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to your MedTrap Stockist account</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="mail" size={20} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="lock" size={20} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.optionsRow}>
                  <TouchableOpacity 
                    style={styles.rememberRow} 
                    onPress={() => setRememberMe(!rememberMe)}
                  >
                    <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                      {rememberMe && <Feather name="check" size={12} color="#fff" />}
                    </View>
                    <Text style={styles.rememberText}>Remember me</Text>
                  </TouchableOpacity>

                  <TouchableOpacity>
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.loginBtn} 
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={["#14b8a6", "#3b82f6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.loginBtnText}>Sign In</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.divider}>
                <View style={styles.line} />
                <Text style={styles.dividerText}>New to MedTrap?</Text>
                <View style={styles.line} />
              </View>

              <TouchableOpacity 
                style={styles.createBtn}
                onPress={() => router.push("/Stockist/stockist-signup")}
              >
                <Text style={styles.createBtnText}>Create your account</Text>
              </TouchableOpacity>
            </View>

            {/* Security Notice */}
            <View style={styles.securityRow}>
              <Feather name="shield" size={16} color="#f59e0b" />
              <Text style={styles.securityText}>Protected by industry-standard security</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#faf5ff" },
  container: { flex: 1 },
  inner: { flex: 1 },
  backBtn: {
    padding: 12,
    marginTop: 10,
    marginLeft: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
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
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoIcon: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: { width: 100, height: 100 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 32,
    padding: 32,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  header: { alignItems: "center", marginBottom: 32 },
  title: { fontSize: 28, fontWeight: "800", color: "#1e293b", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#64748b", textAlign: "center" },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: "600", color: "#475569" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 52, fontSize: 15, color: "#1e293b" },
  optionsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  rememberRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: "#cbd5e1", justifyContent: "center", alignItems: "center" },
  checkboxActive: { backgroundColor: "#14b8a6", borderColor: "#14b8a6" },
  rememberText: { fontSize: 14, color: "#64748b" },
  forgotText: { fontSize: 14, color: "#0d9488", fontWeight: "600" },
  loginBtn: { borderRadius: 16, overflow: "hidden", marginTop: 10 },
  loginGradient: { paddingVertical: 16, alignItems: "center" },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 32 },
  line: { flex: 1, height: 1, backgroundColor: "#f1f5f9" },
  dividerText: { fontSize: 13, color: "#94a3b8" },
  createBtn: { alignItems: "center" },
  createBtnText: { fontSize: 15, color: "#0d9488", fontWeight: "700" },
  securityRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 24 },
  securityText: { fontSize: 12, color: "#94a3b8" },
});
