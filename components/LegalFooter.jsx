import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const links = [
  { label: "About Us", route: "/about" },
  { label: "Privacy Policy", route: "/privacy-policy" },
  { label: "Terms & Conditions", route: "/terms-and-conditions" },
  { label: "Refund Policy", route: "/refund-policy" },
  { label: "Return Policy", route: "/return-policy" },
  { label: "Shipping Policy", route: "/shipping-policy" },
  { label: "Contact Us", route: "/contact-us" },
];

export default function LegalFooter() {
  const router = useRouter();

  return (
    <View style={styles.footer}>
      <View style={styles.linkRow}>
        {links.map((link) => (
          <TouchableOpacity
            key={link.route}
            onPress={() => router.push(link.route)}
            style={styles.linkButton}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>{link.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.copy} numberOfLines={1}>
        © {new Date().getFullYear()} Meditrap. Secure subscription access to
        healthcare information for verified healthcare professionals.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  linkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  linkButton: {
    marginHorizontal: 4,
    marginVertical: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  linkText: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "700",
  },
  copy: {
    marginTop: 10,
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
  },
});
