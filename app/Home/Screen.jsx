import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Linking,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { secureStorage } from "../../utils/secureStore";

const fallbackApiUrl = (path) => path;
let apiUrl = fallbackApiUrl;
let fetchJson = async (path) => (await fetch(apiUrl(path))).json();
try {
  const api = require("../../config/api");
  apiUrl = api.apiUrl || fallbackApiUrl;
  if (api.fetchJson) fetchJson = api.fetchJson;
} catch (e) {}

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

const medicineDisplayName = (m) => {
  if (typeof m === "string") return m;
  if (m && m.name) return m.name;
  if (m && m.brandName) return m.brandName;
  return "";
};

const nameMatchesStockistItems = (name, s) => {
  if (!name || !s) return false;
  const n = String(name).toLowerCase();
  const items = s.items || s.companies || [];
  return items.some(i => {
    if (!i) return false;
    const str = typeof i === 'string' ? i : (i.name || i.shortName || "");
    return str && (str.toLowerCase().includes(n) || n.includes(str.toLowerCase()));
  });
};

const { width } = Dimensions.get("window");

const Screen = ({ navigation: navProp }) => {
  const router = useRouter();

  // If a parent passes navigation, we use it, otherwise fallback to router
  const navigation = navProp || {
    navigate: (path) => router.push(path),
    goBack: () => router.back(),
  };

  const [selectedSection, setSelectedSection] = useState(null);
  const [fullscreenStockist, setFullscreenStockist] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sectionData, setSectionData] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [unmatchedMedicines, setUnmatchedMedicines] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setPageLoading(true);
        const token = await secureStorage.getItem("token");
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        const [resStockist, resMedicine, resCompany] = await Promise.all([
          fetch(apiUrl(`/api/stockist?page=${page}&limit=${limit}`), { headers: authHeaders }).catch(() => ({ json: () => ({ data: [] }) })),
          fetch(apiUrl("/api/medicine"), { headers: authHeaders }).catch(() => ({ json: () => ({ data: [] }) })),
          fetch(apiUrl("/api/company"), { headers: authHeaders }).catch(() => ({ json: () => ({ data: [] }) })),
        ]);

        const [jsonStockist, jsonMedicine, jsonCompany] = await Promise.all([
          fetchJson(`/api/stockist?page=${page}&limit=${limit}`).catch(() => ({ data: [] })),
          fetchJson("/api/medicine").catch(() => ({ data: [] })),
          fetchJson("/api/company").catch(() => ({ data: [] })),
        ]);

        const medicines = (jsonMedicine && jsonMedicine.data) || [];
        const companies = (jsonCompany && jsonCompany.data) || [];

        if (mounted && jsonStockist && jsonStockist.data) {
          try {
            const tp = jsonStockist.totalPages || jsonStockist.pages || (jsonStockist.totalStockists && Math.ceil(jsonStockist.totalStockists / limit));
            if (tp != null) setTotalPages(Number(tp));
          } catch (e) {}
          
          const mapped = jsonStockist.data.map((s) => {
            let medsForStockist = medicines
              .filter((m) => medicineReferencesStockist(m, s._id))
              .map((m) => medicineDisplayName(m))
              .filter(Boolean);

            if ((!medsForStockist || medsForStockist.length === 0) && medicines.length > 0) {
              const stockistNames = new Set((s.Medicines || s.medicines || s.items || []).map((x) => String(x).toLowerCase()));
              const fallback = medicines
                .filter((m) => {
                  const name = medicineDisplayName(m) || "";
                  if (!name) return false;
                  if (nameMatchesStockistItems(name, s)) return true;
                  const lname = name.toLowerCase();
                  for (const n of stockistNames) {
                    if (!n) continue;
                    if (n.includes(lname) || lname.includes(n)) return true;
                  }
                  return false;
                })
                .map((m) => medicineDisplayName(m))
                .filter(Boolean);
              if (fallback.length > 0) medsForStockist = fallback;
            }

            const companyIds = new Set(
              medicines
                .filter((m) =>
                  Array.isArray(m.stockists)
                    ? m.stockists.some((st) => String(st.stockist || st).includes(String(s._id)))
                    : false
                )
                .map((m) => (m.company && (m.company._id || m.company) ? String(m.company._id || m.company) : null))
                .filter(Boolean)
            );

            let companiesForStockist = companies
              .filter((c) => companyIds.has(String(c._id)))
              .map((c) => (c.name ? c.name : c.shortName || ""))
              .filter(Boolean);

            const deepScanCompanyReferences = (obj, sid) => {
              if (!obj) return false;
              const target = String(sid);
              const seen = new Set();
              const walk = (value) => {
                if (value == null) return false;
                if (seen.has(value)) return false;
                if (typeof value === "string" || typeof value === "number") return String(value) === target;
                if (Array.isArray(value)) {
                  for (const item of value) if (walk(item)) return true;
                  return false;
                }
                if (typeof value === "object") {
                  if (seen.has(value)) return false;
                  seen.add(value);
                  for (const k of Object.keys(value)) if (walk(value[k])) return true;
                  return false;
                }
                return false;
              };
              return walk(obj);
            };

            const reverseCompanies = companies
              .filter((c) => deepScanCompanyReferences(c, s._id))
              .map((c) => (c.name ? c.name : c.shortName || ""))
              .filter(Boolean);

            companiesForStockist = Array.from(new Set([...companiesForStockist, ...reverseCompanies]));

            const companyIdsFromStockist = new Set(
              (s.companies || s.items || [])
                .map((c) => {
                  if (!c) return null;
                  if (typeof c === "string") return String(c);
                  if (c._id) return String(c._id);
                  if (c.id) return String(c.id);
                  return null;
                })
                .filter(Boolean)
            );

            if ((!medsForStockist || medsForStockist.length === 0) && companyIdsFromStockist.size > 0) {
              const byCompany = medicines
                .filter((m) => {
                  const comp = m.company && (m.company._id || m.company);
                  return comp && companyIdsFromStockist.has(String(comp));
                })
                .map((m) => medicineDisplayName(m))
                .filter(Boolean);
              if (byCompany.length > 0)
                medsForStockist = [...new Set([...(medsForStockist || []), ...byCompany])];
            }

            const explicitItems = (Array.isArray(s.companies) ? s.companies : [])
              .map((c) => {
                if (typeof c === "string") {
                  const found = companies.find((co) => String(co._id) === c || co.id === c);
                  return found ? found.name || found.shortName || c : c;
                }
                if (c && (c.name || c.shortName)) return c.name || c.shortName;
                return "";
              })
              .filter(Boolean);

            const items = Array.from(new Set([...(explicitItems || []), ...(companiesForStockist || [])]));

            let meds = [];
            if (Array.isArray(s.medicines) && s.medicines.length > 0) {
              meds = s.medicines
                .map((m) => {
                  if (typeof m === "string") return m;
                  if (m && (m.name || m.brandName)) return m.name || m.brandName;
                  try {
                    const candidateId = m && (m._id || m.id || m);
                    if (candidateId && medicines && medicines.length > 0) {
                      const found = medicines.find(
                        (md) =>
                          String(md._id) === String(candidateId) ||
                          String(md._id) === String(candidateId._id || candidateId.id || candidateId)
                      );
                      if (found) return medicineDisplayName(found);
                    }
                  } catch (e) {}
                  return "";
                })
                .filter(Boolean);
            } else {
              meds = (medsForStockist || []).slice();
            }

            return {
              _id: s._id,
              title: s.name,
              phone: s.phone,
              address: s.address ? `${s.address.street || ""}${s.address.city ? ", " + s.address.city : ""}` : "",
              image: (s.logo && s.logo.url) || null,
              items,
              Medicines: meds,
            };
          });

          setSectionData(mapped);

          if (jsonStockist.data.length === 0 && page > 1) {
            setPage((p) => Math.max(1, p - 1));
          }
        }
      } catch (err) {
      } finally {
        setPageLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [page]);

  useEffect(() => {
    (async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);
        setIsAdmin(user && user.role === "admin");
      } catch (err) {}
    })();
  }, []);

  const generateHealthColor = (index) => {
    const colors = [
      ["#06B6D4", "#0891B2"],
      ["#10B981", "#059669"],
      ["#8B5CF6", "#7C3AED"],
      ["#F59E0B", "#D97706"],
      ["#EF4444", "#DC2626"],
      ["#3B82F6", "#2563EB"],
      ["#EC4899", "#DB2777"],
    ];
    return colors[index % colors.length];
  };

  const makePhoneCall = (phoneNumber) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const getHealthIcon = (item) => {
    const healthIcons = {
      cardiovascular: "❤",
      diabetes: "🩺",
      pain: "💊",
      mental: "🧠",
      pediatric: "👶",
      emergency: "🚨",
      chronic: "⚕",
      preventive: "🛡",
      oncology: "🎗",
      respiratory: "🫁",
      dermatology: "🧴",
      orthopedic: "🦴",
      gastro: "🫄",
      neurological: "🧠",
      pharmacy: "💊",
      hospital: "🏥",
      clinic: "🏥",
      medical: "⚕",
      health: "🩺",
      care: "💊",
      medicine: "💉",
      drug: "💊",
      pharma: "💊",
      therapeutic: "🩹",
      surgical: "🔬",
      diagnostic: "🔬",
      laboratory: "🧪",
      radiology: "📷",
      nutrition: "🍎",
      wellness: "🌱",
      fitness: "💪",
      rehabilitation: "🏃‍♂️",
    };
    const itemLower = String(item).toLowerCase();
    for (const [key, icon] of Object.entries(healthIcons)) {
      if (itemLower.includes(key)) return icon;
    }
    return "💊";
  };

  const ListHeader = () => (
    <LinearGradient colors={["#f8fafc", "#eff6ff", "#ecfeff"]} style={styles.headerContainer}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeftRow}>
          <LinearGradient colors={["#38bdf8", "#3b82f6"]} style={styles.iconBox}>
            <Text style={styles.emojiText}>🏥</Text>
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>Your Stockists</Text>
            <Text style={styles.headerSubtitle}>Trusted Healthcare Network</Text>
          </View>
        </View>
        <View style={styles.headerRightRow}>
          <LinearGradient colors={["#fb923c", "#ec4899"]} style={styles.smallIconBox}>
            <Text style={styles.emojiTextWhite}>❤</Text>
          </LinearGradient>
          <View style={styles.outlinedIconBox}>
            <Text style={styles.emojiText}>♡</Text>
          </View>
        </View>
      </View>

      <LinearGradient colors={["#fb923c", "#f97316", "#ea580c"]} style={styles.banner}>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>Find Your Medical Partners</Text>
          <Text style={styles.bannerSubtitle}>Connect with trusted healthcare suppliers & stockists</Text>
          <View style={styles.bannerPillRow}>
            <View style={styles.bannerPill}>
              <View style={[styles.dot, { backgroundColor: "#4ade80" }]} />
              <Text style={styles.bannerPillText}>24/7 Support</Text>
            </View>
            <View style={styles.bannerPill}>
              <View style={[styles.dot, { backgroundColor: "#facc15" }]} />
              <Text style={styles.bannerPillText}>Verified Partners</Text>
            </View>
          </View>
        </View>
        <Text style={styles.bannerIcon}>💊</Text>
      </LinearGradient>

      {isAdmin && (
        <TouchableOpacity onPress={() => navigation.navigate("/Admin")} style={styles.adminButtonContainer}>
          <LinearGradient colors={["#8b5cf6", "#9333ea"]} style={styles.adminGradient}>
            <Text style={styles.adminText}>Admin Panel</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      <View style={styles.subHeader}>
        <View>
          <Text style={styles.subHeaderTitle}>Medical Suppliers</Text>
          <Text style={styles.subHeaderSubtitle}>
            {sectionData.length} trusted stockist{sectionData.length !== 1 ? "s" : ""} available
          </Text>
        </View>
        <LinearGradient colors={["#3b82f6", "#06b6d4"]} style={styles.countBox}>
          <Text style={styles.countText}>{sectionData.length}</Text>
        </LinearGradient>
      </View>
    </LinearGradient>
  );

  const renderCard = (section, index) => {
    const [c1, c2] = generateHealthColor(index);
    return (
      <TouchableOpacity
        key={section._id || index}
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => setFullscreenStockist(index)}
      >
        {section.image ? (
          <Image source={{ uri: section.image }} style={styles.cardCover} />
        ) : (
          <LinearGradient colors={[c1 || "#00C4B3", c2 || "#007BFF"]} style={styles.cardCoverPlaceholder}>
            <Text style={styles.cardCoverInitial}>{section.title?.charAt(0)}</Text>
          </LinearGradient>
        )}

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <View style={styles.cardRow}>
            <View style={styles.cardIconBoxPhone}>
              <Feather name="phone" size={16} color="#2563eb" />
            </View>
            <Text style={styles.cardRowText}>{section.phone || "N/A"}</Text>
          </View>

          <View style={styles.cardRow}>
            <View style={styles.cardIconBoxMap}>
              <Feather name="map-pin" size={16} color="#0d9488" />
            </View>
            <Text style={styles.cardRowText}>{section.address || "N/A"}</Text>
          </View>
          <View style={styles.servicesBox}>
            <Text style={styles.servicesTitle}>Services</Text>
            <View style={styles.servicesRow}>
              {section.items.slice(0, 2).map((it, idx) => (
                <View key={idx} style={styles.serviceTag}>
                  <Text style={styles.serviceIcon}>{getHealthIcon(it)}</Text>
                  <Text style={styles.serviceText}>{it}</Text>
                </View>
              ))}
              {section.items.length > 2 && (
                <View style={styles.serviceMoreTag}>
                  <Text style={styles.serviceMoreText}>+{section.items.length - 2} more</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.medCountTag}>
              <Text style={styles.medCountText}>
                {section.Medicines ? `${section.Medicines.length} medicines` : "0 medicines"}
              </Text>
            </View>
            <View style={styles.viewDetailsRow}>
              <Text style={styles.viewDetailsText}>View details</Text>
              <View style={styles.viewDetailsIcon}>
                <Feather name="eye" size={16} color="#9333ea" />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailView = (section = sectionData[selectedSection], idx = selectedSection) => {
    const currentSection = section;
    if (!currentSection) return null;
    const [color1, color2] = generateHealthColor(idx || 0);

    return (
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setFullscreenStockist(null)} style={styles.closeBtn}>
             <Feather name="x" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle}>{currentSection.title}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.detailScroll}>
          <View style={styles.detailInfoCard}>
            <View style={styles.detailInfoRow}>
              {currentSection.image ? (
                <Image source={{ uri: currentSection.image }} style={styles.detailImage} />
              ) : (
                <LinearGradient colors={[color1, color2]} style={styles.detailImagePlaceholder}>
                  <Text style={styles.detailImageInitial}>{currentSection.title?.charAt(0)}</Text>
                </LinearGradient>
              )}
              <View style={styles.detailInfoText}>
                <Text style={styles.detailTitle}>{currentSection.title}</Text>
                <Text style={styles.detailSubtitle}>{currentSection.address}</Text>
                <View style={styles.ratingRow}>
                  <View style={styles.ratingBadge}>
                    <Text style={{ fontSize: 12 }}>⭐ 4.8</Text>
                  </View>
                  <Text style={styles.reviewText}>(209 Reviews)</Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.callButton} onPress={() => makePhoneCall(currentSection.phone)}>
            <Text style={styles.callButtonIcon}>📞</Text>
            <Text style={styles.callButtonText}>Call Now</Text>
          </TouchableOpacity>

          <View style={styles.detailSectionBox}>
            <Text style={styles.detailSectionTitle}>Partner Companies</Text>
            {currentSection.items.map((item, idxx) => (
              <View key={idxx} style={styles.partnerRow}>
                <View style={styles.partnerIconBox}>
                  <Text style={styles.partnerIcon}>{getHealthIcon(item)}</Text>
                </View>
                <Text style={styles.partnerName}>{item}</Text>
                <Feather name="chevron-right" size={20} color="#cbd5e1" />
              </View>
            ))}
          </View>

          {currentSection.Medicines && currentSection.Medicines.length > 0 && (
            <View style={styles.detailSectionBox}>
              <View style={styles.medHeaderRow}>
                <Text style={styles.detailSectionTitle}>Medicines In Stock</Text>
                <View style={styles.medCountBadge}>
                  <Text style={styles.medCountBadgeText}>{currentSection.Medicines.length} items</Text>
                </View>
              </View>
              {currentSection.Medicines.slice(0, 5).map((medicine, i) => (
                <View key={i} style={styles.medItemRow}>
                  <View style={styles.medIconBox}>
                    <Text style={styles.medIcon}>💊</Text>
                  </View>
                  <View style={styles.medItemTextCol}>
                    <Text style={styles.medName}>{medicine}</Text>
                    <Text style={styles.medStatus}>Available</Text>
                  </View>
                </View>
              ))}
              {currentSection.Medicines.length > 5 && (
                <TouchableOpacity style={styles.viewAllBtn}>
                  <Text style={styles.viewAllText}>View All {currentSection.Medicines.length} Medicines</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderBottomNavigation = () => (
    <View style={styles.bottomNavContainer}>
      <View style={styles.bottomNavInner}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate("/Home")}>
          <LinearGradient colors={["#cffafe", "#dbeafe"]} style={styles.navIconBoxActive}>
            <Text style={{ fontSize: 24 }}>🏠</Text>
          </LinearGradient>
          <Text style={styles.navItemTextActive}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => navigation.navigate("/demand")} style={styles.navItem}>
          <View style={styles.navIconBoxInactive}>
            <Text style={{ fontSize: 24 }}>📋</Text>
          </View>
          <Text style={styles.navItemTextInactive}>Demand</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("/profile")} style={styles.navItem}>
          <View style={styles.navIconBoxInactive}>
            <Text style={{ fontSize: 24 }}>👤</Text>
          </View>
          <Text style={styles.navItemTextInactive}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {fullscreenStockist === null ? (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: 150 }} style={{ flex: 1 }}>
            <ListHeader />
            {sectionData.map((s, i) => renderCard(s, i))}

            {/* Pagination */}
            <View style={styles.paginationRow}>
              <TouchableOpacity
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || pageLoading}
                style={[styles.pageBtn, (page <= 1 || pageLoading) && styles.pageBtnDisabled]}
              >
                <Feather name="chevron-left" size={20} color={(page <= 1 || pageLoading) ? "#9ca3af" : "#fff"} />
                <Text style={[(page <= 1 || pageLoading) ? styles.pageBtnTextDisabled : styles.pageBtnText]}>Prev</Text>
              </TouchableOpacity>

              <View style={styles.pageIndicator}>
                <Text style={styles.pageIndicatorText}>Page {page}{totalPages ? ` of ${totalPages}` : ""}</Text>
              </View>

              <TouchableOpacity
                onPress={() => setPage((p) => p + 1)}
                disabled={pageLoading || (totalPages != null && page >= totalPages)}
                style={[styles.pageBtn, (pageLoading || (totalPages != null && page >= totalPages)) && styles.pageBtnDisabled]}
              >
                <Text style={[(pageLoading || (totalPages != null && page >= totalPages)) ? styles.pageBtnTextDisabled : styles.pageBtnText]}>Next</Text>
                <Feather name="chevron-right" size={20} color={(pageLoading || (totalPages != null && page >= totalPages)) ? "#9ca3af" : "#fff"} />
              </TouchableOpacity>
            </View>
          </ScrollView>
          {renderBottomNavigation()}
        </>
      ) : (
        <Modal visible={true} animationType="slide" presentationStyle="formSheet">
          {renderDetailViewForFullscreen(fullscreenStockist)}
        </Modal>
      )}
    </View>
  );

  function renderDetailViewForFullscreen(idx) {
    const currentSection = sectionData[idx];
    if (!currentSection) return null;
    return renderDetailView(currentSection, idx);
  }
};

const styles = StyleSheet.create({
  headerContainer: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  headerLeftRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  emojiText: { fontSize: 24 },
  emojiTextWhite: { fontSize: 20, color: 'white' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#334155' },
  headerSubtitle: { fontSize: 14, color: '#64748b' },
  headerRightRow: { flexDirection: 'row' },
  smallIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  outlinedIconBox: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  banner: { padding: 24, borderRadius: 24, marginBottom: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  bannerSubtitle: { color: '#ffedd5', fontSize: 14, marginBottom: 16 },
  bannerPillRow: { flexDirection: 'row' },
  bannerPill: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  bannerPillText: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  bannerIcon: { fontSize: 48, opacity: 0.9 },
  adminButtonContainer: { marginBottom: 32, borderRadius: 16, overflow: 'hidden' },
  adminGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  adminText: { color: '#ffffff', fontWeight: 'bold' },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subHeaderTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  subHeaderSubtitle: { fontSize: 14, color: '#475569', marginTop: 4 },
  countBox: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 16 },
  countText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  card: { backgroundColor: '#fff', borderRadius: 24, marginHorizontal: 24, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4, overflow: 'hidden' },
  cardCover: { height: 200, width: '100%' },
  cardCoverPlaceholder: { height: 200, width: '100%', justifyContent: 'center', alignItems: 'center' },
  cardCoverInitial: { fontSize: 64, fontWeight: '800', color: 'rgba(255,255,255,0.9)' },
  cardBody: { padding: 24 },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardIconBoxPhone: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardIconBoxMap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ccfbf1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardRowText: { flex: 1, fontSize: 15, color: '#374151', marginTop: 4 },
  servicesBox: { marginTop: 12, marginBottom: 24 },
  servicesTitle: { fontSize: 16, fontWeight: '600', color: '#4b5563', marginBottom: 12 },
  servicesRow: { flexDirection: 'row', flexWrap: 'wrap' },
  serviceTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdfa', borderColor: '#ccfbf1', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, marginBottom: 8 },
  serviceIcon: { marginRight: 6 },
  serviceText: { color: '#0d9488', fontSize: 13, fontWeight: '500' },
  serviceMoreTag: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 8, justifyContent: 'center' },
  serviceMoreText: { color: '#475569', fontSize: 13, fontWeight: '500' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 20, marginTop: 4 },
  medCountTag: { backgroundColor: '#ecfccb', borderColor: '#d9f99d', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  medCountText: { color: '#4d7c0f', fontWeight: 'bold', fontSize: 13 },
  viewDetailsRow: { flexDirection: 'row', alignItems: 'center' },
  viewDetailsText: { fontSize: 15, fontWeight: 'bold', color: '#9333ea', marginRight: 8 },
  viewDetailsIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3e8ff', justifyContent: 'center', alignItems: 'center' },
  paginationRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24 },
  pageBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0ea5e9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  pageBtnDisabled: { backgroundColor: '#f1f5f9' },
  pageBtnText: { color: '#fff', fontWeight: 'bold', marginHorizontal: 4 },
  pageBtnTextDisabled: { color: '#9ca3af', fontWeight: 'bold', marginHorizontal: 4 },
  pageIndicator: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginHorizontal: 16, borderWidth: 1, borderColor: '#e0f2fe' },
  pageIndicatorText: { color: '#0369a1', fontWeight: '600' },
  bottomNavContainer: { position: 'absolute', bottom: 24, left: 24, right: 24 },
  bottomNavInner: { backgroundColor: 'rgba(255,255,255,0.95)', flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: -4 }, shadowRadius: 10, elevation: 8 },
  navItem: { alignItems: 'center' },
  navIconBoxActive: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  navIconBoxInactive: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  navItemTextActive: { fontSize: 13, fontWeight: 'bold', color: '#0891b2' },
  navItemTextInactive: { fontSize: 13, fontWeight: '500', color: '#94a3b8' },
  detailContainer: { flex: 1, backgroundColor: '#f8fafc' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  closeBtn: { padding: 8 },
  detailHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', flex: 1, textAlign: 'center', marginRight: 40 },
  detailScroll: { padding: 16, paddingBottom: 40 },
  detailInfoCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  detailInfoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  detailImage: { width: 80, height: 80, borderRadius: 12, marginRight: 16 },
  detailImagePlaceholder: { width: 80, height: 80, borderRadius: 12, marginRight: 16, justifyContent: 'center', alignItems: 'center' },
  detailImageInitial: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  detailInfoText: { flex: 1 },
  detailTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  detailSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingBadge: { backgroundColor: '#ffedd5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginRight: 8 },
  reviewText: { fontSize: 13, color: '#94a3b8' },
  callButton: { backgroundColor: '#06b6d4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, marginBottom: 16 },
  callButtonIcon: { fontSize: 20, marginRight: 8 },
  callButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  detailSectionBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  detailSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  partnerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 12 },
  partnerIconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#cffafe', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  partnerIcon: { fontSize: 18 },
  partnerName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#334155' },
  medHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  medCountBadge: { backgroundColor: '#cffafe', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  medCountBadgeText: { color: '#0e7490', fontSize: 11, fontWeight: 'bold' },
  medItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  medIconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#ffedd5', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  medIcon: { fontSize: 16 },
  medItemTextCol: { flex: 1 },
  medName: { fontSize: 15, fontWeight: '600', color: '#334155' },
  medStatus: { fontSize: 13, color: '#64748b' },
  viewAllBtn: { marginTop: 12, padding: 12, backgroundColor: '#f1f5f9', borderRadius: 12, alignItems: 'center' },
  viewAllText: { color: '#334155', fontWeight: '600', fontSize: 14 }
});

export default Screen;


