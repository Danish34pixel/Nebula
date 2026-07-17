import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function LegalConsentText({ style }) {
  const router = useRouter();

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.text}>
        By continuing, you agree to our{" "}
        <Text
          style={styles.link}
          onPress={() => router.push("/terms-and-conditions")}
        >
          Terms & Conditions
        </Text>{" "}
        and{" "}
        <Text
          style={styles.link}
          onPress={() => router.push("/privacy-policy")}
        >
          Privacy Policy
        </Text>
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 16, marginBottom: 6, paddingHorizontal: 2 },
  text: { fontSize: 13, lineHeight: 20, color: "#475569" },
  link: { color: "#2563eb", fontWeight: "700" },
});
