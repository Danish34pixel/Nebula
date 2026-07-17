import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function TermsAgreement({
  enabled,
  checked,
  onToggle,
  onOpenTerms,
  error,
}) {
  const router = useRouter();

  return (
    <View style={styles.wrapper}>
      <View style={styles.checkWrapper}>
        <TouchableOpacity
          style={[styles.checkbox, checked && styles.checkboxChecked]}
          onPress={() => enabled && onToggle(!checked)}
          activeOpacity={enabled ? 0.75 : 1}
        >
          {checked ? <Feather name="check" size={16} color="#fff" /> : null}
        </TouchableOpacity>

        <View style={styles.textBlock}>
          <Text style={[styles.label, !enabled && styles.labelDisabled]}>
            I have read and accept the
          </Text>
          <View style={styles.linksRow}>
            <TouchableOpacity onPress={onOpenTerms} disabled={!onOpenTerms}>
              <Text style={styles.link}>Terms and Conditions</Text>
            </TouchableOpacity>
            <Text style={styles.separator}>and</Text>
            <TouchableOpacity
              onPress={() => router.push("/privacy-policy")}
              disabled={!onOpenTerms}
            >
              <Text style={styles.link}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 18 },
  checkWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#94a3b8",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 4,
  },
  checkboxChecked: {
    backgroundColor: "#0ea5e9",
    borderColor: "#0ea5e9",
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    color: "#334155",
    marginBottom: 4,
  },
  labelDisabled: { color: "#64748b" },
  linksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  separator: {
    fontSize: 14,
    color: "#475569",
    marginHorizontal: 4,
  },
  link: {
    color: "#0ea5e9",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 8,
    marginLeft: 36,
  },
});
