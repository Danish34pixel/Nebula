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

  const handleCheckboxPress = () => {
    if (!enabled) {
      // Bring user to T&C so they can scroll through and unlock the checkbox
      if (onOpenTerms) onOpenTerms();
      return;
    }
    onToggle(!checked);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.checkWrapper}>
        <TouchableOpacity
          style={[
            styles.checkbox,
            checked && styles.checkboxChecked,
            !enabled && styles.checkboxDisabled,
          ]}
          onPress={handleCheckboxPress}
          activeOpacity={0.7}
        >
          {checked ? (
            <Feather name="check" size={16} color="#fff" />
          ) : !enabled ? (
            <Feather name="lock" size={12} color="#94a3b8" />
          ) : null}
        </TouchableOpacity>

        <View style={styles.textBlock}>
          <Text style={[styles.label, !enabled && styles.labelDisabled]}>
            I have read and accept the
          </Text>
          <View style={styles.linksRow}>
            <TouchableOpacity onPress={onOpenTerms} disabled={!onOpenTerms}>
              <Text style={[styles.link, !enabled && styles.linkHighlighted]}>
                Terms and Conditions
              </Text>
            </TouchableOpacity>
            <Text style={styles.separator}>and</Text>
            <TouchableOpacity
              onPress={() => router.push("/privacy-policy")}
              disabled={!onOpenTerms}
            >
              <Text style={styles.link}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
          {!enabled && (
            <Text style={styles.hintText}>
              Read Terms & Conditions to the end to enable this checkbox
            </Text>
          )}
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
  checkboxDisabled: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
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
  linkHighlighted: {
    color: "#0369a1",
    fontWeight: "800",
  },
  hintText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    fontStyle: "italic",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 8,
    marginLeft: 36,
  },
});
