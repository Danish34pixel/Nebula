import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

export const OTPInput = ({ value, onChange, accentColor, loading }) => {
  const digits = value.split("");

  return (
    <View style={styles.container}>
      {Array.from({ length: 6 }).map((_, index) => (
        <TextInput
          key={index}
          style={[styles.box, { borderColor: accentColor }, loading && styles.boxDisabled]}
          value={digits[index] || ""}
          onChangeText={(text) => {
            const nextValue = (value + text).slice(0, 6);
            onChange(nextValue);
          }}
          keyboardType="number-pad"
          maxLength={1}
          textAlign="center"
          editable={!loading}
          selectTextOnFocus
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, gap: 8 },
  box: {
    width: 44,
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  boxDisabled: { opacity: 0.6 },
});
