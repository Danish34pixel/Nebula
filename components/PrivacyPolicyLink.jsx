import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function PrivacyPolicyLink({ style, textStyle }) {
  const router = useRouter();

  return (
    <View style={[styles.wrapper, style]}>
      <TouchableOpacity
        onPress={() => router.push("/privacy-policy")}
        style={styles.button}
      >
        <Text style={[styles.text, textStyle]}>Privacy Policy</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    marginTop: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(37, 99, 235, 0.08)",
  },
  text: {
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "700",
  },
});
