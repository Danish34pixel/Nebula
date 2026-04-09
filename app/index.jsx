import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

// Asset mapping - using ../assets because index.jsx is in the /app folder
const ASSETS = {
  finalLogo: require("../assets/images/final-logo.png"),
  logoSmall: require("../assets/images/logo.png"),
  stockist: require("../assets/images/stockist-logo.jpg"),
  purchaser: require("../assets/images/purchaser-logo.jpg"),
  medicalOwner: require("../assets/images/medical-owner.jpg"),
};

const Logo = ({ style }) => (
  <View style={[styles.logoContainer, style]}>
    <Image source={ASSETS.finalLogo} style={styles.logoMain} resizeMode="contain" />
    <Image source={ASSETS.logoSmall} style={styles.logoSecondary} resizeMode="contain" />
  </View>
);

export default function Page() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(null);
  
  // Animation for floating background particles
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const roles = [
    {
      id: "Stockist",
      name: "Stockist",
      icon: ASSETS.stockist,
      gradient: ["#34d399", "#14b8a6"], // emerald-400 to teal-500
      description: "Manage inventory",
    },
    {
      id: "Purchaser",
      name: "Purchaser",
      icon: ASSETS.purchaser,
      gradient: ["#60a5fa", "#6366f1"], // blue-400 to indigo-500
      description: "Handle procurement",
    },
    {
      id: "Medical Owner",
      name: "Medical Owner",
      icon: ASSETS.medicalOwner,
      gradient: ["#fb923c", "#ef4444"], // orange-400 to red-500
      description: "Clinic management",
    },
  ];

  const handleRoleSelect = async (roleId) => {
    try {
      await AsyncStorage.setItem("selectedRole", roleId);
      if (roleId === "Purchaser") {
        router.push("/Purchaser/purchaser-login");
      } else if (roleId === "Stockist") {
        router.push("/Stockist/stockist-login");
      } else if (roleId === "Medical Owner") {
        router.push("/login");
      } else {
        router.push("/Home");
      }
    } catch (e) {
      console.error("Failed to save role", e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#f8fafc", "#eff6ff", "#e0e7ff"]}
        style={styles.container}
      >
        {/* Background Decorations */}
        <Animated.View style={[styles.bgDecoration1, { transform: [{ scale: pulseAnim }] }]}>
           <LinearGradient colors={["rgba(96, 165, 250, 0.15)", "rgba(192, 132, 252, 0.15)"]} style={styles.blurCircle} />
        </Animated.View>
        <Animated.View style={[styles.bgDecoration2, { transform: [{ scale: pulseAnim }] }]}>
           <LinearGradient colors={["rgba(52, 211, 153, 0.1)", "rgba(45, 212, 191, 0.1)"]} style={styles.blurCircle} />
        </Animated.View>

        <View style={styles.cardWrapper}>
          <View style={styles.header}>
            <Logo style={styles.logo} />
            <Text style={styles.title}>Select Your Role</Text>
          </View>

          <View style={styles.rolesGrid}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.id}
                onPress={() => handleRoleSelect(role.id)}
                activeOpacity={0.7}
                style={[
                  styles.roleCard,
                  selectedRole === role.id && styles.roleCardActive
                ]}
              >
                <LinearGradient
                  colors={role.gradient}
                  style={styles.iconContainer}
                >
                  <Image source={role.icon} style={styles.roleIcon} resizeMode="cover" />
                </LinearGradient>

                <Text style={styles.roleName}>{role.name}</Text>
                <Text style={styles.roleDescription}>{role.description}</Text>

                {selectedRole === role.id && (
                  <View style={styles.activeIndicator}>
                    <View style={styles.activeDot} />
                  </View>
                )}
                
                <View style={[
                   styles.roleProgress, 
                   { backgroundColor: selectedRole === role.id ? role.gradient[1] : 'transparent' }
                ]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  bgDecoration1: {
    position: "absolute",
    top: 50,
    left: -50,
    width: 300,
    height: 300,
  },
  bgDecoration2: {
    position: "absolute",
    bottom: 50,
    right: -50,
    width: 350,
    height: 350,
  },
  blurCircle: {
    flex: 1,
    borderRadius: 150,
  },
  cardWrapper: {
    width: "100%",
    maxWidth: 600,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 40,
    padding: 30,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 150,
    height: 80,
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoMain: {
    width: 80,
    height: 60,
  },
  logoSecondary: {
    width: 40,
    height: 40,
    marginLeft: -10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
  },
  rolesGrid: {
    gap: 16,
  },
  roleCard: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(226, 232, 240, 0.4)",
    position: "relative",
    overflow: "hidden",
  },
  roleCardActive: {
    borderColor: "#60a5fa",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    padding: 1, // small border effect
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5,
  },
  roleIcon: {
    width: "100%",
    height: "100%",
    borderRadius: 19,
  },
  roleName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },
  activeIndicator: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  roleProgress: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
});
