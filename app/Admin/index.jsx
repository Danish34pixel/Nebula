import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const AdminDashboard = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#f8fafc", "#f1f5f9", "#e2e8f0"]}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.title}>Admin Panel</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/Admin/users")}
          >
            <LinearGradient
              colors={["#3b82f6", "#2563eb"]}
              style={styles.iconBox}
            >
              <Feather name="users" size={32} color="#fff" />
            </LinearGradient>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Purchaser Management</Text>
              <Text style={styles.menuSub}>
                Approve or decline purchaser registrations
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/Admin/stockists")}
          >
            <LinearGradient
              colors={["#0d9488", "#0f766e"]}
              style={styles.iconBox}
            >
              <Feather name="package" size={32} color="#fff" />
            </LinearGradient>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Stockist Management</Text>
              <Text style={styles.menuSub}>
                Verify and approve supplier applications
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/Admin/create-company")}
          >
            <LinearGradient
              colors={["#fbbf24", "#d97706"]}
              style={styles.iconBox}
            >
              <Feather name="plus-circle" size={32} color="#fff" />
            </LinearGradient>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Create Company</Text>
              <Text style={styles.menuSub}>
                Register a new pharmaceutical company
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/Admin/medical-management")}
          >
            <LinearGradient
              colors={["#6366f1", "#4f46e5"]}
              style={styles.iconBox}
            >
              <Feather name="activity" size={32} color="#fff" />
            </LinearGradient>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Medical Management</Text>
              <Text style={styles.menuSub}>
                Approve or decline medical retailer registrations
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/Admin/create-medicine")}
          >
            <LinearGradient
              colors={["#f472b6", "#db2777"]}
              style={styles.iconBox}
            >
              <Feather name="tablet" size={32} color="#fff" />
            </LinearGradient>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Create Medicine</Text>
              <Text style={styles.menuSub}>
                Add new medicine with assignments
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Logged in as Administrator</Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 40,
    marginTop: 20,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#1e293b" },
  menu: { gap: 20 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  menuText: { flex: 1 },
  menuTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  menuSub: { fontSize: 13, color: "#64748b", lineHeight: 18 },
  footer: {
    marginTop: "auto",
    alignItems: "center",
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
    letterSpacing: 1,
  },
});

export default AdminDashboard;
