import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import LegalPageLayout from "../components/LegalPageLayout";

export default function ContactUs() {
  const [contact, setContact] = useState({ name: "", email: "", message: "" });

  return (
    <LegalPageLayout
      title="Contact Us"
      description="Get in touch with Meditrap support for questions about subscription access, role permissions, or medicine availability information."
      seoTitle="Contact Meditrap Support"
      seoDescription="Contact Meditrap for support with subscriptions, account access, and medicine availability information."
    >
      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>Support Email</Text>
        <Text style={styles.paragraph}>meditrap1@gmail.com</Text>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={styles.heading}>Working Hours</Text>
        <Text style={styles.paragraph}>
          Monday to Friday, 9:00 AM to 6:00 PM IST
        </Text>
      </View>

      <View style={{ marginBottom: 18 }}>
        <Text style={styles.heading}>Send Us a Message</Text>
        <View style={styles.inputGroup}>
          <TextInput
            value={contact.name}
            onChangeText={(value) =>
              setContact((prev) => ({ ...prev, name: value }))
            }
            placeholder="Your name"
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />
        </View>
        <View style={styles.inputGroup}>
          <TextInput
            value={contact.email}
            onChangeText={(value) =>
              setContact((prev) => ({ ...prev, email: value }))
            }
            placeholder="Your email"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            style={styles.input}
          />
        </View>
        <View style={styles.inputGroupBig}>
          <TextInput
            value={contact.message}
            onChangeText={(value) =>
              setContact((prev) => ({ ...prev, message: value }))
            }
            placeholder="Your message"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={5}
            style={[styles.input, styles.textArea]}
          />
        </View>
        <TouchableOpacity style={styles.button} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Submit Message</Text>
        </TouchableOpacity>
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
  inputGroup: {
    marginBottom: 12,
  },
  inputGroupBig: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    color: "#0f172a",
    fontSize: 15,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  button: {
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
};
