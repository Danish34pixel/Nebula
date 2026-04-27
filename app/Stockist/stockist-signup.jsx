import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl, postForm } from "../../config/api";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width } = Dimensions.get("window");

export default function StockistSignup() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const [form, setForm] = useState({
    name: "", // Firm/Shop Name
    contactPerson: "",
    phone: "",
    email: "",
    password: "",
    address: { street: "", city: "", state: "", pincode: "" },
    licenseNumber: "",
    licenseExpiry: "",
    dob: "",
    bloodGroup: "",
    roleType: "",
    cntxNumber: "",
    profileImage: null,
    licenseImage: null,
  });

  const [previews, setPreviews] = useState({ profile: null, license: null });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateField, setDateField] = useState(null); // 'dob' or 'licenseExpiry'

  const handleInputChange = (path, value) => {
    if (path.startsWith("address.")) {
      const field = path.split(".")[1];
      setForm((prev) => ({
        ...prev,
        address: { ...prev.address, [field]: value },
      }));
    } else {
      setForm((prev) => ({ ...prev, [path]: value }));
    }
    if (errors[path]) {
      setErrors((prev) => {
        const newErrs = { ...prev };
        delete newErrs[path];
        return newErrs;
      });
    }
  };

  const pickImage = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera roll access is needed.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const imageObj = {
        uri: asset.uri,
        name: asset.fileName || `${type}_image.jpg`,
        type: asset.mimeType || "image/jpeg",
      };

      setForm((prev) => ({ ...prev, [`${type}Image`]: imageObj }));
      setPreviews((prev) => ({ ...prev, [type]: asset.uri }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    if (step === 1) {
      if (!form.name.trim()) newErrors.name = "Firm name is required";
      if (!form.email.trim()) newErrors.email = "Email is required";
      if (!form.password || form.password.length < 6)
        newErrors.password = "Password min 6 chars";
    } else if (step === 2) {
      if (!form.address.street.trim())
        newErrors["address.street"] = "Street is required";
      if (!form.address.pincode.trim())
        newErrors["address.pincode"] = "Pincode is required";
      if (!form.licenseNumber.trim())
        newErrors.licenseNumber = "License number is required";

      if (form.licenseExpiry) {
        const expiryDate = new Date(form.licenseExpiry);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiryDate < today) {
          newErrors.licenseExpiry = "License expiry cannot be in the past";
        }
      } else {
        newErrors.licenseExpiry = "License expiry is required";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event.type === "dismissed" || !selectedDate) return;

    const formattedDate = selectedDate.toISOString().split("T")[0]; // YYYY-MM-DD
    handleInputChange(dateField, formattedDate);
  };

  const openDatePicker = (field) => {
    setDateField(field);
    setShowDatePicker(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();

      // Append flattened fields
      for (const [key, value] of Object.entries(form)) {
        if (key === "address") {
          // Send as nested object fields for the backend to parse correctly
          formData.append("address[street]", value.street || "");
          formData.append("address[city]", value.city || "");
          formData.append("address[state]", value.state || "");
          formData.append("address[pincode]", value.pincode || "");
        } else if (key === "profileImage" || key === "licenseImage") {
          if (value && value.uri) {
            const fieldName =
              key === "profileImage" ? "profileImage" : "drugLicenseImage";

            let name = value.name || `upload.jpg`;

            if (Platform.OS === "web") {
              try {
                const response = await fetch(value.uri);
                const blob = await response.blob();

                if (!name.includes(".")) {
                  const mimeExt = (blob.type || "image/jpeg").split("/")[1];
                  name = `upload.${mimeExt === "jpeg" ? "jpg" : mimeExt}`;
                }

                formData.append(fieldName, blob, name);
              } catch (e) {
                console.error("Failed to convert image to blob on web:", e);
                formData.append(fieldName, value);
              }
            } else {
              const match = /\.(\w+)$/.exec(name);
              const type = match ? `image/${match[1]}` : "image/jpeg";

              formData.append(fieldName, {
                uri:
                  Platform.OS === "android"
                    ? value.uri
                    : value.uri.replace("file://", ""),
                name: name.includes(".") ? name : `${name}.jpg`,
                type,
              });
            }
          }
        } else if (key === "phone") {
          formData.append("contactNo", value); // Sync with Purchaser the use of contactNo
        } else if (value && typeof value === "string") {
          formData.append(key, value.trim());
        } else if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      }

      // Explicitly add role and secondary mapping for Name
      formData.append("role", "stockist");
      if (form.contactPerson) formData.append("fullName", form.contactPerson);

      const response = await postForm("/api/stockist/register", formData);

      if (response.success) {
        // Find the newly created ID
        const stockistId =
          response.data?._id ||
          response.data?.id ||
          response.user?._id ||
          response.user?.id;

        if (stockistId) {
          // Clear any old pending IDs first to avoid cross-role confusion
          await AsyncStorage.removeItem("pendingUserId");
          await AsyncStorage.setItem("pendingStockistId", String(stockistId));
          router.replace("/Stockist/stockist-verification");
        } else {
          // Fallback if ID is missing for some reason
          Alert.alert("Success", "Registration successful! Please log in.");
          router.replace("/Stockist/stockist-login");
        }
      } else {
        throw new Error(response.message || "Registration failed");
      }
    } catch (err) {
      Alert.alert("Registration Failed", err.message || "Connection Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                if (currentStep === 1) {
                  router.canGoBack() ? router.back() : router.replace("/");
                } else {
                  prevStep();
                }
              }}
              style={styles.backBtn}
            >
              <Feather name="arrow-left" size={24} color="#0d9488" />
            </TouchableOpacity>
            <View style={styles.titleBox}>
              <Text style={styles.title}>Registration</Text>
              <Text style={styles.subtitle}>
                Step {currentStep} of {totalSteps}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressRow}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressPill,
                  s <= currentStep
                    ? styles.progressPillActive
                    : styles.progressPillInactive,
                ]}
              />
            ))}
          </View>

          {/* Hero Card */}
          <LinearGradient
            colors={["#22d3ee", "#0891b2"]}
            style={styles.heroCard}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIconBox}>
                <Text style={styles.heroEmoji}>⚕️</Text>
              </View>
              <View>
                <Text style={styles.heroTitle}>MedTrap Partner</Text>
                <Text style={styles.heroSub}>
                  {currentStep === 1 && "Basic Information"}
                  {currentStep === 2 && "Professional Details"}
                  {currentStep === 3 && "Documents & Personal"}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Form Content */}
          <View style={styles.card}>
            {currentStep === 1 && (
              <View>
                <SectionHeader icon="home" title="Firm Information" />
                <Input
                  label="Firm/Shop Name"
                  icon="briefcase"
                  placeholder="Pharmacy Name"
                  value={form.name}
                  onChangeText={(v) => handleInputChange("name", v)}
                  error={errors.name}
                />
                <Input
                  label="Contact Person"
                  icon="user"
                  placeholder="Name"
                  value={form.contactPerson}
                  onChangeText={(v) => handleInputChange("contactPerson", v)}
                />
                <SectionHeader icon="mail" title="Contact Details" />
                <Input
                  label="Email"
                  icon="mail"
                  placeholder="Enter your mail"
                  value={form.email}
                  onChangeText={(v) => handleInputChange("email", v)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                />
                <Input
                  label="Phone"
                  icon="phone"
                  placeholder="Enter your phone number"
                  value={form.phone}
                  onChangeText={(v) => handleInputChange("phone", v)}
                  keyboardType="phone-pad"
                />
                <Input
                  label="Password"
                  icon="lock"
                  placeholder="Enter your password"
                  value={form.password}
                  onChangeText={(v) => handleInputChange("password", v)}
                  secureTextEntry
                  error={errors.password}
                />
              </View>
            )}

            {currentStep === 2 && (
              <View>
                <SectionHeader icon="map-pin" title="Location" />
                <Input
                  label="Street Address"
                  icon="map-pin"
                  placeholder="Shop Address"
                  value={form.address.street}
                  onChangeText={(v) => handleInputChange("address.street", v)}
                  error={errors["address.street"]}
                />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="City"
                      placeholder="City"
                      value={form.address.city}
                      onChangeText={(v) => handleInputChange("address.city", v)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="State"
                      placeholder="State"
                      value={form.address.state}
                      onChangeText={(v) =>
                        handleInputChange("address.state", v)
                      }
                    />
                  </View>
                </View>
                <Input
                  label="Pincode"
                  icon="hash"
                  placeholder="XXXXXX"
                  value={form.address.pincode}
                  onChangeText={(v) => handleInputChange("address.pincode", v)}
                  keyboardType="number-pad"
                  error={errors["address.pincode"]}
                />
                <SectionHeader icon="file-text" title="Professional" />
                <Input
                  label="License Number"
                  icon="shield"
                  placeholder="License No"
                  value={form.licenseNumber}
                  onChangeText={(v) => handleInputChange("licenseNumber", v)}
                  error={errors.licenseNumber}
                />

                {Platform.OS === "web" ? (
                  <Input
                    label="License Expiry"
                    icon="calendar"
                    placeholder="YYYY-MM-DD"
                    value={form.licenseExpiry}
                    onChangeText={(v) => handleInputChange("licenseExpiry", v)}
                    //@ts-ignore
                    type="date"
                    error={errors.licenseExpiry}
                  />
                ) : (
                  <TouchableOpacity
                    onPress={() => openDatePicker("licenseExpiry")}
                    activeOpacity={1}
                  >
                    <Input
                      label="License Expiry"
                      icon="calendar"
                      placeholder="Select expiry date"
                      value={form.licenseExpiry}
                      editable={false}
                      pointerEvents="none"
                      error={errors.licenseExpiry}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {currentStep === 3 && (
              <View>
                <SectionHeader icon="user" title="Personal Info" />
                {Platform.OS === "web" ? (
                  <Input
                    label="DOB"
                    icon="calendar"
                    placeholder="YYYY-MM-DD"
                    value={form.dob}
                    onChangeText={(v) => handleInputChange("dob", v)}
                    //@ts-ignore
                    type="date"
                    error={errors.dob}
                  />
                ) : (
                  <TouchableOpacity
                    onPress={() => openDatePicker("dob")}
                    activeOpacity={1}
                  >
                    <Input
                      label="DOB"
                      icon="calendar"
                      placeholder="Select date of birth"
                      value={form.dob}
                      editable={false}
                      pointerEvents="none"
                      error={errors.dob}
                    />
                  </TouchableOpacity>
                )}
                <Input
                  label="Blood Group"
                  icon="heart"
                  placeholder="O+"
                  value={form.bloodGroup}
                  onChangeText={(v) => handleInputChange("bloodGroup", v)}
                />
                <Input
                  label="Role Type"
                  icon="award"
                  placeholder="Proprietor/Pharmacist"
                  value={form.roleType}
                  onChangeText={(v) => handleInputChange("roleType", v)}
                />
                <Input
                  label="CNTX Number"
                  icon="hash"
                  placeholder="Identifier"
                  value={form.cntxNumber}
                  onChangeText={(v) => handleInputChange("cntxNumber", v)}
                />

                <SectionHeader icon="upload" title="Documents" />
                <UploadCard
                  label="Profile Photo"
                  type="profile"
                  preview={previews.profile}
                  onPress={() => pickImage("profile")}
                />
                <UploadCard
                  label="License Document"
                  type="license"
                  preview={previews.license}
                  onPress={() => pickImage("license")}
                />
              </View>
            )}

            <TouchableOpacity
              onPress={currentStep === totalSteps ? handleSubmit : nextStep}
              style={[styles.actionBtn, loading && styles.btnDisabled]}
              disabled={loading}
            >
              <LinearGradient
                colors={["#22d3ee", "#0891b2"]}
                style={styles.btnGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>
                    {currentStep === totalSteps ? "Complete" : "Continue"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {showDatePicker && Platform.OS !== "web" && (
          <DateTimePicker
            value={form[dateField] ? new Date(form[dateField]) : new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onDateChange}
            minimumDate={dateField === "licenseExpiry" ? new Date() : undefined}
            maximumDate={dateField === "dob" ? new Date() : undefined}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const SectionHeader = ({ icon, title }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionIcon}>
      <Feather name={icon} size={16} color="#fff" />
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const Input = ({ label, icon, error, secureTextEntry, ...props }) => {
  const [show, setShow] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View style={styles.inputGroup}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        {icon && (
          <Feather
            name={icon}
            size={20}
            color="#94a3b8"
            style={styles.inputIcon}
          />
        )}
        <TextInput
          style={[styles.input, error && styles.inputError]}
          placeholderTextColor="#94a3b8"
          secureTextEntry={isPassword && !show}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShow(!show)}
            style={styles.eyeIcon}
          >
            <Feather
              name={show ? "eye" : "eye-off"}
              size={20}
              color="#94a3b8"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const UploadCard = ({ label, preview, onPress }) => (
  <View style={styles.uploadGroup}>
    <Text style={styles.label}>{label}</Text>
    <TouchableOpacity onPress={onPress}>
      <LinearGradient colors={["#22d3ee", "#0891b2"]} style={styles.uploadBox}>
        {preview ? (
          <Image source={{ uri: preview }} style={styles.preview} />
        ) : (
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 32, marginBottom: 4 }}>📸</Text>
            <Text style={styles.uploadMainText}>Tap to upload</Text>
            <Text style={styles.uploadSubText}>PNG, JPG up to 5MB</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f1f5f9" },
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  titleBox: { marginLeft: 16 },
  title: { fontSize: 24, fontWeight: "800", color: "#1e293b" },
  subtitle: { fontSize: 13, color: "#64748b" },
  progressRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  progressPill: { flex: 1, height: 6, borderRadius: 3 },
  progressPillActive: { backgroundColor: "#06b6d4" },
  progressPillInactive: { backgroundColor: "#e2e8f0" },
  heroCard: { borderRadius: 28, padding: 24, marginBottom: 24, elevation: 4 },
  heroContent: { flexDirection: "row", alignItems: "center", gap: 16 },
  heroIconBox: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroEmoji: { fontSize: 28 },
  heroTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  heroSub: { color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 2 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 32,
    padding: 24,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    marginBottom: 20,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#06b6d4",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#334155" },
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: "#1e293b" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  inputIcon: { marginRight: 12 },
  eyeIcon: { padding: 4 },
  inputError: { borderColor: "#fecaca" },
  errorText: { color: "#ef4444", fontSize: 11, marginTop: 4, marginLeft: 4 },
  row: { flexDirection: "row", gap: 12 },
  uploadGroup: { marginBottom: 20 },
  uploadBox: {
    height: 140,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  uploadMainText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  uploadSubText: { color: "rgba(255,255,255,0.8)", fontSize: 11 },
  preview: { width: "100%", height: "100%" },
  actionBtn: {
    marginTop: 12,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 4,
  },
  btnGradient: { paddingVertical: 18, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  btnDisabled: { opacity: 0.7 },
});
