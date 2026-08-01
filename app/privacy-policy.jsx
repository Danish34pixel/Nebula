import { Text, View } from "react-native";
import LegalPageLayout from "../components/LegalPageLayout";

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      description="This Privacy Policy explains how Meditrap collects, uses, and protects your information across our subscription-based healthcare platform."
      seoTitle="Meditrap Privacy Policy"
      seoDescription="Meditrap collects only the information needed to support secure subscription access, role-based permissions, and medicine availability information."
    >
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>1. Introduction</Text>
        <Text style={styles.sectionText}>
          Meditrap is a subscription-based healthcare information platform. We
          do not sell or deliver medicines. This Privacy Policy explains how we
          handle your personal data across our digital service.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>2. Information We Collect</Text>
        <Text style={styles.sectionText}>
          We collect information necessary to authenticate accounts, deliver
          subscription services, and support role-based access. We only collect
          details needed for account creation, identity verification, and
          subscription management.
        </Text>
        <Text style={styles.bullet}>
          • Login and account credentials, including email, phone number, and
          password.
        </Text>
        <Text style={styles.bullet}>
          • Subscription status, payment references, and service access
          information.
        </Text>
        <Text style={styles.bullet}>
          • Role details for Admin, Stockist, Staff, and Purchaser users.
        </Text>
        <Text style={styles.bullet}>
          • Usage data such as app interactions, search queries, and feature
          access patterns.
        </Text>
        <Text style={styles.bullet}>
          • Identity verification documents, profile images, or uploaded files
          where required for signup or account verification.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>3. Role-Based Permissions</Text>
        <Text style={styles.sectionText}>
          Meditrap supports different access levels depending on your role.
          Access permissions are assigned to Admins, Stockists, Staff, and
          Purchasers.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>4. How We Use Information</Text>
        <Text style={styles.sectionText}>
          We use your data to provide the Meditrap service, protect your
          account, and improve the platform.
        </Text>
        <Text style={styles.bullet}>
          • Authenticate and secure user accounts.
        </Text>
        <Text style={styles.bullet}>
          • Manage subscription access and role-based permissions.
        </Text>
        <Text style={styles.bullet}>
          • Deliver medicine availability information and related updates.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>5. Cookies and Tracking</Text>
        <Text style={styles.sectionText}>
          We may use cookies and analytics tools to understand platform usage
          and improve performance. Cookies help keep your session secure and
          remember your preferences.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>6. Security</Text>
        <Text style={styles.sectionText}>
          We implement reasonable technical and organizational measures to
          protect your data from unauthorized access, disclosure, and loss.
          Tokens are stored using secure storage on supported devices, and
          sensitive data is transmitted over HTTPS.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>7. Data Retention</Text>
        <Text style={styles.sectionText}>
          We retain your information only as needed to provide services, comply
          with legal obligations, and maintain security.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>
          8. Admin, Stockist, Staff, and Purchaser Data
        </Text>
        <Text style={styles.sectionText}>
          Data access depends on your role. Admins manage platform settings.
          Stockists manage company and medicine availability details. Staff
          support verification workflows. Purchasers access medicine
          availability information reported by stockists and admins.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>9. Your Rights</Text>
        <Text style={styles.sectionText}>
          You may request access to your personal information and ask us to
          correct inaccurate data. Questions about data privacy can be sent to
          our support email.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>10. Contact Information</Text>
        <Text style={styles.sectionText}>
          If you have questions about this policy, contact us at
          meditrap1@gmail.com.
        </Text>
      </View>
    </LegalPageLayout>
  );
}

const styles = {
  section: { marginBottom: 20 },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#475569",
  },
  bullet: {
    fontSize: 14,
    lineHeight: 22,
    color: "#475569",
    marginLeft: 10,
    marginTop: 6,
  },
};
