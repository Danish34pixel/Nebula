import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { fetchJson, postForm, API_BASE } from "../../config/api";
import SecureScreen from "../../components/SecureScreen";

function mediaFullUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

export default function AdminAds() {
  const router = useRouter();

  const [ads, setAds] = useState([]);
  const [stockists, setStockists] = useState([]);
  const [loadingAds, setLoadingAds] = useState(true);

  // form state
  const [title, setTitle] = useState("");
  const [selectedStockist, setSelectedStockist] = useState(null);
  const [media, setMedia] = useState(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");

  // stockist picker modal
  const [pickerVisible, setPickerVisible] = useState(false);
  const [stockistSearch, setStockistSearch] = useState("");

  const loadAds = useCallback(async () => {
    try {
      const res = await fetchJson("/ads");
      if (res.success) setAds(res.data || []);
    } catch (_) {}
    finally { setLoadingAds(false); }
  }, []);

  useEffect(() => {
    loadAds();
    fetchJson("/stockist")
      .then((res) => {
        const list = res?.data ?? (Array.isArray(res) ? res : []);
        setStockists(list);
      })
      .catch(() => {});
  }, [loadAds]);

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow media library access to upload ads.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions
        ? ImagePicker.MediaTypeOptions.All
        : ["images", "videos"],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setMedia(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    setFormError("");
    if (!title.trim()) { setFormError("Title is required."); return; }
    if (!selectedStockist) { setFormError("Select a stockist."); return; }
    if (!media) { setFormError("Select a media file (image or video)."); return; }

    setUploading(true);
    try {
      const rawUri = media.uri || "";
      const extFromUri = rawUri.split("?")[0].split(".").pop().toLowerCase();
      const extFromName = (media.fileName || "").split(".").pop().toLowerCase();
      const ext = extFromName || extFromUri || "jpg";
      const mimeMap = {
        jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
        webp: "image/webp", mp4: "video/mp4", mov: "video/quicktime",
      };
      const mimeType = media.mimeType || mimeMap[ext] || "image/jpeg";
      const fileName = media.fileName || `ad.${ext}`;

      const formData = new FormData();

      if (Platform.OS === "web") {
        // On web, fetch the URI and convert to Blob — { uri, type, name } is not a File
        const blob = await fetch(rawUri).then((r) => r.blob());
        formData.append("media", blob, fileName);
      } else {
        // On native, { uri, type, name } is the React Native FormData file shape
        formData.append("media", { uri: rawUri, type: mimeType, name: fileName });
      }

      formData.append("title", title.trim());
      formData.append("stockistId", selectedStockist._id);
      if (expiresAt.trim()) formData.append("expiresAt", expiresAt.trim());

      const res = await postForm("/ads", formData);
      if (res.success) {
        setTitle("");
        setSelectedStockist(null);
        setMedia(null);
        setExpiresAt("");
        await loadAds();
      }
    } catch (err) {
      setFormError(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (ad) => {
    try {
      await fetchJson(`/ads/${ad._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !ad.isActive }),
      });
      await loadAds();
    } catch (_) {
      Alert.alert("Error", "Failed to update ad.");
    }
  };

  const deleteAd = (ad) => {
    Alert.alert("Delete Ad", `Delete "${ad.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await fetchJson(`/ads/${ad._id}`, { method: "DELETE" });
            await loadAds();
          } catch (_) {
            Alert.alert("Error", "Failed to delete ad.");
          }
        },
      },
    ]);
  };

  const filteredStockists = stockists.filter((s) => {
    const q = stockistSearch.toLowerCase();
    return !q || (s.name || s.contactPerson || "").toLowerCase().includes(q);
  });

  return (
    <SecureScreen>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Ads</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Upload Form */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Upload New Ad</Text>

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ad title..."
              placeholderTextColor="#94a3b8"
              maxLength={200}
            />

            <Text style={styles.label}>Stockist</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setPickerVisible(true)}>
              <Text style={selectedStockist ? styles.pickerSelected : styles.pickerPlaceholder}>
                {selectedStockist ? (selectedStockist.name || selectedStockist.contactPerson) : "Select stockist..."}
              </Text>
              <Feather name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>

            <Text style={styles.label}>Media (image or video)</Text>
            <TouchableOpacity style={styles.mediaPicker} onPress={pickMedia}>
              {media ? (
                media.type === "video" || (media.mimeType || "").startsWith("video") ? (
                  <View style={styles.videoPreview}>
                    <Feather name="film" size={32} color="#6366f1" />
                    <Text style={styles.videoLabel}>{media.fileName || "video selected"}</Text>
                  </View>
                ) : (
                  <Image source={{ uri: media.uri }} style={styles.imagePreview} resizeMode="cover" />
                )
              ) : (
                <View style={styles.mediaPlaceholder}>
                  <Feather name="upload" size={28} color="#94a3b8" />
                  <Text style={styles.mediaPlaceholderText}>Tap to select image or video</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Expiry Date (optional, YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={expiresAt}
              onChangeText={setExpiresAt}
              placeholder="2025-12-31"
              placeholderTextColor="#94a3b8"
            />

            {!!formError && <Text style={styles.errorText}>{formError}</Text>}

            <TouchableOpacity
              style={[styles.submitBtn, uploading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Upload Ad</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Ads List */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>All Ads</Text>
            {loadingAds ? (
              <ActivityIndicator color="#6366f1" style={{ marginTop: 20 }} />
            ) : ads.length === 0 ? (
              <Text style={styles.emptyText}>No ads yet.</Text>
            ) : (
              ads.map((ad) => (
                <View key={ad._id} style={styles.adRow}>
                  {ad.mediaType === "image" ? (
                    <Image
                      source={{ uri: mediaFullUrl(ad.mediaUrl) }}
                      style={styles.adThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.adThumb, styles.videoThumb]}>
                      <Feather name="film" size={20} color="#6366f1" />
                    </View>
                  )}
                  <View style={styles.adInfo}>
                    <Text style={styles.adTitle} numberOfLines={1}>{ad.title}</Text>
                    <Text style={styles.adMeta}>
                      {ad.stockistName || "Stockist"} · {ad.clickCount} clicks · {ad.impressionCount} impressions
                    </Text>
                    <Text style={[styles.adStatus, ad.isActive ? styles.statusActive : styles.statusInactive]}>
                      {ad.isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>
                  <View style={styles.adActions}>
                    <TouchableOpacity onPress={() => toggleActive(ad)} style={styles.actionBtn}>
                      <Feather name={ad.isActive ? "pause-circle" : "play-circle"} size={20} color="#6366f1" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteAd(ad)} style={styles.actionBtn}>
                      <Feather name="trash-2" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Stockist Picker Modal */}
        <Modal visible={pickerVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Stockist</Text>
                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                  <Feather name="x" size={22} color="#1e293b" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.modalSearch}
                value={stockistSearch}
                onChangeText={setStockistSearch}
                placeholder="Search stockists..."
                placeholderTextColor="#94a3b8"
              />
              <FlatList
                data={filteredStockists}
                keyExtractor={(item) => item._id || String(Math.random())}
                style={{ maxHeight: 350 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.stockistItem}
                    onPress={() => {
                      setSelectedStockist(item);
                      setPickerVisible(false);
                      setStockistSearch("");
                    }}
                  >
                    <Text style={styles.stockistName}>{item.name || item.contactPerson || item._id}</Text>
                    {item.contactPerson && item.name ? (
                      <Text style={styles.stockistSub}>{item.contactPerson}</Text>
                    ) : null}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No stockists found.</Text>}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SecureScreen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1e293b", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
  },
  pickerPlaceholder: { color: "#94a3b8", fontSize: 15 },
  pickerSelected: { color: "#0f172a", fontSize: 15 },
  mediaPicker: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    overflow: "hidden",
    height: 140,
  },
  mediaPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  mediaPlaceholderText: { color: "#94a3b8", fontSize: 13 },
  imagePreview: { width: "100%", height: "100%" },
  videoPreview: { flex: 1, justifyContent: "center", alignItems: "center", gap: 6 },
  videoLabel: { color: "#6366f1", fontSize: 12 },
  errorText: { color: "#ef4444", fontSize: 13, marginTop: 10 },
  submitBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  emptyText: { color: "#94a3b8", fontSize: 14, textAlign: "center", paddingVertical: 16 },
  adRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 12,
  },
  adThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: "#f1f5f9" },
  videoThumb: { justifyContent: "center", alignItems: "center" },
  adInfo: { flex: 1 },
  adTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  adMeta: { fontSize: 11, color: "#64748b", marginTop: 3 },
  adStatus: { fontSize: 11, fontWeight: "700", marginTop: 3 },
  statusActive: { color: "#10b981" },
  statusInactive: { color: "#ef4444" },
  adActions: { flexDirection: "row", gap: 8 },
  actionBtn: { padding: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  modalSearch: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
    marginBottom: 12,
  },
  stockistItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  stockistName: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  stockistSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
});
