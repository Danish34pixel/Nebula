import React, { useEffect, useState, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchJson } from "../../config/api";

const { width } = Dimensions.get("window");

const RequestModal = memo(({ request, onClose, onApprove, processing }) => {
  if (!request) return null;

  return (
    <Modal animationType="fade" transparent visible={!!request} onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeader}>
            {request.photo ? (
              <Image source={{ uri: request.photo }} style={styles.largeAvatar} />
            ) : (
              <View style={styles.largeAvatarPlaceholder}>
                <Text style={styles.largeAvatarText}>{(request.name || "?").slice(0, 2).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.headerInfo}>
              <Text style={styles.modalName}>{request.name || "Unknown"}</Text>
              <Text style={styles.modalId}>ID: {request._id}</Text>
            </View>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.detailRow}>
              <Feather name="tag" size={16} color="#64748b" />
              <Text style={styles.detailText}>Type: {request.kind === "staff" ? "Staff Approval" : "Purchase Card"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Feather name="calendar" size={16} color="#64748b" />
              <Text style={styles.detailText}>Requested: {new Date(request.createdAt).toLocaleString()}</Text>
            </View>
            {request.workForName ? (
              <View style={styles.detailRow}>
                <Feather name="briefcase" size={16} color="#64748b" />
                <Text style={styles.detailText}>
                  Works at: {request.workForType === "medical" ? "Medical" : "Stockist"} - {request.workForName}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.approveBtn, processing && styles.btnDisabled]}
              onPress={() => onApprove(request)}
              disabled={processing}
            >
              {processing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.approveBtnText}>Approve</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

export default function StockistApprovals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [purchasingRes, staffRes] = await Promise.all([
        fetchJson("/api/purchasing-card/requests").catch(() => ({ data: [] })),
        fetchJson("/api/staff/approvals/pending").catch(() => ({ data: [] })),
      ]);

      let currentStockistId = null;
      const stored = await AsyncStorage.getItem("user");
      if (stored) {
        const user = JSON.parse(stored);
        currentStockistId = user?._id || user?.id;
      }

      let purchaseRequests = purchasingRes?.data || [];
      if (currentStockistId) {
        purchaseRequests = purchaseRequests.filter((req) => {
          if (!Array.isArray(req.approvals) || req.approvals.length === 0) return true;
          return !req.approvals.some((a) => String(a.stockist) === String(currentStockistId));
        });
      }

      const normalizedPurchasing = purchaseRequests.map((r) => ({
        _id: r._id,
        createdAt: r.createdAt,
        name: r.requesterDisplay?.name || r.requester?.medicalName || "Unknown",
        photo: r.requesterDisplay?.photo || null,
        kind: "purchasing",
      }));

      const normalizedStaff = (staffRes?.data || []).map((s) => ({
        _id: s._id,
        createdAt: s.createdAt,
        name: s.fullName || "Unknown Staff",
        photo: s.image || null,
        kind: "staff",
        workForName: s.workForName,
        workForType: s.workForType,
      }));

      const merged = [...normalizedStaff, ...normalizedPurchasing].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRequests(merged);
    } catch (err) {
      setError(err.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const approve = async (request) => {
    const id = request?._id;
    if (!id) return;

    try {
      setProcessing((p) => ({ ...p, [id]: true }));

      if (request.kind === "staff") {
        await fetchJson(`/api/staff/${id}/approve`, { method: "PATCH" });
      } else {
        await fetchJson(`/api/purchasing-card/approve/${id}`, { method: "POST", body: JSON.stringify({}) });
      }

      setRequests((rs) => rs.filter((r) => String(r._id) !== String(id)));
      setSelectedRequest(null);
      Alert.alert("Approved", request.kind === "staff" ? "Staff request approved." : "Purchasing card request approved.");
    } catch (err) {
      Alert.alert("Error", err.message || "Approval failed");
    } finally {
      setProcessing((p) => ({ ...p, [id]: false }));
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} color="#06b6d4" />;
  if (error) return <Text style={styles.errorText}>{error}</Text>;
  if (!requests || requests.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Feather name="inbox" size={48} color="#cbd5e1" />
        <Text style={styles.emptyText}>No pending requests</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {requests.map((r) => (
        <TouchableOpacity key={`${r.kind}-${r._id}`} onPress={() => setSelectedRequest(r)} style={styles.requestCard}>
          <View style={styles.cardMain}>
            {r.photo ? (
              <Image source={{ uri: r.photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{(r.name || "?").slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.requesterName}>{r.name}</Text>
              <Text style={styles.dateText}>{new Date(r.createdAt).toLocaleDateString()}</Text>
              <Text style={styles.kindText}>{r.kind === "staff" ? "Staff Approval" : "Purchase Card Approval"}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.smallApproveBtn, processing[r._id] && styles.btnDisabled]}
            onPress={() => approve(r)}
            disabled={processing[r._id]}
          >
            {processing[r._id] ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="check" size={18} color="#fff" />}
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      <RequestModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onApprove={approve}
        processing={selectedRequest ? processing[selectedRequest._id] : false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 20 },
  center: { marginTop: 40 },
  errorText: { color: "#ef4444", textAlign: "center", marginTop: 20, fontWeight: "600" },
  emptyState: { alignItems: "center", padding: 60, opacity: 0.5 },
  emptyText: { marginTop: 12, fontSize: 16, color: "#64748b", fontWeight: "600" },
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardMain: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#f1f5f9", justifyContent: "center", alignItems: "center" },
  avatarText: { fontWeight: "700", color: "#64748b" },
  cardInfo: { marginLeft: 12, flex: 1 },
  requesterName: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  dateText: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  kindText: { fontSize: 11, color: "#0f766e", marginTop: 3, fontWeight: "700" },
  smallApproveBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#10b981", justifyContent: "center", alignItems: "center" },
  btnDisabled: { opacity: 0.7 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContainer: { width: width * 0.85, backgroundColor: "#fff", borderRadius: 28, padding: 24, elevation: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  largeAvatar: { width: 64, height: 64, borderRadius: 32 },
  largeAvatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  largeAvatarText: { fontSize: 24, fontWeight: "800", color: "#10b981" },
  headerInfo: { marginLeft: 16, flex: 1 },
  modalName: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  modalId: { fontSize: 10, color: "#94a3b8", marginTop: 4, letterSpacing: 0.5 },
  modalBody: { gap: 12, marginBottom: 28 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  detailText: { fontSize: 14, color: "#475569", fontWeight: "500" },
  modalFooter: { flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#f1f5f9", alignItems: "center" },
  cancelBtnText: { fontWeight: "700", color: "#64748b" },
  approveBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: "#10b981", alignItems: "center" },
  approveBtnText: { fontWeight: "700", color: "#fff" },
});
