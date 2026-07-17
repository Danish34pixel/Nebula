import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function LegalPageLayout({
  title,
  description,
  children,
  scrollProps = {},
}) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        {...scrollProps}
      >
        <Text style={styles.intro}>{description}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  content: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 },
  intro: {
    fontSize: 15,
    lineHeight: 24,
    color: "#334155",
    marginBottom: 18,
  },
});
