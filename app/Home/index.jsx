import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { secureStorage } from "../../utils/secureStore";

// Import your child components.
// Note: We renamed the huge Screen file you provided earlier to "Screen.jsx".
import Nav from "./Nav.jsx";
import Screen from "./Screen.jsx";

export default function Dashboard() {
  const router = useRouter();
  const [isAdminEmail, setIsAdminEmail] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
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
