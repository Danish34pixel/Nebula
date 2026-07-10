import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export const ResendTimer = ({ secondsLeft, canResend, onResend, accentColor, loading }) => (
  <View style={styles.container}>
    {canResend ? (
      <TouchableOpacity onPress={onResend} disabled={loading}>
        <Text style={[styles.link, { color: accentColor }]}>Resend OTP</Text>
      </TouchableOpacity>
    ) : (
      <Text style={styles.timer}>Resend available in {secondsLeft}s</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { marginTop: 12, alignItems: "center" },
  link: { fontSize: 14, fontWeight: "700" },
  timer: { fontSize: 13, color: "#64748b" },
});
