import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { secureStorage } from "../../utils/secureStore";
import { Feather } from "@expo/vector-icons";

import Nav from "./Nav.jsx";
import Screen from "./Screen.jsx";
import SecureScreen from "../../components/SecureScreen";
import AdToast from "../../components/AdToast";
import AnnouncementPanel from "../../components/AnnouncementPanel";

export default function Dashboard() {
  const router = useRouter();
  const [isAdminEmail, setIsAdminEmail] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [showAnnouncements, setShowAnnouncements] = useState(false);

  // Provide a navigation-like object for backwards compatibility 
  // with child components anticipating native navigation properties.
  const navigation = {
    navigate: (path) => {
      if (typeof path === "string") {
        router.push(path);
      } else if (path && path.name) {
        router.push(path.name);
      }
    },
    goBack: () => {
      if (router.canGoBack()) {
        router.back();
      }
    },
  };

  useEffect(() => {
    (async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        const tokenStr = await secureStorage.getItem("token");
        if (!userStr || !tokenStr) {
          router.replace("/");
          return;
        }
        
        const user = JSON.parse(userStr);
        const email = (user && (user.email || "")).toString().toLowerCase();
        
        if (email === "danishkhaannn34@gmail.com") {
          setIsAdminEmail(true);
        }
        setIsAuthChecking(false);
      } catch (e) {
        router.replace("/");
      }
    })();
  }, []);

  if (isAuthChecking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SecureScreen>
    <SafeAreaView style={styles.container}>
      {/* Fallback Nav */}
      <Nav navigation={navigation} />
      
      {isAdminEmail && (
        <View style={styles.adminBox}>
          <TouchableOpacity
            onPress={() => navigation.navigate("/Admin")}
            style={styles.adminButton}
            activeOpacity={0.8}
          >
            <Text style={styles.adminButtonText}>Add Admin</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Screen */}
      <Screen navigation={navigation} />

      {/* Floating bell icon for announcements */}
      <TouchableOpacity
        style={styles.bellBtn}
        onPress={() => setShowAnnouncements(true)}
      >
        <Feather name="bell" size={20} color="#6366f1" />
      </TouchableOpacity>

      {/* Ad toast — absolute overlay */}
      <AdToast />

      {/* Announcement panel */}
      <AnnouncementPanel
        isVisible={showAnnouncements}
        onClose={() => setShowAnnouncements(false)}
      />
    </SafeAreaView>
    </SecureScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  bellBtn: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#ede9fe",
    zIndex: 50,
  },
  adminBox: {
    padding: 24,
  },
  adminButton: {
    backgroundColor: "#10b981", 
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  adminButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
