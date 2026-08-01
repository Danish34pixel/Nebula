import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchJson, postJson } from "../../config/api";
import SecureScreen from "../../components/SecureScreen";

const normalizeChatRole = (role) => {
  if (role === "medicalOwner" || role === "user") return "medical_owner";
  return role || "medical_owner";
};

export default function DemandChat() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState(null); // 'medical_owner' | 'stockist'
  const [myId, setMyId] = useState(null);

  const flatRef = useRef(null);
  const appActiveRef = useRef(true);
  const prevLengthRef = useRef(0);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetchJson(`/demand/${id}/messages?markRead=1`);
      if (res.success) {
        // Always replace the list so receipt fields like deliveredAt/readBy
        // can refresh even when the message count stays the same.
        setMessages(res.data || []);
      }
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let timerId;
      appActiveRef.current = true;

      AsyncStorage.getItem("user").then((raw) => {
        if (cancelled) return;
        try {
          const user = raw ? JSON.parse(raw) : null;
          setMyRole(normalizeChatRole(user?.role));
          setMyId(String(user?._id || user?.id || ""));
        } catch {
          setMyRole("medical_owner");
          setMyId(null);
        }
      });

      const tick = async () => {
        if (cancelled) return;
        if (appActiveRef.current) await loadMessages();
        if (!cancelled) timerId = setTimeout(tick, 5000);
      };

      const appStateSub = AppState.addEventListener("change", (state) => {
        appActiveRef.current = state === "active";
      });

      tick();

      return () => {
        cancelled = true;
        clearTimeout(timerId);
        appStateSub.remove();
      };
    }, [loadMessages])
  );

  // Scroll to bottom when new messages arrive (render-phase, no effect needed)
  if (messages.length !== prevLengthRef.current) {
    prevLengthRef.current = messages.length;
    if (messages.length > 0 && flatRef.current) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 0);
    }
  }

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await postJson(`/demand/${id}/messages`, { text: trimmed });
      setText("");
      await loadMessages();
    } catch (e) {
      // silent — message stays in input so user can retry
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    if (item.senderRole === "system") {
      return (
        <View style={styles.systemRow}>
          <Text style={styles.systemText}>{item.text}</Text>
        </View>
      );
    }

    const isMine =
      item.senderRole === myRole || (myId && String(item.senderId) === myId);
    const isRead = isMine && Array.isArray(item.readBy) && item.readBy.length > 0;
    const isDelivered = isMine && Boolean(item.deliveredAt);
    return (
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
        ]}
      >
        {!isMine && (
          <Text style={styles.senderName}>{item.senderName || "Other"}</Text>
        )}
        <Text style={isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>
          {item.text}
        </Text>
        <View style={styles.metaRow}>
          <Text style={isMine ? styles.timeTextMine : styles.timeTextTheirs}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          {isMine && (
            <View style={styles.tickWrap}>
              {isRead ? (
                <MaterialCommunityIcons
                  name="check-all"
                  size={14}
                  color="#3b82f6"
                />
              ) : isDelivered ? (
                <MaterialCommunityIcons
                  name="check-all"
                  size={14}
                  color="#94a3b8"
                />
              ) : (
                <Feather name="check" size={12} color="#94a3b8" />
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SecureScreen>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Demand Chat</Text>
          <View style={{ width: 44 }} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <View style={styles.chatBody}>
            {loading ? (
              <ActivityIndicator color="#0ea5e9" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                ref={flatRef}
                data={messages}
                keyExtractor={(item) => item._id || String(Math.random())}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesList}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ListEmptyComponent={
                  <View style={styles.emptyChat}>
                    <Feather name="message-circle" size={36} color="#cbd5e1" />
                    <Text style={styles.emptyChatText}>
                      No messages yet. Say hi!
                    </Text>
                  </View>
                }
                onContentSizeChange={() =>
                  flatRef.current?.scrollToEnd({ animated: false })
                }
              />
            )}
          </View>

          {/* Input bar */}
          <View style={styles.inputBar}>
            <View style={styles.inputShell}>
              <TextInput
                style={styles.textInput}
                value={text}
                onChangeText={setText}
                placeholder="Type a message..."
                placeholderTextColor="#94a3b8"
                multiline
                returnKeyType="default"
              />
            </View>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!text.trim() || sending) && { opacity: 0.5 },
              ]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Feather name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SecureScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  flex: { flex: 1 },
  chatBody: { flex: 1 },

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
  headerTitle: { fontSize: 17, fontWeight: "bold", color: "#0f172a" },

  messagesList: { padding: 16, paddingBottom: 8 },

  // System messages (e.g. "Order accepted") render centered/gray, distinct
  // from user chat bubbles.
  systemRow: { alignItems: "center", marginVertical: 10 },
  systemText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },

  bubble: {
    maxWidth: "75%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "#dbeafe",
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  senderName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 4,
  },
  bubbleTextMine: { color: "#0f172a", fontSize: 15, lineHeight: 20 },
  bubbleTextTheirs: { color: "#1e293b", fontSize: 15, lineHeight: 20 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  timeTextMine: {
    color: "#64748b",
    fontSize: 10,
  },
  timeTextTheirs: {
    color: "#94a3b8",
    fontSize: 10,
  },
  tickWrap: { marginLeft: 2 },

  emptyChat: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyChatText: { color: "#94a3b8", fontSize: 14 },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 18 : 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 10,
  },
  inputShell: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0ea5e9",
    justifyContent: "center",
    alignItems: "center",
  },
});
