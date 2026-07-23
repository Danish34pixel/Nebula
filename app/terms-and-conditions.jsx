import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import LegalPageLayout from "../components/LegalPageLayout";

const TERMS_VIEWED_KEY = "@Meditrap/termsViewed";
const TERMS_VERSION = "1.0";

export default function TermsAndConditions() {
  const router = useRouter();
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleScroll = useCallback(
    async (event) => {
      const { contentOffset, layoutMeasurement, contentSize } =
        event.nativeEvent;
      const reachedBottom =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - 16;

      if (reachedBottom && !scrolledToBottom) {
        setScrolledToBottom(true);
        try {
          await AsyncStorage.setItem(TERMS_VIEWED_KEY, "true");
          await AsyncStorage.setItem("@Meditrap/termsVersion", TERMS_VERSION);
          await AsyncStorage.setItem(
            "@Meditrap/termsViewedAt",
            new Date().toISOString(),
          );
        } catch (error) {
          console.warn("Failed to store terms view status", error);
        }
      }
    },
    [scrolledToBottom],
  );

  return (
    <LegalPageLayout
      title="Terms and Conditions"
      description="Please read these Terms and Conditions carefully before using the Meditrap application. By creating an account, you agree to abide by the terms set out here."
      seoTitle="Meditrap Terms and Conditions"
      seoDescription="Terms and conditions for using Meditrap's subscription-based healthcare information platform."
      scrollProps={{ onScroll: handleScroll, scrollEventThrottle: 16 }}
    >
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>1. Acceptance of Terms</Text>
        <Text style={styles.sectionText}>
          By registering for Meditrap, you confirm that you have read,
          understood, and accepted these Terms and Conditions. These terms form
          a binding agreement between you and Meditrap.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>2. Eligibility</Text>
        <Text style={styles.sectionText}>
          You must be at least 18 years old and authorized to enter into a
          contract in your jurisdiction to use the service. If you are
          registering on behalf of an organization, you warrant that you have
          the authority to bind that organization.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>3. Account Registration</Text>
        <Text style={styles.sectionText}>
          You agree to provide accurate, complete, and up-to-date information
          when creating your account. You are responsible for maintaining the
          confidentiality of your login credentials and for all activity that
          occurs under your account.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>4. Use of Services</Text>
        <Text style={styles.sectionText}>
          Meditrap is provided to help manage medical procurement and
          communication. You agree to use the service only for lawful purposes
          and in compliance with applicable laws and industry standards. The app
          provides informational data only and does not diagnose or prescribe
          treatment.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>5. User Responsibilities</Text>
        <Text style={styles.sectionText}>
          You must not share false or misleading information, impersonate
          others, or transfer your account to another person without prior
          authorization from Meditrap. You are responsible for any content or
          actions generated through your account.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>6. Privacy and Data Use</Text>
        <Text style={styles.sectionText}>
          Your use of Meditrap is also governed by our Privacy Policy. We may
          collect and process certain personal information as described in the
          Privacy Policy, including account data, uploaded verification files,
          and usage information, and you agree to the terms contained there.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>7. Intellectual Property</Text>
        <Text style={styles.sectionText}>
          All intellectual property rights in the Meditrap platform, including
          trademarks, logos, and software, belong to Meditrap or its licensors.
          You are granted a limited license to use the service in accordance
          with these terms.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>8. Prohibited Conduct</Text>
        <Text style={styles.sectionText}>
          You agree not to use Meditrap to engage in illegal activities,
          distribute harmful software, breach security, or otherwise abuse the
          service. Meditrap reserves the right to suspend or terminate users who
          violate these rules.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>9. Third-Party Services</Text>
        <Text style={styles.sectionText}>
          Meditrap may integrate with third-party services to support the
          platform. Use of these services may be subject to additional terms.
          Meditrap is not responsible for the policies of third parties.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>10. Limitation of Liability</Text>
        <Text style={styles.sectionText}>
          To the maximum extent permitted by law, Meditrap is not liable for
          indirect, incidental, or consequential damages arising from your use
          of the platform. Our aggregate liability is limited to the amount paid
          by you, if any.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>11. Modification of Terms</Text>
        <Text style={styles.sectionText}>
          Meditrap may update these Terms and Conditions from time to time.
          Continued use of the service after changes are published constitutes
          acceptance of the revised terms.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>12. Termination</Text>
        <Text style={styles.sectionText}>
          Meditrap may suspend or terminate your access at any time for
          violations of these terms or for other lawful reasons. You may also
          close your account in accordance with our support procedures.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>13. Governing Law</Text>
        <Text style={styles.sectionText}>
          These Terms and Conditions are governed by applicable laws in the
          jurisdiction where Meditrap operates. Any disputes will be resolved
          through the appropriate courts or dispute resolution procedures.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>14. Contact Us</Text>
        <Text style={styles.sectionText}>
          If you have questions about these Terms and Conditions, please contact
          us at meditrap1@gmail.com. We encourage you to review the policy
          regularly.
        </Text>
      </View>

      <View style={styles.footerHintContainer}>
        {!scrolledToBottom ? (
          <View style={styles.footerHint}>
            <Text style={styles.hintTitle}>
              Scroll to the bottom to continue
            </Text>
            <Text style={styles.hintText}>
              Once you reach the end, the Sign Up checkbox will become
              available.
            </Text>
          </View>
        ) : (
          <View style={styles.footerHintActive}>
            <Text style={styles.hintTitle}>You have reached the end</Text>
            <Text style={styles.hintText}>
              Return to your signup screen to accept the Terms and Conditions.
            </Text>
          </View>
        )}
      </View>
    </LegalPageLayout>
  );
}

const styles = StyleSheet.create({
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
  footerHintContainer: {
    marginTop: 10,
    marginBottom: 30,
  },
  footerHint: {
    padding: 14,
    backgroundColor: "#eef2ff",
    borderRadius: 16,
  },
  footerHintActive: {
    padding: 14,
    backgroundColor: "#dcfce7",
    borderRadius: 16,
  },
  hintTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  hintText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
});
