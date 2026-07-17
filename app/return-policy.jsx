import { Text, View } from "react-native";
import LegalPageLayout from "../components/LegalPageLayout";

export default function ReturnPolicy() {
  return (
    <LegalPageLayout
      title="Return Policy"
      description="Meditrap does not sell physical products. This return policy explains that no product returns are applicable to our subscription-based digital platform."
      seoTitle="Meditrap Return Policy"
      seoDescription="Meditrap does not sell physical products. This page explains why return policies do not apply to our subscription service."
    >
      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>No Physical Products Sold</Text>
        <Text style={styles.paragraph}>
          Meditrap is a digital subscription service. We do not sell, ship, or
          deliver physical medicines or products. As a result, returns are not
          applicable in our platform context.
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>What This Means</Text>
        <Text style={styles.paragraph}>
          Since Meditrap provides medicine availability information and role-
          based access only, there are no goods to return. Any questions about
          subscription access should be directed to our support team.
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>Questions?</Text>
        <Text style={styles.paragraph}>
          Contact us at meditrap1@gmail.com for help with your subscription or
          account access.
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
