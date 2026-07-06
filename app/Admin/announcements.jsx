import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { fetchJson } from "../../config/api";
import SecureScreen from "../../components/SecureScreen";

const ROLES = [
  { label: "Medical Owner", value: "user" },
  { label: "Purchaser", value: "purchaser" },
  { label: "Stockist", value: "stockist" },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminAnnouncements() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRoles, setTargetRoles] = useState(["user", "purchaser", "stockist"]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await fetchJson("/announcements/all");
      if (res.success) setAnnouncements(res.data || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  const toggleRole = (role) => {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async () => {
    setFormError("");
    if (!title.trim()) { setFormError("Title is required."); return; }
    if (!message.trim()) { setFormError("Message is required."); return; }
    if (targetRoles.length === 0) { setFormError("Select at least one audience."); return; }

    setSubmitting(true);
    try {
      const res = await fetchJson("/announcements", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), message: message.trim(), targetRoles }),
      });
      if (res.success) {
        setTitle("");
        setMessage("");
        setTargetRoles(["user", "purchaser", "stockist"]);
        await loadAnnouncements();
      }
    } catch (err) {
      setFormError(err?.message || "Failed to create announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (a) => {
    setFormError("");
    try {
      await fetchJson(`/announcements/${a._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !a.isActive }),
      });
      await loadAnnouncements();
    } catch (err) {
      setFormError(err?.message || "Failed to update announcement.");
    }
  };

  const handleDelete = (a) => {
    setFormError("");
    setConfirmDeleteId(a._id);
  };

  const confirmDelete = async (a) => {
    setDeleting(true);
    setFormError("");
    try {
      setAnnouncements((prev) => prev.filter((x) => x._id !== a._id));
      await fetchJson(`/announcements/${a._id}`, { method: "DELETE" });
      await loadAnnouncements();
    } catch (err) {
      setFormError(err?.message || "Failed to delete announcement.");
      await loadAnnouncements();
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  return (
    <SecureScreen>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Announcements</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Create Form */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>New Announcement</Text>

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Announcement title..."
              placeholderTextColor="#94a3b8"
              maxLength={200}
            />

            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Write your announcement..."
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={1000}
            />

            <Text style={styles.label}>Send to</Text>
            <View style={styles.rolesRow}>
              {ROLES.map((r) => {
                const selected = targetRoles.includes(r.value);
                return (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.roleChip, selected && styles.roleChipSelected]}
                    onPress={() => toggleRole(r.value)}
                  >
                    <Text style={[styles.roleChipText, selected && styles.roleChipTextSelected]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.roleChip, targetRoles.length === 3 && styles.roleChipSelected]}
                onPress={() =>
                  setTargetRoles(
                    targetRoles.length === 3 ? [] : ["user", "purchaser", "stockist"]
                  )
                }
              >
                <Text
                  style={[
                    styles.roleChipText,
                    targetRoles.length === 3 && styles.roleChipTextSelected,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
            </View>

            {!!formError && <Text style={styles.errorText}>{formError}</Text>}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={styles.submitBtnText}>Send Announcement</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* List */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Past Announcements</Text>
            {loading ? (
              <ActivityIndicator color="#6366f1" style={{ marginTop: 20 }} />
            ) : announcements.length === 0 ? (
              <Text style={styles.emptyText}>No announcements yet.</Text>
            ) : (
              announcements.map((a) => (
                <View key={a._id} style={styles.annoRow}>
                  <View style={styles.annoIcon}>
                    <Feather name="megaphone" size={16} color="#6366f1" />
                  </View>
                  <View style={styles.annoBody}>
                    <Text style={styles.annoTitle}>{a.title}</Text>
                    <Text style={styles.annoMsg} numberOfLines={2}>{a.message}</Text>
                    <Text style={styles.annoMeta}>
                      {(a.targetRoles || [])
                        .map((r) => ROLES.find((x) => x.value === r)?.label || r)
                        .join(", ")}{" "}
                      · {timeAgo(a.createdAt)} · {a.readBy?.length || 0} reads
                    </Text>
                    {confirmDeleteId === a._id && (
                      <View style={styles.deleteConfirm}>
                        <Text style={styles.deleteConfirmText}>Delete this announcement?</Text>
                        <View style={styles.deleteConfirmBtns}>
                          <TouchableOpacity
                            onPress={() => setConfirmDeleteId(null)}
                            style={styles.deleteConfirmCancel}
                            disabled={deleting}
                          >
                            <Text style={styles.deleteConfirmCancelText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => confirmDelete(a)}
                            style={styles.deleteConfirmOk}
                            disabled={deleting}
                          >
                            <Text style={styles.deleteConfirmOkText}>
                              {deleting ? "Deleting…" : "Delete"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                  <View style={styles.annoActions}>
                    <TouchableOpacity
                      onPress={() => handleToggleActive(a)}
                      style={styles.actionBtn}
                      disabled={confirmDeleteId === a._id}
                    >
                      <Feather
                        name={a.isActive ? "eye-off" : "eye"}
                        size={18}
                        color={a.isActive ? "#64748b" : "#10b981"}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(a)}
                      style={styles.actionBtn}
                    >
                      <Feather name="trash-2" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
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
  textarea: { height: 100, textAlignVertical: "top" },
  rolesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  roleChipSelected: { backgroundColor: "#ede9fe", borderColor: "#6366f1" },
  roleChipText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  roleChipTextSelected: { color: "#6366f1" },
  errorText: { color: "#ef4444", fontSize: 13, marginTop: 10 },
  submitBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  emptyText: { color: "#94a3b8", fontSize: 14, textAlign: "center", paddingVertical: 16 },
  annoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 10,
  },
  annoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#ede9fe",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  annoBody: { flex: 1 },
  annoTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  annoMsg: { fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 17 },
  annoMeta: { fontSize: 11, color: "#94a3b8", marginTop: 4 },
  annoActions: { flexDirection: "row", gap: 4 },
  actionBtn: { padding: 6 },
  deleteConfirm: {
    marginTop: 8,
    backgroundColor: "#fff5f5",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  deleteConfirmText: { fontSize: 12, color: "#dc2626", marginBottom: 8 },
  deleteConfirmBtns: { flexDirection: "row", gap: 8 },
  deleteConfirmCancel: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  deleteConfirmCancelText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  deleteConfirmOk: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#ef4444",
    alignItems: "center",
  },
  deleteConfirmOkText: { fontSize: 12, fontWeight: "600", color: "#fff" },
});
