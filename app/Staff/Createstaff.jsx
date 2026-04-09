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
  });

  const [user, setUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [attemptedProfile, setAttemptedProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [aadhar, setAadhar] = useState(null);
  const [stockistsList, setStockistsList] = useState([]);
  const [selectedStockist, setSelectedStockist] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Load session and verify authorization
  const verifySession = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setAttemptedProfile(true);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      const res = await fetch(apiUrl("/api/auth/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.user) {
        const u = data.user;
        setUser(u);
        await AsyncStorage.setItem("user", JSON.stringify(u));

        // Check authorization
        const role = String(u.role || u.roleType || "").toLowerCase();
        const authorized = ["admin", "stockist", "proprietor"].some((r) =>
          role.includes(r)
        );
        setIsAuthorized(authorized);

        // If admin, load stockists
        if (role === "admin") {
          try {
            const sres = await fetch(apiUrl("/api/stockist"), {
              headers: { Authorization: `Bearer ${token}` },
            });
            const sdata = await sres.json().catch(() => ({}));
            setStockistsList(sdata?.data || []);
          } catch (e) {
            console.error("Failed to load stockists", e);
          }
        }
      } else {
        await AsyncStorage.removeItem("user");
      }
    } catch (e) {
      console.error("Session verification failed", e);
    } finally {
      setAttemptedProfile(true);
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const pickImage = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need access to your gallery to upload images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType?.Images || "images",
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
    if (!form.fullName || !form.contact) {
      Alert.alert("Error", "Name and Contact are required.");
      return;
    }
    if (!image || !aadhar) {
      Alert.alert("Error", "Please attach profile photo and Aadhar card.");
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

      if (user?.role === "admin" && selectedStockist) {
        fd.append("stockist", selectedStockist);
      }

      // Format image for FormData (supports Native and Web)
      const createFormDataImage = async (asset, fieldName) => {
        const uri = asset.uri;
        if (Platform.OS === "web") {
          const response = await fetch(uri);
          const blob = await response.blob();
          const name = uri.split("/").pop() || `${fieldName}.jpg`;
          return new File([blob], name, { type: blob.type || "image/jpeg" });
        } else {
          const name = uri.split("/").pop();
          const type = `image/${name.split(".").pop()}`;
          return { uri, name, type };
        }
      };

      fd.append("image", await createFormDataImage(image, "image"));
      fd.append("aadharCard", await createFormDataImage(aadhar, "aadharCard"));

      const res = await fetch(apiUrl("/api/staff"), {
        method: "POST",
        body: fd,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to create staff");

      Alert.alert("Success", "Staff member created successfully!");
      router.replace("/Stockist/stockist-dashboard");
    } catch (err) {
      Alert.alert("Submission Failed", String(err));
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Verifying session...</Text>
      </View>
    );
  }

  if (!isAuthorized) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.unauthorizedBox}>
          <Feather name="shield-off" size={64} color="#f43f5e" />
          <Text style={styles.unauthorizedTitle}>Unauthorized</Text>
          <Text style={styles.unauthorizedSubtitle}>
            Only stockists or admins can add staff members.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/Stockist/stockist-login")}
            style={styles.loginBtn}
          >
            <Text style={styles.loginBtnText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <LinearGradient colors={["#14b8a6", "#0d9488"]} style={styles.iconBox}>
              <Feather name="user-plus" size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>Create Staff Member</Text>
            <Text style={styles.subtitle}>Add a new team member and assign them to a stockist.</Text>
          </View>

          <View style={styles.formCard}>
            {user?.role === "admin" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Assign to Stockist</Text>
                <View style={[styles.inputContainer, { paddingHorizontal: 0 }]}>
                  {/* Select replacement for Native */}
                  <TouchableOpacity 
                    style={styles.selectBtn}
                    onPress={() => {
                      // Implementation for stockist selection modal or picker
                      // For now, using Simple Prompt for POC or static selection
                      Alert.alert("Stockist", "Select a stockist from the list", stockistsList.map(s => ({
                        text: s.name || s.companyName,
                        onPress: () => setSelectedStockist(s._id)
                      })));
                    }}
                  >
                    <Text style={[styles.selectText, !selectedStockist && { color: "#94a3b8" }]}>
                      {selectedStockist ? stockistsList.find(s => s._id === selectedStockist)?.name : "Tap to select stockist..."}
                    </Text>
                    <Feather name="chevron-down" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>
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
              label="Full Address"
              placeholder="Enter full address"
              value={form.address}
              onChangeText={(t) => setForm((f) => ({ ...f, address: t }))}
              icon="map-pin"
              multiline
            />

            <View style={styles.uploadRow}>
              <UploadBox
                label="Profile Photo"
                asset={image}
                onPress={() => pickImage("profile")}
                icon="image"
              />
              <UploadBox
                label="Aadhar Card"
                asset={aadhar}
                onPress={() => pickImage("aadhar")}
                icon="file-text"
              />
            </View>

            <TouchableOpacity
              onPress={submit}
              disabled={loading}
              style={styles.submitWrapper}
            >
              <LinearGradient colors={["#14b8a6", "#0d9488"]} style={styles.submitBtn}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.submitText}>Create Staff Member</Text>
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
      <TextInput
        style={styles.input}
        placeholderTextColor="#94a3b8"
        {...props}
      />
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
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  loadingText: { marginTop: 12, color: "#64748b", fontWeight: "600" },
  scrollContent: { padding: 20 },
  header: { alignItems: "center", marginBottom: 32 },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#14b8a6",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  title: { fontSize: 28, fontWeight: "900", color: "#1e293b", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#64748b", textAlign: "center", marginTop: 8, paddingHorizontal: 20 },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 32,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 8, marginLeft: 4 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
    minHeight: 56,
  },
  input: { flex: 1, fontSize: 15, color: "#1e293b", fontWeight: "600" },
  selectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  selectText: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  uploadRow: { flexDirection: "row", gap: 16, marginBottom: 24 },
  uploadBtn: {
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    overflow: "hidden",
  },
  uploadPlaceholder: { fontSize: 12, fontWeight: "700", color: "#94a3b8", marginTop: 4 },
  previewImage: { width: "100%", height: "100%" },
  submitWrapper: { marginTop: 12 },
  submitBtn: {
    height: 60,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#14b8a6",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  unauthorizedBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  unauthorizedTitle: { fontSize: 24, fontWeight: "900", color: "#1e293b", marginTop: 24 },
  unauthorizedSubtitle: { fontSize: 15, color: "#64748b", textAlign: "center", marginTop: 12, marginBottom: 32 },
  loginBtn: { paddingVertical: 14, paddingHorizontal: 32, backgroundColor: "#14b8a6", borderRadius: 16 },
  loginBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
