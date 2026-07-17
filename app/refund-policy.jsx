import { Text, View } from "react-native";
import LegalPageLayout from "../components/LegalPageLayout";

export default function RefundPolicy() {
  return (
    <LegalPageLayout
      title="Refund Policy"
      description="Meditrap is a subscription service for healthcare information and does not sell physical products. This policy explains refund procedures for subscription payments and related issues."
      seoTitle="Meditrap Refund Policy"
      seoDescription="Read Meditrap's refund policy for subscription payments, duplicate charges, failed payments, and subscription activation issues."
    >
      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>Subscription Refunds</Text>
        <Text style={styles.paragraph}>
          Meditrap operates as a subscription-based digital platform. Refunds
          are available for subscription payments in accordance with this
          policy. Since we do not sell physical products, all refund requests
          relate only to digital access and subscription charges.
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>Duplicate Payment Refunds</Text>
        <Text style={styles.paragraph}>
          If you are charged more than once for the same subscription, contact
          our support team immediately with the relevant payment details.
          Duplicate payments will be reviewed and refunded within 7 to 10
          business days after verification.
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>Failed Payment Handling</Text>
        <Text style={styles.paragraph}>
          If your payment fails, your subscription will not be activated until
          the issue is resolved. We will notify you of any failed payment and
          provide guidance on how to retry or update your payment information.
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>Subscription Activation Issues</Text>
        <Text style={styles.paragraph}>
          If your subscription is not activated after a successful payment,
          contact our support team. We will investigate activation issues and
          restore access as quickly as possible once we confirm the payment.
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>Refund Processing Timeline</Text>
        <Text style={styles.paragraph}>
          Approved refunds are typically processed within 7 to 10 business days.
          The final credit may depend on your payment provider or bank.
        </Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>Contact Support</Text>
        <Text style={styles.paragraph}>
          For refund requests and payment-related questions, contact us at
          meditrap1@gmail.com. Provide your subscription details and payment
          reference to help us resolve your request faster.
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
