import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export default function TrialBanner({ daysLeft }) {
  if (daysLeft == null) return null;

  return (
    <View style={styles.banner}>
      <Feather name="clock" size={16} color="#92400e" />
      <Text style={styles.text}>
        Free trial — {daysLeft} {daysLeft === 1 ? "day" : "days"} left
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fef3c7",
    borderBottomWidth: 1,
    borderBottomColor: "#fde68a",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  text: { color: "#92400e", fontWeight: "600", fontSize: 13 },
});
