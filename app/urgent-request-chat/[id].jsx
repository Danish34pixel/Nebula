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
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchJson, postJson } from "../../config/api";
import SecureScreen from "../../components/SecureScreen";

export default function UrgentRequestChat() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState(null); // 'user' | 'purchaser'

  const flatRef = useRef(null);
  const appActiveRef = useRef(true);
  const prevLengthRef = useRef(0);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetchJson(`/urgent-request/${id}/messages`);
      if (res.success) {
        setMessages((prev) => {
          if (
            prev.length === res.data.length &&
            prev[prev.length - 1]?._id === res.data[res.data.length - 1]?._id
          ) {
            return prev;
          }
          return res.data || [];
        });
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

      AsyncStorage.getItem("role").then((r) => {
        if (!cancelled) setMyRole(r || "user");
      });

      const tick = async () => {
        if (cancelled) return;
        if (appActiveRef.current) await loadMessages();
        if (!cancelled) timerId = setTimeout(tick, 5000);
      };

      // AppState: update flag only — do NOT fire an extra loadMessages() call.
      // The next scheduled tick will pick up after foreground naturally.
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
      await postJson(`/urgent-request/${id}/messages`, { text: trimmed });
      setText("");
      await loadMessages();
    } catch (e) {
      // silent — message stays in input so user can retry
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMine = item.senderRole === myRole;
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
        <Text style={isMine ? styles.timeTextMine : styles.timeTextTheirs}>
          {new Date(item.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
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
          <Text style={styles.headerTitle}>Urgent Request Chat</Text>
          <View style={{ width: 44 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          {loading ? (
            <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={(item) => item._id || String(Math.random())}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              ListEmptyComponent={
                <View style={styles.emptyChat}>
                  <Feather name="message-circle" size={36} color="#cbd5e1" />
                  <Text style={styles.emptyChatText}>No messages yet. Say hi!</Text>
                </View>
              }
              onContentSizeChange={() =>
                flatRef.current?.scrollToEnd({ animated: false })
              }
            />
          )}

          {/* Input bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor="#94a3b8"
              multiline
              returnKeyType="default"
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
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

  bubble: {
    maxWidth: "75%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "#6366f1",
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
  bubbleTextMine: { color: "#fff", fontSize: 15, lineHeight: 20 },
  bubbleTextTheirs: { color: "#1e293b", fontSize: 15, lineHeight: 20 },
  timeTextMine: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeTextTheirs: {
    color: "#94a3b8",
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },

  emptyChat: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyChatText: { color: "#94a3b8", fontSize: 14 },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
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
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
  },
});
