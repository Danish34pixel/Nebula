import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Dimensions,
  Image,
  Alert,
  Platform,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiUrl } from "../../config/api";
import { secureStorage } from "../../utils/secureStore";
import IdentityCard from "../../components/stockist/IdentityCard";
import StockistApprovals from "../../components/stockist/StockistApprovals";
import StaffModel from "../Staff/StaffModel";

const { width } = Dimensions.get("window");

// Helper for consistent shadows
const shadowStyles = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 10,
  elevation: 5,
};

const Avatar = ({ name, size = 48, style }) => {
  const initials =
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const colorSchemes = [
    ["#8b5cf6", "#a855f7"], // violet to fuchsia
    ["#3b82f6", "#06b6d4"], // blue to teal
    ["#ec4899", "#f43f5e"], // pink to red
    ["#10b981", "#22c55e"], // emerald to lime
  ];
  const colorIndex = name?.charCodeAt(0) % colorSchemes.length || 0;

  return (
    <LinearGradient
      colors={colorSchemes[colorIndex]}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 3,
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 2,
          borderColor: "#fff",
        },
        shadowStyles,
        style,
      ]}
    >
      <Text style={{ color: "#fff", fontWeight: "bold", fontSize: size / 2.5 }}>
        {initials}
      </Text>
    </LinearGradient>
  );
};

const CompanyCard = ({ company, productCount = 0 }) => {
  const router = useRouter();
  const goToCompany = () => {
    if (company?._id) router.push(`/company/${company._id}/products`);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={goToCompany}
      style={styles.cardWrapper}
    >
      <LinearGradient
        colors={["#ffffff", "#fff7ed"]}
        style={[styles.cardContainer, { borderColor: "#ffedd5" }]}
      >
        <View style={styles.cardHeader}>
          <LinearGradient
            colors={["#fb923c", "#f59e0b"]}
            style={styles.iconBox}
          >
            <Feather name="briefcase" size={24} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {company.name}
            </Text>
            <Text style={styles.cardSubtitle}>{productCount} products</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={goToCompany}
          style={[styles.actionButton, { backgroundColor: "#f97316" }]}
        >
          <Text style={styles.actionButtonText}>
            {company?._id ? "View Details →" : "No Details"}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const MedicineCard = ({ medicine }) => (
  <View style={styles.cardWrapper}>
    <LinearGradient
      colors={["#ffffff", "#eff6ff"]}
      style={[styles.cardContainer, { borderColor: "#dbeafe" }]}
    >
      <View style={styles.cardHeader}>
        <LinearGradient
          colors={["#3b82f6", "#06b6d4"]}
          style={styles.iconBox}
        >
          <Feather name="package" size={24} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {medicine.name}
          </Text>
          <Text style={styles.cardSubtitle}>
            {medicine.company?.name || medicine.companyName || ""}
          </Text>
        </View>
      </View>
      {medicine.price && (
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>{medicine.price}</Text>
        </View>
      )}
    </LinearGradient>
  </View>
);
const StaffCard = ({ staff, onPreview }) => {
  const qrUrl = useMemo(() => {
    const profileUrl = `https://meditrap.com/Staff/${staff._id}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
      profileUrl
    )}`;
  }, [staff._id]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPreview(staff)}
      style={styles.cardWrapper}
    >
      <LinearGradient
        colors={["#ffffff", "#f8fafc"]}
        style={styles.staffCardContainer}
      >
        <Avatar name={staff.fullName || staff.name || "S"} size={60} style={styles.staffAvatar} />
        
        <View style={styles.staffInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {staff.fullName || staff.name}
          </Text>
          <View style={styles.contactRow}>
            <Feather name="phone" size={12} color="#94a3b8" />
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {staff.contact || staff.phone || "No contact"}
            </Text>
          </View>
          <Text style={styles.roleTag}>{staff.role || "Staff Member"}</Text>
        </View>

        <View style={styles.qrSectionSmall}>
          <Image source={{ uri: qrUrl }} style={styles.qrImageSmall} />
          <Feather name="maximize-2" size={10} color="#cbd5e1" style={styles.zoomIcon} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const LoadingSkeleton = () => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <View style={styles.skeletonContainer}>
      <Animated.View style={[styles.skeletonHeader, { opacity }]} />
      <Animated.View style={[styles.skeletonIdentity, { opacity }]} />
      <View style={styles.skeletonStatsRow}>
        <Animated.View style={[styles.skeletonStat, { opacity }]} />
        <Animated.View style={[styles.skeletonStat, { opacity }]} />
        <Animated.View style={[styles.skeletonStat, { opacity }]} />
      </View>
      <Animated.View style={[styles.skeletonContent, { opacity }]} />
    </View>
  );
};

export default function StockistDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const routeId = params.id || null;

  const [stockist, setStockist] = useState(null);
  const [companiesList, setCompaniesList] = useState([]);
  const [medicinesList, setMedicinesList] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("medicines");
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [authError, setAuthError] = useState(false);

  const stats = useMemo(
    () => ({
      companies: companiesList.length,
      medicines: medicinesList.length,
      staff: staffs.length,
    }),
    [companiesList.length, medicinesList.length, staffs.length]
  );

  const displayName = useMemo(() => {
    if (!stockist) return "Unnamed Stockist";
    return (
      stockist.medicalName ||
      stockist.contactPerson ||
      stockist.name ||
      stockist.companyName ||
      stockist.ownerName ||
      stockist.fullName ||
      stockist.email ||
      stockist.phone ||
      "Unnamed Stockist"
    );
  }, [stockist]);

  const filterByQuery = useCallback(
    (items, keys = ["name"]) => {
      if (!query) return items || [];
      const q = query.trim().toLowerCase();
      return (items || []).filter((item) => {
        if (
          keys.some((key) =>
            String(item?.[key] || "")
              .toLowerCase()
              .includes(q)
          )
        ) return true;
        
        const extraKeys = ["title", "shortName", "fullName", "brandName", "medicineName", "companyName", "email", "role", "contactPerson"];
        return extraKeys.some((key) =>
          String(item?.[key] || "")
            .toLowerCase()
            .includes(q)
        );
      });
    },
    [query]
  );

  const filteredData = useMemo(
    () => ({
      companies: filterByQuery(companiesList, ["name"]),
      medicines: filterByQuery(medicinesList, ["name"]),
      staff: filterByQuery(staffs, ["fullName", "name"]),
      approvals: [],
    }),
    [companiesList, medicinesList, staffs, filterByQuery]
  );

  const medicineReferencesStockist = (med, stockistId) => {
    if (!med) return false;
    const candidates = [];
    try {
      if (Array.isArray(med.stockists)) candidates.push(...med.stockists);
      if (med.stockist) candidates.push(med.stockist);
      if (med.stockistId) candidates.push(med.stockistId);
      if (med.seller) candidates.push(med.seller);
      if (med.sellerId) candidates.push(med.sellerId);
      if (med.vendor) candidates.push(med.vendor);
      if (med.vendorId) candidates.push(med.vendorId);
      if (med.supplier) candidates.push(med.supplier);
      if (med.supplierId) candidates.push(med.supplierId);
    } catch {}
    return candidates.some((c) => {
      const id = c?._id || c?.id || c;
      return String(id) === String(stockistId);
    });
  };

  const loadStockistData = useCallback(async () => {
    setLoading(true);
    setError("");
    setAuthError(false);

    try {
      const token = await secureStorage.getItem("token");
      if (!token) {
        setAuthError(true);
        throw new Error("Session expired. Please login again.");
      }
      const userStr = await AsyncStorage.getItem("user");
      let storedUser = userStr ? JSON.parse(userStr) : null;
      if (storedUser && storedUser.user) storedUser = storedUser.user;

      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const candidateIds = [];
      if (routeId && routeId !== "me") candidateIds.push(routeId);
      if (storedUser) {
        [storedUser._id, storedUser.id, storedUser.userId]
          .filter(Boolean)
          .forEach((v) => candidateIds.push(String(v)));
      }

      let list = [];
      if (candidateIds.length > 0) {
        for (const idToFetch of candidateIds) {
          try {
            const singleRes = await fetch(apiUrl(`/api/stockist/${idToFetch}`), {
              headers,
            });
            if (singleRes.status === 401) {
              setAuthError(true);
              throw new Error("Unauthorized");
            }
            const singleJson = await singleRes.json().catch(() => ({}));
            if (singleJson && singleJson.data) {
              list = [singleJson.data];
              break;
            }
          } catch (e) {
            if (e?.message === "Unauthorized") throw e;
          }
        }
      }

      if (list.length === 0) {
        const res = await fetch(apiUrl("/api/stockist"), { headers });
        if (res.status === 401) {
          setAuthError(true);
          throw new Error("Unauthorized");
        }
        const json = await res.json().catch(() => ({}));
        list = json?.data || [];
      }

      let target = null;
      const userIds = new Set();
      const userEmails = new Set();
      if (storedUser) {
        [storedUser._id, storedUser.id, storedUser?.userId]
          .filter(Boolean)
          .forEach((v) => userIds.add(String(v)));
        if (storedUser.email) userEmails.add(String(storedUser.email).toLowerCase());
      }

      const matchStockistWithUser = (s) => {
        if (s._id && userIds.has(String(s._id))) return true;
        if (s.id && userIds.has(String(s.id))) return true;
        const emailsToCheck = [s.email, s.ownerEmail, s.user?.email];
        for (const e of emailsToCheck.filter(Boolean)) {
          if (userEmails.has(String(e).toLowerCase())) return true;
        }
        return false;
      };

      if (routeId && routeId !== "me") {
        target = list.find(
          (s) => String(s._id) === String(routeId) || String(s.id) === String(routeId)
        );
      } else {
        // Find by ID match first, then by email
        if (storedUser) {
           target = list.find((s) => matchStockistWithUser(s));
        }
        if (!target && list.length > 0) target = list[0];
      }

      // Final attempt: if we still don't have a robust profile but have a storedUser, 
      // see if any item in the list matches the storedUser's email even if IDs didn't match.
      if (storedUser && (!target || !target.dob)) {
         const emailMatch = list.find(s => 
           (s.email && s.email.toLowerCase() === storedUser.email?.toLowerCase()) || 
           (s.ownerEmail && s.ownerEmail.toLowerCase() === storedUser.email?.toLowerCase())
         );
         if (emailMatch) target = emailMatch;
      }

      if (!target && storedUser) target = storedUser;
      if (!target) throw new Error("Stockist not found");

      setStockist(target);

      const [cRes, mRes, sRes] = await Promise.all([
        fetch(apiUrl("/api/company"), { headers }),
        fetch(apiUrl("/api/medicine"), { headers }),
        fetch(apiUrl(`/api/staff?stockist=${target._id}`), { headers }),
      ]);

      if ([cRes.status, mRes.status, sRes.status].includes(401)) {
        setAuthError(true);
        throw new Error("Unauthorized");
      }

      const [cJson, mJson, sJson] = await Promise.all([
        cRes.json().catch(() => ({})),
        mRes.json().catch(() => ({})),
        sRes.json().catch(() => ({})),
      ]);

      const allCompanies = cJson?.data || [];
      const allMeds = mJson?.data || [];
      const staffList = sJson?.data || [];

      const filteredCompanies = allCompanies.filter((company) => {
        try {
          if (Array.isArray(company.stockists))
            return company.stockists.some(
              (s) => String(s?._id || s) === String(target._id)
            );
          const keys = [
            company.stockist,
            company.stockistId,
            company.seller,
            company.sellerId,
            company.vendor,
            company.vendorId,
            company.supplier,
            company.supplierId,
          ];
          return keys.some(
            (key) => key && String(key._id || key.id || key) === String(target._id)
          );
        } catch {
          return false;
        }
      });

      const filteredMeds = allMeds.filter((med) =>
        medicineReferencesStockist(med, target._id)
      );

      const filteredStaffs = staffList.filter((s) => {
        try {
          const sid = s.stockist?._id || s.stockist || s.stockistId || s.owner?._id || s.owner || s.ownerId || s.medical?._id || s.medical;
          return sid && String(sid) === String(target._id);
        } catch {
          return false;
        }
      });

      setCompaniesList(filteredCompanies);
      setMedicinesList(filteredMeds);
      setStaffs(filteredStaffs);
    } catch (err) {
      console.error("Dashboard error:", err);
      if (err?.message === "Unauthorized" || err?.message?.includes("login")) {
        setError("Session expired. Please login again.");
      } else {
        setError(err.message || "Failed to load data");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [routeId]);

  useEffect(() => {
    loadStockistData();
  }, [loadStockistData]);

  useEffect(() => {
    if (!authError) return;
    secureStorage.multiRemove(["token", "refreshToken", "user"]).finally(() => {
      router.replace("/Stockist/stockist-login");
    });
  }, [authError, router]);

  const handleLogout = async () => {
    await secureStorage.multiRemove(["token", "refreshToken", "user", "pendingStockistId", "pendingUserId"]);
    router.replace("/Stockist/stockist-login");
  };

  const qrDataUrl = useMemo(() => {
    if (!stockist?._id) return null;
    const shareUrl = `https://meditrap.com/stockist/${stockist._id}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      shareUrl
    )}`;
  }, [stockist]);

  const TAB_CONFIG = [
    { key: "medicines", label: "Medicines", icon: "package", color: "#3b82f6", bg: "#eff6ff" },
    { key: "companies", label: "Companies", icon: "briefcase", color: "#f97316", bg: "#fff7ed" },
    { key: "staff", label: "Staff", icon: "users", color: "#8b5cf6", bg: "#faf5ff" },
    { key: "approvals", label: "Approvals", icon: "check-circle", color: "#10b981", bg: "#f0fdf4" },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingSkeleton />
      </SafeAreaView>
    );
  }

  if (error && !stockist) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyTitle}>Unable to load dashboard</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity onPress={loadStockistData} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={["#f5f3ff", "#fdf2f8"]} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.headerSubtitle}>
              {stockist?.email || stockist?.contactPerson || "Authorized Stockist"}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/profile")} style={styles.profileBtn}>
            <Feather name="user" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Feather name="log-out" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadStockistData} tintColor="#8b5cf6" />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* Identity Card */}
          <IdentityCard
            stockist={{
              ...(stockist || {}),
              contactPerson: stockist?.contactPerson || displayName,
            }}
            qrDataUrl={qrDataUrl}
            onPrint={() => Alert.alert("Print", "Connect to a printer to print this ID.")}
          />

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard icon="briefcase" count={stats.companies} label="Companies" colors={["#fb923c", "#f59e0b"]} />
            <StatCard icon="package" count={stats.medicines} label="Medicines" colors={["#3b82f6", "#06b6d4"]} />
            <StatCard icon="users" count={stats.staff} label="Staff Members" colors={["#8b5cf6", "#d946ef"]} />
          </View>

          {/* Main Content */}
          <View style={styles.contentSection}>
            <View style={styles.actionRow}>
              <View style={styles.searchContainer}>
                <Feather name="search" size={20} color="#94a3b8" />
                <TextInput
                  placeholder={`Search ${activeTab}...`}
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                />
              </View>
              <TouchableOpacity
                onPress={() => router.push("/Staff/Createstaff")}
                style={styles.addStaffBtn}
              >
                <LinearGradient colors={["#8b5cf6", "#d946ef"]} style={styles.addStaffGradient}>
                  <Feather name="user-plus" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.tabsContainer}>
              {TAB_CONFIG.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setActiveTab(t.key)}
                  style={[
                    styles.tabBtn,
                    { backgroundColor: activeTab === t.key ? t.color : t.bg },
                  ]}
                >
                  <Feather name={t.icon} size={16} color={activeTab === t.key ? "#fff" : t.color} />
                  <Text style={[styles.tabText, { color: activeTab === t.key ? "#fff" : t.color }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.tabContent}>
              {activeTab === "approvals" ? (
                <StockistApprovals />
              ) : filteredData[activeTab].length > 0 ? (
                filteredData[activeTab].map((item, i) => {
                  if (activeTab === "companies") return <CompanyCard key={i} company={item} />;
                  if (activeTab === "medicines") return <MedicineCard key={i} medicine={item} />;
                  if (activeTab === "staff") return <StaffCard key={i} staff={item} onPreview={setSelectedStaff} />;
                  return null;
                })
              ) : (
                <View style={styles.emptyContainer}>
                  <Feather name="inbox" size={48} color="#cbd5e1" />
                  <Text style={styles.emptyTitle}>No {activeTab} found</Text>
                  <Text style={styles.emptyText}>Try searching for something else</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
      
      {/* Staff Quick View Modal */}
      <StaffModel staff={selectedStaff} onClose={() => setSelectedStaff(null)} />
    </SafeAreaView>
  );
}

const StatCard = ({ icon, count, label, colors }) => (
  <View style={styles.statCardWrapper}>
    <LinearGradient colors={["#ffffff", "#ffffff"]} style={styles.statCard}>
      <LinearGradient colors={colors} style={styles.statIconBox}>
        <Feather name={icon} size={20} color="#fff" />
      </LinearGradient>
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </LinearGradient>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#1e293b" },
  headerSubtitle: { fontSize: 13, color: "#64748b", fontWeight: "600", marginTop: 2 },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#0ea5e9",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  scrollContent: { paddingBottom: 40 },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 16,
    marginBottom: 20,
  },
  statCardWrapper: { flex: 1 },
  statCard: {
    padding: 16,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    ...shadowStyles,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statCount: { fontSize: 22, fontWeight: "900", color: "#1e293b" },
  statLabel: { fontSize: 9, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", textAlign: "center" },
  contentSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 32,
    padding: 20,
    ...shadowStyles,
  },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 14, color: "#1e293b", fontWeight: "600" },
  addStaffBtn: { width: 52, height: 52, borderRadius: 16, overflow: "hidden" },
  addStaffGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabText: { fontSize: 12, fontWeight: "700" },
  tabContent: { minHeight: 200 },
  cardWrapper: { marginBottom: 16 },
  cardContainer: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    ...shadowStyles,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "900", color: "#1e293b" },
  cardSubtitle: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
  },
  actionButtonText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  priceTag: {
    alignSelf: "flex-start",
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  priceText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  
  // Refined Staff Card Styles
  staffCardContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...shadowStyles,
  },
  staffAvatar: { marginRight: 16 },
  staffInfo: { flex: 1, gap: 4 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  roleTag: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 4,
  },
  qrSectionSmall: {
    padding: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    position: "relative",
  },
  qrImageSmall: { width: 44, height: 44 },
  zoomIcon: { position: "absolute", bottom: 2, right: 2 },

  emptyContainer: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: "#1e293b", marginTop: 12 },
  emptyText: { fontSize: 14, color: "#94a3b8", marginTop: 4 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: { color: "#fff", fontWeight: "700" },

  // Skeleton Styles
  skeletonContainer: { padding: 20, flex: 1, backgroundColor: "#fff" },
  skeletonHeader: { height: 60, borderRadius: 16, backgroundColor: "#f1f5f9", marginBottom: 20 },
  skeletonIdentity: { height: 200, borderRadius: 24, backgroundColor: "#f1f5f9", marginBottom: 20 },
  skeletonStatsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  skeletonStat: { flex: 1, height: 100, borderRadius: 20, backgroundColor: "#f1f5f9" },
  skeletonContent: { flex: 1, borderRadius: 32, backgroundColor: "#f1f5f9" },
});
