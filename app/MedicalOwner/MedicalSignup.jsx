import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl, postForm } from "../../config/api";

const InputField = ({ icon, label, value, onChangeText, placeholder, secureTextEntry, keyboardType, showEye, onToggleEye }) => (
  <View style={styles.inputGroup}>
    <View style={styles.labelRow}>
      <Feather name={icon} size={16} color="#0891b2" style={styles.labelIcon} />
      <Text style={styles.label}>{label}</Text>
    </View>
    <View style={styles.inputWrapper}>
      <TextInput
        style={[styles.input, showEye !== undefined && { paddingRight: 50 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
      {showEye !== undefined && (
        <TouchableOpacity style={styles.eyeBtn} onPress={onToggleEye}>
          <Feather name={secureTextEntry ? "eye" : "eye-off"} size={20} color="#64748b" />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

export default function MedicalSignup() {
  const router = useRouter();
  const [form, setForm] = useState({
    medicalName: "",
    ownerName: "",
    address: "",
    email: "",
    contactNo: "",
    drugLicenseNo: "",
    password: "",
  });
  const [licenseImage, setLicenseImage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "We need camera roll access to upload your license.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType?.Images || "images",
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setLicenseImage(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!form.medicalName || !form.ownerName || !form.address || !form.email || !form.contactNo || !form.drugLicenseNo || !form.password || !licenseImage) {
      Alert.alert("Error", "Please fill in all required fields and upload your license image.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      
      // Append text fields
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // Append image
      if (licenseImage) {
        const uri = licenseImage.uri;
        let name = uri.split("/").pop();
        
        if (Platform.OS === 'web') {
           const response = await fetch(uri);
           const blob = await response.blob();
           
           // Expo ImagePicker blob URIs on web lack extensions. Backend multer requires it.
           if (!name.includes(".")) {
             const mimeExt = (blob.type || "image/jpeg").split("/")[1];
             name = `upload.${mimeExt === 'jpeg' ? 'jpg' : mimeExt}`;
           }
           
           formData.append('drugLicenseImage', blob, name);
        } else {
           const match = /\.(\w+)$/.exec(name);
           const type = match ? `image/${match[1]}` : "image/jpeg";
           
           formData.append('drugLicenseImage', {
             uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
             name: name.includes(".") ? name : `${name}.jpg`,
             type,
           });
        }
      }

      const res = await postForm("/api/auth/signup", formData);

      if (res.success) {
        Alert.alert("Success", "Registration successful! Your account is under review.");
        
        // Store pending ID and credentials for auto-login if available
        const id = res.user?._id || res.user?.id;
        if (id) {
          await AsyncStorage.setItem("pendingUserId", String(id));
          await AsyncStorage.setItem("pendingUserCreds", JSON.stringify({ email: form.email, password: form.password }));
        }
        
        // Redirect
        setTimeout(() => router.replace("/MedicalOwner/MedicalMiddle"), 2000);
      } else {
        throw new Error(res.message || "Signup failed");
      }
    } catch (err) {
      let errorMsg = err.message;
      if (err.body && err.body.errors && err.body.errors.length > 0) {
        errorMsg = err.body.errors.join("\n");
      }
      Alert.alert("Signup Error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={["#f0fdfa", "#ecfeff"]} style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#0e7490" />
              </TouchableOpacity>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Register your medical store</Text>
            </View>

            {/* Form */}
            <View style={styles.formCard}>
              <InputField
                icon="home"
                label="Medical Store Name"
                value={form.medicalName}
                onChangeText={(text) => setForm({ ...form, medicalName: text })}
                placeholder="Enter store name"
              />
              <InputField
                icon="user"
                label="Owner Name"
                value={form.ownerName}
                onChangeText={(text) => setForm({ ...form, ownerName: text })}
                placeholder="Enter owner's name"
              />
              <InputField
                icon="map-pin"
                label="Address"
                value={form.address}
                onChangeText={(text) => setForm({ ...form, address: text })}
                placeholder="Complete address"
              />
              <InputField
                icon="mail"
                label="Email Address"
                value={form.email}
                onChangeText={(text) => setForm({ ...form, email: text })}
                placeholder="your@email.com"
                keyboardType="email-address"
              />
              <InputField
                icon="phone"
                label="Contact Number"
                value={form.contactNo}
                onChangeText={(text) => setForm({ ...form, contactNo: text })}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />
              <InputField
                icon="shield"
                label="Drug License Number"
                value={form.drugLicenseNo}
                onChangeText={(text) => setForm({ ...form, drugLicenseNo: text })}
                placeholder="License number"
              />

              {/* Image Picker */}
              <View style={styles.imagePickerGroup}>
                <Text style={styles.label}>Drug License Image</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                  {licenseImage ? (
                    <View style={styles.previewContainer}>
                      <Image source={{ uri: licenseImage.uri }} style={styles.preview} />
                      <View style={styles.previewOverlay}>
                        <Feather name="check-circle" size={24} color="#10b981" />
                        <Text style={styles.previewText}>License Selected</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.pickerPlaceholder}>
                      <Feather name="upload-cloud" size={32} color="#94a3b8" />
                      <Text style={styles.pickerText}>Tap to upload license image</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <InputField
                icon="lock"
                label="Password"
                value={form.password}
                onChangeText={(text) => setForm({ ...form, password: text })}
                placeholder="Create password"
                secureTextEntry={!showPassword}
                showEye={showPassword}
                onToggleEye={() => setShowPassword(!showPassword)}
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={["#0891b2", "#0e7490"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Create Account</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push("/login")} style={styles.loginLink}>
                <Text style={styles.loginLinkText}>
                  Already have an account? <Text style={styles.loginLinkBold}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = {
  safeArea: { flex: 1, backgroundColor: "#f0fdfa" },
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 32 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
  },
  title: { fontSize: 28, fontWeight: "800", color: "#1e293b", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#64748b" },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 32,
    padding: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  inputGroup: { marginBottom: 20 },
  labelRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  labelIcon: { marginRight: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#475569" },
  inputWrapper: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1e293b",
  },
  eyeBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePickerGroup: { marginBottom: 20 },
  imagePicker: {
    marginTop: 8,
    height: 140,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    overflow: "hidden",
  },
  pickerPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  pickerText: {
    marginTop: 8,
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
  },
  previewContainer: { flex: 1, position: "relative" },
  preview: { flex: 1 },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewText: { marginTop: 8, fontSize: 14, fontWeight: "bold", color: "#10b981" },
  submitBtn: { marginTop: 10, borderRadius: 16, overflow: "hidden" },
  submitGradient: { height: 56, justifyContent: "center", alignItems: "center" },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  loginLink: { marginTop: 24, alignItems: "center" },
  loginLinkText: { fontSize: 14, color: "#64748b" },
  loginLinkBold: { color: "#0891b2", fontWeight: "bold" },
};
