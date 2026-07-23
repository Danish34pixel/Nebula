import { StyleSheet, Text, View } from "react-native";

export default function MedicalDisclaimer({ style, compact = false }) {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, compact && styles.titleCompact]}>
        Medical notice
      </Text>
      <Text style={[styles.text, compact && styles.textCompact]}>
        Meditrap provides informational medicine availability data only. It does
        not diagnose, prescribe, or replace professional medical advice. Please
        consult a qualified healthcare professional before making treatment
        decisions.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  title: {
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  titleCompact: { fontSize: 11 },
  text: {
    color: "#7f1d1d",
    fontSize: 13,
    lineHeight: 19,
  },
  textCompact: { fontSize: 12, lineHeight: 17 },
});
