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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { secureStorage } from "../../utils/secureStore";
import { apiUrl, fetchJson, postForm, postJson } from "../../config/api";

export default function PurchaserSignup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    address: "",
    contactNo: "",
    email: "",
    password: "",
    confirmPassword: "",
    aadharImage: null,
    photo: null,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [previews, setPreviews] = useState({
    aadharImage: null,
    photo: null,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [stockists, setStockists] = useState([]);
  const [selectedStockists, setSelectedStockists] = useState([]);
  const [loadingStockists, setLoadingStockists] = useState(false);
  const [stockistQuery, setStockistQuery] = useState("");
  const [stockistDropdownOpen, setStockistDropdownOpen] = useState(false);

  const handleInputChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const pickImage = async (fieldName) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need camera roll permissions to make this work!");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setFormData((prev) => ({
        ...prev,
        [fieldName]: {
          uri: asset.uri,
          name: asset.fileName || `${fieldName}.jpg`,
          type: asset.mimeType || "image/jpeg",
        },
      }));
      setPreviews((prev) => ({
        ...prev,
        [fieldName]: asset.uri,
      }));
      if (errors[fieldName]) {
        setErrors((prev) => ({ ...prev, [fieldName]: "" }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = "Name must be at least 3 characters";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    } else if (formData.address.trim().length < 10) {
      newErrors.address = "Please enter a complete address";
    }

    if (!formData.contactNo.trim()) {
      newErrors.contactNo = "Contact number is required";
    } else if (!/^[6-9]\d{9}$/.test(formData.contactNo.trim())) {
      newErrors.contactNo = "Please enter a valid 10-digit mobile number";
    }

    if (!formData.email || !formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email.trim())
    ) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password || !formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.aadharImage) {
      newErrors.aadharImage = "Aadhar card image is required";
    }

    if (!formData.photo) {
      newErrors.photo = "Photo is required";
    }

    if (selectedStockists.length < 3) {
      newErrors.stockists = "Please select at least 3 stockists";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const submitData = new FormData();
      submitData.append("fullName", formData.fullName.trim());
      submitData.append("address", formData.address.trim());
      submitData.append("email", formData.email.trim());
      submitData.append("password", formData.password || "");
      submitData.append("contactNo", formData.contactNo.trim());

      // On web, we need to convert the URI to a Blob for FormData to send it as a file
      if (Platform.OS === "web") {
        if (formData.aadharImage) {
          const aadharBlob = await (
            await fetch(formData.aadharImage.uri)
          ).blob();
          let name =
            formData.aadharImage.name ||
            formData.aadharImage.fileName ||
            "aadhar.jpg";
          if (!name.includes("."))
            name += aadharBlob.type.includes("png") ? ".png" : ".jpg";
          submitData.append("aadharImage", aadharBlob, name);
        }
        if (formData.photo) {
          const photoBlob = await (await fetch(formData.photo.uri)).blob();
          let name =
            formData.photo.name || formData.photo.fileName || "photo.jpg";
          if (!name.includes("."))
            name += photoBlob.type.includes("png") ? ".png" : ".jpg";
          submitData.append("personalPhoto", photoBlob, name);
        }
      } else {
        submitData.append("aadharImage", formData.aadharImage);
        submitData.append("personalPhoto", formData.photo);
      }

      let purchaserId = null;
      try {
        const created = await postForm(
          "/api/auth/purchaser-signup",
          submitData,
        );
        const accessToken = created?.accessToken || created?.token;
        if (accessToken) await secureStorage.setItem("token", accessToken);
        if (created?.refreshToken)
          await secureStorage.setItem("refreshToken", created.refreshToken);
        purchaserId = created?.purchaser?._id || created?.user?._id || null;
      } catch (signupErr) {
        if (signupErr?.status !== 409) throw signupErr;

        const loginRes = await postJson("/api/purchaser/login", {
          email: formData.email.trim(),
          password: formData.password || "",
        });
        const loginData = loginRes?.data || {};
        if (!loginData?.accessToken) {
          throw new Error(
            "Email already exists. Please login from purchaser login.",
          );
        }
        await secureStorage.setItem("token", loginData.accessToken);
        if (loginData?.refreshToken) {
          await secureStorage.setItem("refreshToken", loginData.refreshToken);
        }
        purchaserId = loginData?.purchaser?._id || null;
      }

      if (purchaserId) {
        await AsyncStorage.setItem("pendingPurchaserId", purchaserId);
      }

      const token = await AsyncStorage.getItem("token");
      if (token) {
        await postJson("/api/purchasing-card/request", {
          stockistIds: selectedStockists,
          purchaserId,
          requester: { fullName: formData.fullName, email: formData.email },
          purchaserData: {
            fullName: formData.fullName,
            address: formData.address,
            contactNo: formData.contactNo,
            email: formData.email,
          },
        });
      }

      router.push("/purchasermiddle");
    } catch (error) {
      setErrorMessage(
        error.message || "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchStockists = useCallback(async () => {
    setLoadingStockists(true);
    setErrorMessage(null);
    try {
      console.log(`[Signup] Fetching stockists from API...`);
      // We use a high limit to ensure we get a good initial list of stockists
      const json = await fetchJson("/stockist?limit=500");
      const list = json.data || [];
      console.log(`[Signup] Received ${list.length} stockists.`);
      if (list.length > 0) {
        console.log(
          "[Signup] First stockist sample:",
          JSON.stringify(list[0]).slice(0, 100),
        );
      }
      setStockists(list);
    } catch (e) {
      console.warn("Failed to load stockists:", e.message);
      setErrorMessage(`Network Error: ${e.message}. Please click retry below.`);
    } finally {
      setLoadingStockists(false);
    }
  }, []);

  useEffect(() => {
    fetchStockists();
  }, [fetchStockists]);

  const toggleStockist = (id) => {
    setSelectedStockists((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setErrors((prev) => ({ ...prev, stockists: "" }));
  };

  const filteredStockists = stockists.filter((s) => {
    const q = stockistQuery.trim().toLowerCase();
    if (!q) return true;

    // Expanded search fields to be more robust
    const fields = [
      s.contactPerson,
      s.name,
      s.ownerName,
      s.firmName,
      s.email,
      s.phone,
      s.contactNo,
      s._id,
      s.id,
    ].map((v) => String(v || "").toLowerCase());

    return fields.some((field) => field.includes(q));
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/final-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Feather name="user" size={24} color="#4b5563" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Purchaser Registration</Text>
              <Text style={styles.headerSubtitle}>
                Complete your profile to get started
              </Text>
            </View>
          </View>
          <View style={styles.card}>
            {errorMessage ? (
              <View style={styles.errorCard}>
                <View style={styles.errorHeader}>
                  <Feather name="alert-circle" size={20} color="#ef4444" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
                {errorMessage.toLowerCase().includes("already registered") ? (
                  <TouchableOpacity
                    style={styles.errorActionBtn}
                    onPress={() => router.push("/Purchaser/purchaser-login")}
                  >
                    <Text style={styles.errorActionText}>
                      Login to existing account
                    </Text>
                    <Feather name="arrow-right" size={14} color="#0891b2" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.fullName ? styles.inputError : null,
                ]}
                value={formData.fullName}
                onChangeText={(v) => handleInputChange("fullName", v)}
                placeholder="Enter your full name"
              />
              {errors.fullName ? (
                <Text style={styles.fieldError}>{errors.fullName}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ADDRESS</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  errors.address ? styles.inputError : null,
                ]}
                value={formData.address}
                onChangeText={(v) => handleInputChange("address", v)}
                placeholder="Enter your complete address"
                multiline
                numberOfLines={3}
              />
              {errors.address ? (
                <Text style={styles.fieldError}>{errors.address}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CONTACT NUMBER</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.contactNo ? styles.inputError : null,
                ]}
                value={formData.contactNo}
                onChangeText={(v) => handleInputChange("contactNo", v)}
                keyboardType="phone-pad"
                maxLength={10}
                placeholder="10-digit mobile number"
              />
              {errors.contactNo ? (
                <Text style={styles.fieldError}>{errors.contactNo}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                value={formData.email}
                onChangeText={(v) => handleInputChange("email", v)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Enter your mail"
              />
              {errors.email ? (
                <Text style={styles.fieldError}>{errors.email}</Text>
              ) : null}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>PASSWORD</Text>
                <View
                  style={[
                    styles.passwordWrapper,
                    errors.password ? styles.inputError : null,
                  ]}
                >
                  <TextInput
                    style={styles.passwordInput}
                    value={formData.password}
                    onChangeText={(v) => handleInputChange("password", v)}
                    secureTextEntry={!showPassword}
                    placeholder="••••••"
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtnAbsolute}
                  >
                    <Feather
                      name={showPassword ? "eye" : "eye-off"}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
                {errors.password ? (
                  <Text style={styles.fieldError}>{errors.password}</Text>
                ) : null}
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>CONFIRM</Text>
                <View
                  style={[
                    styles.passwordWrapper,
                    errors.confirmPassword ? styles.inputError : null,
                  ]}
                >
                  <TextInput
                    style={styles.passwordInput}
                    value={formData.confirmPassword}
                    onChangeText={(v) =>
                      handleInputChange("confirmPassword", v)
                    }
                    secureTextEntry={!showConfirmPassword}
                    placeholder="••••••"
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeBtnAbsolute}
                  >
                    <Feather
                      name={showConfirmPassword ? "eye" : "eye-off"}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword ? (
                  <Text style={styles.fieldError}>
                    {errors.confirmPassword}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>AADHAR CARD</Text>
                <TouchableOpacity
                  style={[
                    styles.imageUpload,
                    errors.aadharImage ? styles.imageError : null,
                  ]}
                  onPress={() => pickImage("aadharImage")}
                >
                  {previews.aadharImage ? (
                    <Image
                      source={{ uri: previews.aadharImage }}
                      style={styles.previewImage}
                    />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <LinearGradient
                        colors={["#22d3ee", "#06b6d4"]}
                        style={styles.uploadIconCircle}
                      >
                        <Feather name="image" size={20} color="#fff" />
                      </LinearGradient>
                      <Text style={styles.uploadText}>Upload Aadhar</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>YOUR PHOTO</Text>
                <TouchableOpacity
                  style={[
                    styles.imageUpload,
                    errors.photo ? styles.imageError : null,
                  ]}
                  onPress={() => pickImage("photo")}
                >
                  {previews.photo ? (
                    <Image
                      source={{ uri: previews.photo }}
                      style={styles.previewImage}
                    />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <LinearGradient
                        colors={["#fb923c", "#ef4444"]}
                        style={styles.uploadIconCircle}
                      >
                        <Feather name="camera" size={20} color="#fff" />
                      </LinearGradient>
                      <Text style={styles.uploadText}>Upload Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>SELECT STOCKISTS (MIN. 3)</Text>
              {selectedStockists.length > 0 ? (
                <View style={styles.tokensRow}>
                  {selectedStockists.map((id) => {
                    const s = stockists.find((x) => x._id === id) || {};
                    return (
                      <View key={id} style={styles.token}>
                        <Text style={styles.tokenText}>
                          {s.contactPerson || s.name || id}
                        </Text>
                        <TouchableOpacity onPress={() => toggleStockist(id)}>
                          <Feather name="x" size={14} color="#0891b2" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : null}
              <View
                style={[
                  styles.searchBox,
                  stockistDropdownOpen && styles.searchBoxActive,
                ]}
              >
                <Feather
                  name="search"
                  size={18}
                  color="#9ca3af"
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  value={stockistQuery}
                  onChangeText={(v) => {
                    setStockistQuery(v);
                    setStockistDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setStockistDropdownOpen(true);
                    if (stockists.length === 0) fetchStockists();
                  }}
                  placeholder="Search by name, email or phone"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              {stockistDropdownOpen ? (
                <View style={styles.dropdown}>
                  {loadingStockists ? (
                    <View style={styles.loaderBox}>
                      <ActivityIndicator color="#06b6d4" />
                      <Text style={styles.loaderText}>
                        Finding Stockists...
                      </Text>
                    </View>
                  ) : filteredStockists.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.dropdownSub}>
                        No stockists found matching your search
                      </Text>
                      {stockists.length === 0 && (
                        <TouchableOpacity
                          style={styles.retryBtn}
                          onPress={fetchStockists}
                        >
                          <Text style={styles.retryText}>Retry Loading</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                      {filteredStockists.map((s) => {
                        const isSelected = selectedStockists.includes(s._id);
                        const name =
                          s.firmName ||
                          s.contactPerson ||
                          s.name ||
                          "Unnamed Stockist";
                        const sub = s.email || s.contactNo || s.phone || "";

                        return (
                          <TouchableOpacity
                            key={s._id}
                            style={[
                              styles.dropdownItem,
                              isSelected ? styles.dropdownItemActive : null,
                            ]}
                            onPress={() => {
                              if (!isSelected) toggleStockist(s._id);
                              setStockistQuery("");
                              setStockistDropdownOpen(false);
                            }}
                          >
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text
                                style={styles.dropdownTitle}
                                numberOfLines={1}
                              >
                                {name}
                              </Text>
                              {sub ? (
                                <Text
                                  style={styles.dropdownSub}
                                  numberOfLines={1}
                                >
                                  {sub}
                                </Text>
                              ) : null}
                            </View>
                            {isSelected ? (
                              <Feather
                                name="check-circle"
                                size={18}
                                color="#06b6d4"
                              />
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                  <TouchableOpacity
                    style={styles.closeDropdown}
                    onPress={() => setStockistDropdownOpen(false)}
                  >
                    <Text style={styles.closeDropdownText}>Hide List</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {errors.stockists ? (
                <Text style={styles.fieldError}>{errors.stockists}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                isSubmitting ? styles.submitBtnDisabled : null,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={
                  isSubmitting ? ["#d1d5db", "#9ca3af"] : ["#22d3ee", "#06b6d4"]
                }
                style={styles.submitGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Complete Registration</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity
                onPress={() => router.push("/Purchaser/purchaser-login")}
              >
                <Text style={styles.signInLink}>Sign In Here</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f9fafb" },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  logoContainer: { alignItems: "center", marginBottom: 24, marginTop: 20 },
  logo: { height: 60, width: 180 },
  header: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    backgroundColor: "#f3f4f6",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1f2937" },
  headerSubtitle: { fontSize: 13, color: "#6b7280" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#6b7280",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1f2937",
  },
  inputError: { borderColor: "#fecaca", backgroundColor: "#fff" },
  textArea: { height: 80, textAlignVertical: "top" },
  fieldError: { color: "#ef4444", fontSize: 11, marginTop: 4, marginLeft: 4 },
  row: { flexDirection: "row" },
  imageUpload: {
    aspectRatio: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  imageError: { borderWidth: 1, borderColor: "#fecaca" },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  uploadIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    textAlign: "center",
  },
  previewImage: { width: "100%", height: "100%" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  searchBoxActive: {
    borderColor: "#06b6d4",
    backgroundColor: "#fff",
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 48, fontSize: 14 },
  tokensRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  token: {
    margin: 4,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfeff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cffafe",
  },
  tokenText: {
    fontSize: 12,
    color: "#0891b2",
    fontWeight: "500",
    marginRight: 4,
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowOffset: { width: 0, height: 4 },
    elevation: 20,
    zIndex: 9999,
  },
  loaderBox: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    marginTop: 8,
    fontSize: 12,
    color: "#06b6d4",
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  retryBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#ecfeff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cffafe",
  },
  retryText: {
    fontSize: 12,
    color: "#0891b2",
    fontWeight: "bold",
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownItemActive: { backgroundColor: "#f0fdfa" },
  dropdownTitle: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  dropdownSub: { fontSize: 11, color: "#9ca3af" },
  loader: { padding: 20 },
  closeDropdown: {
    padding: 10,
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  closeDropdownText: { fontSize: 12, fontWeight: "bold", color: "#6b7280" },
  submitBtn: { marginTop: 10, borderRadius: 16, overflow: "hidden" },
  submitGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  submitBtnDisabled: { opacity: 0.6 },
  footer: { marginTop: 24, alignItems: "center" },
  footerText: { fontSize: 14, color: "#6b7280", marginBottom: 4 },
  signInLink: { fontSize: 14, color: "#0891b2", fontWeight: "600" },
  errorCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    marginLeft: 10,
    color: "#991b1b",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  errorActionBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  errorActionText: {
    color: "#0891b2",
    fontSize: 13,
    fontWeight: "bold",
    marginRight: 6,
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 44,
    fontSize: 15,
    color: "#1f2937",
    borderRadius: 16,
  },
  eyeBtnAbsolute: {
    position: "absolute",
    right: 12,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
});
