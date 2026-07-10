import React from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

export const ForgotPassword = ({ identifier, onIdentifierChange, loading, onSubmit, onBack, error, successMessage, accentColor }) => (
  <View style={styles.card}>
    <TouchableOpacity style={styles.backRow} onPress={onBack}>
      <Feather name="arrow-left" size={18} color={accentColor} />
      <Text style={[styles.backText, { color: accentColor }]}>Back to login</Text>
    </TouchableOpacity>

    <View style={styles.header}>
      <Text style={styles.title}>Reset your password</Text>
      <Text style={styles.subtitle}>We will send a verification code to your email or mobile number.</Text>
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

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Email or Mobile Number</Text>
      <View style={styles.inputWrapper}>
        <Feather name="mail" size={18} color="#94a3b8" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={identifier}
          onChangeText={onIdentifierChange}
          placeholder="Enter email or mobile number"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          keyboardType="default"
          editable={!loading}
        />
      </View>
    </View>

    <TouchableOpacity style={styles.submitBtn} onPress={onSubmit} disabled={loading}>
      <View style={[styles.submitGradient, { backgroundColor: accentColor }]}> 
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Send OTP</Text>}
      </View>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 6 },
  backText: { fontSize: 14, fontWeight: "700" },
  header: { marginBottom: 18 },
  title: { fontSize: 22, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748b" },
  messageBoxError: { flexDirection: "row", alignItems: "center", backgroundColor: "#fef2f2", borderColor: "#fecaca", borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12, gap: 8 },
  messageBoxSuccess: { flexDirection: "row", alignItems: "center", backgroundColor: "#ecfdf5", borderColor: "#a7f3d0", borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12, gap: 8 },
  messageText: { flex: 1, fontSize: 13, color: "#334155" },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 16, paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 15, color: "#0f172a" },
  submitBtn: { borderRadius: 16, overflow: "hidden" },
  submitGradient: { paddingVertical: 14, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
