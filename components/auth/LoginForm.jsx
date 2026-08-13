import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SubscriptionExpiredModal } from "./SubscriptionExpiredModal";

export const LoginForm = ({
  identifier,
  password,
  onIdentifierChange,
  onPasswordChange,
  rememberMe,
  onRememberMeChange,
  showPassword,
  onTogglePassword,
  loading,
  onSubmit,
  onForgotPassword,
  error,
  accentColor,
  title,
  subtitle,
  trialExpired,
  onMakePayment,
  onCloseSubscriptionModal,
  paymentButtonLabel,
}) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>

    {error && !trialExpired ? (
      <View style={styles.messageBoxError}>
        <View style={styles.messageRow}>
          <Feather name="alert-circle" size={16} color="#ef4444" />
          <Text style={styles.messageText}>{error}</Text>
        </View>
      </View>
    ) : null}

    <SubscriptionExpiredModal
      visible={trialExpired}
      message={error}
      onPayNow={onMakePayment}
      onClose={onCloseSubscriptionModal}
      payButtonLabel={paymentButtonLabel}
    />

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Email</Text>
      <View style={styles.inputWrapper}>
        <Feather name="mail" size={18} color="#94a3b8" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={identifier}
          onChangeText={onIdentifierChange}
          placeholder="Enter your email"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
      </View>
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Password</Text>
      <View style={styles.inputWrapper}>
        <Feather name="lock" size={18} color="#94a3b8" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={onPasswordChange}
          placeholder="Enter your password"
          placeholderTextColor="#94a3b8"
          secureTextEntry={!showPassword}
          editable={!loading}
        />
        <TouchableOpacity onPress={onTogglePassword} style={styles.eyeIcon}>
          <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </View>

    <View style={styles.rowBetween}>
      <TouchableOpacity style={styles.rememberRow} onPress={onRememberMeChange}>
        <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
          {rememberMe ? <Feather name="check" size={12} color="#fff" /> : null}
        </View>
        <Text style={styles.rememberText}>Remember me</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onForgotPassword}>
        <Text style={[styles.forgotText, { color: accentColor }]}>Forgot password?</Text>
      </TouchableOpacity>
    </View>

    <TouchableOpacity
      style={[styles.submitBtn, trialExpired && styles.submitBtnDisabled]}
      onPress={onSubmit}
      disabled={loading || trialExpired}
    >
      <View style={[styles.submitGradient, { backgroundColor: accentColor }]}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Sign In</Text>
        )}
      </View>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748b" },
  messageBoxError: { backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  messageRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  messageText: { flex: 1, fontSize: 13, color: "#334155" },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 16, paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 15, color: "#0f172a" },
  eyeIcon: { padding: 6 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  rememberRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: "#cbd5e1", justifyContent: "center", alignItems: "center" },
  checkboxActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  rememberText: { fontSize: 13, color: "#64748b" },
  forgotText: { fontSize: 13, fontWeight: "600" },
  submitBtn: { borderRadius: 16, overflow: "hidden", marginBottom: 10 },
  submitBtnDisabled: { opacity: 0.5 },
  submitGradient: { paddingVertical: 14, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
