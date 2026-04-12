import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl } from "../../config/api";

export default function CreateStaff() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: "",
    contact: "",
    email: "",
    address: "",
    password: "",
    currentWorkingPlace: "",
  });

  const [user, setUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [aadhar, setAadhar] = useState(null);
  const [isFresher, setIsFresher] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        setProfileLoading(false);
        return;
      }

      const res = await fetch(apiUrl("/api/auth/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.user) {
        setUser(data.user);
      }
    } catch (e) {
      console.error("Session verification failed", e);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pickImage = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need access to your gallery to upload images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images || "Images",
      allowsEditing: true,
      aspect: [4, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      if (type === "profile") setImage(result.assets[0]);
      else setAadhar(result.assets[0]);
    }
  };

  const submit = async () => {
    setErrorMsg("");
    if (!form.fullName || !form.contact || !form.email) {
      setErrorMsg("Name, Email, and Contact are required.");
      return;
    }
    if (!image || !aadhar) {
      setErrorMsg("Please attach profile photo and Aadhar card.");
      return;
    }
    if (!form.password) {
      setErrorMsg("Password is required to create a staff member.");
      return;
    }
    if (!isFresher && !form.currentWorkingPlace) {
      setErrorMsg("Please enter your current working place or select 'Fresher'.");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const fd = new FormData();
      fd.append("fullName", form.fullName);
      fd.append("contact", form.contact);
      fd.append("email", form.email);
      fd.append("address", form.address);
      fd.append("isFresher", isFresher);
      if (!isFresher) fd.append("currentWorkingPlace", form.currentWorkingPlace);

      if (form.password) fd.append("password", form.password);

      const createFormDataImage = async (asset, fieldName) => {
        const uri = asset.uri;
        if (Platform.OS === "web") {
          const response = await fetch(uri);
          const blob = await response.blob();
          let name = asset.name || asset.fileName || uri.split("/").pop() || `${fieldName}.jpg`;
          if (!name.includes(".")) name += (blob.type.includes("png") ? ".png" : ".jpg");
          return new File([blob], name, { type: blob.type || "image/jpeg" });
        } else {
          const name = uri.split("/").pop();
          const match = /\.(\w+)$/.exec(name);
          const type = match ? `image/${match[1]}` : `image`;
          return { uri, name, type };
        }
      };

      fd.append("image", await createFormDataImage(image, "image"));
      fd.append("aadharCard", await createFormDataImage(aadhar, "aadharCard"));

      const endpoint = user ? "/api/staff" : "/api/auth/staff-signup";
      const headers = user ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(apiUrl(endpoint), {
        method: "POST",
        body: fd,
        headers,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to create staff");

      Alert.alert("Success", user ? "Staff member created successfully!" : "Registration successful! Please login.");
      if (user) {
        router.replace("/Stockist/stockist-dashboard");
      } else {
        router.replace("/Staff/staff-login");
      }
    } catch (err) {
      setErrorMsg(String(err));
      Alert.alert("Submission Failed", String(err));
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c084fc" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const isPublicSignup = !user;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <LinearGradient colors={["#c084fc", "#9333ea"]} style={styles.iconBox}>
              <Feather name="user-plus" size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>{isPublicSignup ? "Staff Registration" : "Create Staff Member"}</Text>
            <Text style={styles.subtitle}>
              {isPublicSignup ? "Enroll as a staff member for your stockist." : "Add a new team member."}
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.fresherToggleContainer}>
              <Text style={styles.fresherToggleLabel}>Are you a Fresher?</Text>
              <TouchableOpacity
                style={[styles.toggleBtn, isFresher && styles.toggleBtnActive]}
                onPress={() => {
                  setIsFresher(!isFresher);
                  if (!isFresher) {
                    // if switching TO fresher
                    setForm(f => ({ ...f, currentWorkingPlace: "" }));
                  }
                }}
              >
                <View style={[styles.toggleIndicator, isFresher && styles.toggleIndicatorActive]} />
              </TouchableOpacity>
            </View>

            {!isFresher && (
              <InputField
                label="Current Working Place"
                placeholder="e.g., Apollo Hospital, Medtek Pharma"
                value={form.currentWorkingPlace}
                onChangeText={(t) => setForm((f) => ({ ...f, currentWorkingPlace: t }))}
                icon="briefcase"
              />
            )}

            <InputField
              label="Full Name"
              placeholder="e.g., John Doe"
              value={form.fullName}
              onChangeText={(t) => setForm((f) => ({ ...f, fullName: t }))}
              icon="user"
            />

            <InputField
              label="Contact Number"
              placeholder="e.g., 9876543210"
              value={form.contact}
              onChangeText={(t) => setForm((f) => ({ ...f, contact: t }))}
              icon="phone"
              keyboardType="phone-pad"
            />

            <InputField
              label="Email Address"
              placeholder="e.g., john.doe@example.com"
              value={form.email}
              onChangeText={(t) => setForm((f) => ({ ...f, email: t }))}
              icon="mail"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <InputField
              label="Password"
              placeholder="Enter password"
              value={form.password}
              onChangeText={(t) => setForm((f) => ({ ...f, password: t }))}
              icon="lock"
              secureTextEntry
            />

            <InputField
              label="Full Address"
              placeholder="Enter full address"
              value={form.address}
              onChangeText={(t) => setForm((f) => ({ ...f, address: t }))}
              icon="map-pin"
              multiline
            />

            <View style={styles.uploadRow}>
              <UploadBox label="Profile Photo" asset={image} onPress={() => pickImage("profile")} icon="camera" />
              <UploadBox label="Aadhar Card" asset={aadhar} onPress={() => pickImage("aadhar")} icon="file-text" />
            </View>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <TouchableOpacity onPress={submit} disabled={loading} style={styles.submitWrapper}>
              <LinearGradient colors={["#c084fc", "#9333ea"]} style={styles.submitBtn}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.submitText}>{isPublicSignup ? "Complete Registration" : "Create Staff Member"}</Text>
                    <Feather name="arrow-right" size={20} color="#fff" style={{ marginLeft: 8 }} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const InputField = ({ label, icon, ...props }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputContainer}>
      <Feather name={icon} size={20} color="#94a3b8" style={{ marginRight: 12 }} />
      <TextInput style={styles.input} placeholderTextColor="#94a3b8" {...props} />
    </View>
  </View>
);

const UploadBox = ({ label, asset, onPress, icon }) => (
  <View style={{ flex: 1 }}>
    <Text style={styles.label}>{label}</Text>
    <TouchableOpacity onPress={onPress} style={styles.uploadBtn}>
      {asset ? (
        <Image source={{ uri: asset.uri }} style={styles.previewImage} />
      ) : (
        <>
          <Feather name={icon} size={24} color="#94a3b8" />
          <Text style={styles.uploadPlaceholder}>Upload</Text>
        </>
      )}
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#faf5ff" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  loadingText: { marginTop: 12, color: "#64748b", fontWeight: "600" },
  scrollContent: { padding: 20 },
  header: { alignItems: "center", marginBottom: 32 },
  iconBox: { width: 72, height: 72, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 16, shadowColor: "#9333ea", shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  title: { fontSize: 28, fontWeight: "900", color: "#1e293b", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#64748b", textAlign: "center", marginTop: 8, paddingHorizontal: 20 },
  formCard: { backgroundColor: "#fff", borderRadius: 32, padding: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 20, elevation: 4 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 8, marginLeft: 4 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 16, minHeight: 56 },
  input: { flex: 1, fontSize: 15, color: "#1e293b", fontWeight: "600" },
  selectBtnWrapper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f8fafc", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 16, minHeight: 56 },
  selectText: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  uploadRow: { flexDirection: "row", gap: 16, marginBottom: 24 },
  uploadBtn: { height: 100, borderRadius: 16, borderWidth: 2, borderColor: "#e2e8f0", borderStyle: "dashed", justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc", overflow: "hidden" },
  uploadPlaceholder: { fontSize: 12, fontWeight: "700", color: "#94a3b8", marginTop: 4 },
  previewImage: { width: "100%", height: "100%" },
  submitWrapper: { marginTop: 12 },
  submitBtn: { height: 60, borderRadius: 18, flexDirection: "row", justifyContent: "center", alignItems: "center", shadowColor: "#9333ea", shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  submitText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  errorBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fef2f2", padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#fecaca" },
  errorText: { color: "#b91c1c", fontSize: 14, fontWeight: "600", marginLeft: 12, flex: 1 },
  fresherToggleContainer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20, backgroundColor: "#f8fafc", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  fresherToggleLabel: { fontSize: 15, fontWeight: "700", color: "#475569" },
  toggleBtn: { width: 52, height: 32, borderRadius: 16, backgroundColor: "#cbd5e1", padding: 4, justifyContent: "center" },
  toggleBtnActive: { backgroundColor: "#14b8a6" },
  toggleIndicator: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleIndicatorActive: { transform: [{ translateX: 20 }] },
});
