import { Text, View } from "react-native";
import LegalPageLayout from "../components/LegalPageLayout";

export default function ShippingPolicy() {
  return (
    <LegalPageLayout
      title="Shipping Policy"
      description="Meditrap does not ship or deliver physical products. This policy explains that our service is limited to digital subscriptions and medicine availability information."
      seoTitle="Meditrap Shipping Policy"
      seoDescription="Meditrap does not ship physical products. Learn how our subscription-based service provides digital access to medicine availability information."
    >
      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>No Physical Shipping</Text>
        <Text style={styles.paragraph}>
          Meditrap is a digital subscription platform that provides medicine
          availability information. We do not ship, deliver, or transport any
          physical medicines or products.
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>Digital Subscription Service</Text>
        <Text style={styles.paragraph}>
          Our service is limited to online access, role-based permissions, and
          information sharing. All platform features are accessed through your
          Meditrap account once your subscription is active.
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>Support</Text>
        <Text style={styles.paragraph}>
          If you have any questions about your subscription or access, please
          contact us at meditrap1@gmail.com.
        </Text>
      </View>
    </LegalPageLayout>
  );
}

const styles = {
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: "#475569",
  },
};
