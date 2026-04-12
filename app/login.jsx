import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl } from "../config/api";

const InputField = ({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  showPasswordToggle,
  showPassword,
  setShowPassword,
}) => (
  <View style={styles.inputGroup}>
    <View style={styles.labelRow}>
      <Feather name={icon} size={16} color="#3b82f6" style={styles.labelIcon} />
      <Text style={styles.label}>{label}</Text>
    </View>
    <View style={styles.inputWrapper}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        secureTextEntry={secureTextEntry && !showPassword}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
      {showPasswordToggle && (
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Feather
            name={showPassword ? "eye-off" : "eye"}
            size={20}
            color="#94a3b8"
          />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    (async () => {
      const savedEmail = await AsyncStorage.getItem("rememberedEmail");
      if (savedEmail) {
        setForm((prev) => ({ ...prev, email: savedEmail }));
        setRememberMe(true);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(apiUrl(`/api/auth/login`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          role: "medicalOwner",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (data.success && data.accessToken && data.user) {
        // Evaluate approval status
        const isApproved = data.user.approved === true || data.user.status === "approved" || data.user.status === "Approved";

        if (!isApproved && data.user._id) {
          // Not approved yet; redirect to waiting room
          await AsyncStorage.setItem("pendingUserId", String(data.user._id));
          Alert.alert("Pending", "Your account is still under verification by the admin.");
          router.replace("/MedicalOwner/MedicalMiddle");
          return;
        }

        await AsyncStorage.setItem("token", data.accessToken);
        await AsyncStorage.setItem("user", JSON.stringify(data.user));

        if (rememberMe) {
          await AsyncStorage.setItem("rememberedEmail", form.email);
        } else {
          await AsyncStorage.removeItem("rememberedEmail");
        }

        // Clean up any stray pending ids
        await AsyncStorage.multiRemove(["pendingStockistId", "pendingUserId"]);

        Alert.alert("Success", "Login successful!");
        // Navigate to the dashboard or home
        setTimeout(() => router.replace("/Home"), 500);
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (err) {
      Alert.alert("Login Error", err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={["#eff6ff", "#ffffff", "#f0fdf4"]} style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require("../assets/images/main-logo.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to your MedTrap account</Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              <InputField
                icon="mail"
                label="Email Address"
                value={form.email}
                onChangeText={(text) => setForm({ ...form, email: text })}
                placeholder="Enter your email address"
                keyboardType="email-address"
              />

              <InputField
                icon="lock"
                label="Password"
                value={form.password}
                onChangeText={(text) => setForm({ ...form, password: text })}
                placeholder="Enter your password"
                secureTextEntry={true}
                showPasswordToggle={true}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
              />

              {/* Options */}
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

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={["#3b82f6", "#10b981"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Security Hint */}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>New to MedTrap?</Text>
              <TouchableOpacity onPress={() => router.push("/MedicalOwner/MedicalSignup")}>
                <Text style={styles.createAccountText}>Create your account</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
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
    marginBottom: 24,
  },
  logoImage: { width: 120, height: 80 },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#475569",
  },
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  inputGroup: { marginBottom: 20 },
  labelRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  labelIcon: { marginRight: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#475569" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1e293b",
  },
  eyeIcon: { padding: 4 },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 4,
  },
  rememberRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  rememberText: { fontSize: 14, color: "#64748b", fontWeight: "500" },
  forgotText: { fontSize: 14, color: "#2563eb", fontWeight: "600" },
  submitBtn: { borderRadius: 16, overflow: "hidden" },
  submitGradient: { height: 56, justifyContent: "center", alignItems: "center" },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  footer: {
    marginTop: 32,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
  },
  createAccountText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2563eb",
  },
});
