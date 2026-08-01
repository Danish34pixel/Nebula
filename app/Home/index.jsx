import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Component, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { secureStorage } from "../../utils/secureStore";

import AnnouncementPanel from "../../components/AnnouncementPanel";
import PaymentRequiredGate from "../../components/PaymentRequiredGate";
import SecureScreen from "../../components/SecureScreen";
import TrialBanner from "../../components/TrialBanner";
import {
  daysRemaining,
  fetchSubscriptionStatus,
} from "../../utils/subscriptionStatus";
import Nav from "./Nav.jsx";
import Screen from "./Screen.jsx";

export default function Dashboard() {
  const router = useRouter();
  const [isAdminEmail, setIsAdminEmail] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState(null);

  // Provide a navigation-like object for backwards compatibility
  // with child components anticipating native navigation properties.
  const navigation = {
    navigate: (path) => {
      if (__DEV__) console.log("[Home/index] navigation.navigate", path);
      if (typeof path === "string") {
        router.push(path);
      } else if (path && path.name) {
        router.push(path.name);
      }
    },
    goBack: () => {
      if (__DEV__) console.log("[Home/index] navigation.goBack");
      if (router.canGoBack()) {
        router.back();
      }
    },
  };

  useEffect(() => {
    if (__DEV__) console.log("[Home/index] auth check useEffect start");
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

        try {
          const { paymentStatus: status, subscriptionEndDate } =
            await fetchSubscriptionStatus();
          setPaymentStatus(status || null);
          setTrialDaysLeft(daysRemaining(subscriptionEndDate));
        } catch (e) {
          // Silent — network hiccup, don't block the dashboard on this
        }
      } catch (e) {
        router.replace("/");
      }
    })();
  }, []);

  if (isAuthChecking) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (paymentStatus === "payment_due") {
    return (
      <HomeErrorBoundary>
        <PaymentRequiredGate />
      </HomeErrorBoundary>
    );
  }

  return (
    <HomeErrorBoundary>
      <SecureScreen>
        <SafeAreaView style={styles.container}>
          {paymentStatus === "trial" && (
            <TrialBanner daysLeft={trialDaysLeft} />
          )}

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

          {/* Announcement panel */}
          <AnnouncementPanel
            isVisible={showAnnouncements}
            onClose={() => setShowAnnouncements(false)}
          />
        </SafeAreaView>
      </SecureScreen>
    </HomeErrorBoundary>
  );
}

class HomeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[Home/index] ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.errorWrapper}>
            <Text style={styles.errorTitle}>An unexpected error occurred.</Text>
            <Text style={styles.errorMessage}>
              Please close the app and try again.
            </Text>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
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
  errorWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    color: "#475569",
    textAlign: "center",
    lineHeight: 22,
  },
});
