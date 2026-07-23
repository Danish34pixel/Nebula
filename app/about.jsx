import { Text, View } from "react-native";
import LegalPageLayout from "../components/LegalPageLayout";
import MedicalDisclaimer from "../components/MedicalDisclaimer";

export default function AboutUs() {
  return (
    <LegalPageLayout
      title="About Meditrap"
      description="Meditrap is a subscription-based healthcare information platform built to connect medical owners, stockists, staff, and purchasers through digital medicine availability insights and secure role-based access."
      seoTitle="About Meditrap | Subscription Healthcare Information Platform"
      seoDescription="Learn how Meditrap helps stockists, medical owners, staff, and purchasers access medicine availability information through a secure subscription service."
    >
      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>What Meditrap Is</Text>
        <Text style={styles.paragraph}>
          Meditrap is a digital platform that provides verified medicine
          availability information to authorized users. We do not sell,
          dispense, or deliver medicines. Our service is built around
          subscription access and role-based permissions that help healthcare
          stakeholders manage stock, verify data, and make informed decisions.
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>Our Mission</Text>
        <Text style={styles.paragraph}>
          Our mission is to make medicine availability transparent and easy to
          access for medical owners, stockists, staff, and purchasers. Meditrap
          empowers licensed healthcare professionals with digital tools to
          coordinate stock, verify information, and reduce uncertainty in
          medicine sourcing.
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>Our Vision</Text>
        <Text style={styles.paragraph}>
          We envision a safer healthcare ecosystem where digital subscriptions
          deliver accurate medicine availability data, reduce manual follow-up,
          and strengthen collaboration across pharmacy networks without any
          physical product sales or delivery commitments.
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>How Meditrap Helps</Text>
        <Text style={styles.subheading}>Medical Owners</Text>
        <Text style={styles.paragraph}>
          Medical owners can search for medicine availability information,
          access role-specific insights, and connect with verified stockists.
        </Text>
        <Text style={styles.subheading}>Stockists</Text>
        <Text style={styles.paragraph}>
          Stockists can manage company details, list available medicines, and
          authorize staff to support verification workflows.
        </Text>
        <Text style={styles.subheading}>Staff</Text>
        <Text style={styles.paragraph}>
          Staff members use Meditrap to perform verification workflows and
          support accurate reporting within their authorized role.
        </Text>
        <Text style={styles.subheading}>Purchasers</Text>
        <Text style={styles.paragraph}>
          Purchasers can verify medicine-related information and access the
          latest availability updates based on their subscription level.
        </Text>
      </View>
      <MedicalDisclaimer />
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
  subheading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1d4ed8",
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: "#475569",
  },
};
