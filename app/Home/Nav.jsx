import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Image,
  Dimensions,
  Linking
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Safely require backend config
const fallbackApiUrl = (p) => p;
let apiUrl = fallbackApiUrl;
try {
  const api = require("../../config/api");
  apiUrl = api.apiUrl || fallbackApiUrl;
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

const { width, height } = Dimensions.get("window");

export default function Nav({ navigation: navProp }) {
  const router = useRouter();

  const navigation = navProp || {
    navigate: (path) => router.push(path),
    goBack: () => router.back(),
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterType, setFilterType] = useState("company");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedStockists, setSelectedStockists] = useState([]);
  const [showAllResults, setShowAllResults] = useState(false);

  const [page, setPage] = useState(1);
  const limit = 10;
  const [pageLoading, setPageLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [sectionData, setSectionData] = useState([]);
  const [openCardId, setOpenCardId] = useState(null);
  
  // No scroll observer needed for native unless bound to parent scroll view
  // so we keep it 100% visible

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        const [resStockist, resMedicine, resCompany] = await Promise.all([
          fetch(apiUrl("/api/stockist"), { headers: authHeaders }),
          fetch(apiUrl("/api/medicine"), { headers: authHeaders }),
          fetch(apiUrl("/api/company"), { headers: authHeaders }),
        ]);
        const [jsonStockist, jsonMedicine, jsonCompany] = await Promise.all([
          resStockist.json(),
          resMedicine.json(),
          resCompany.json(),
        ]);

        const medicines = (jsonMedicine && jsonMedicine.data) || [];
        const companies = (jsonCompany && jsonCompany.data) || [];

        if (mounted && jsonStockist && jsonStockist.data) {
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
                .filter((m) => Array.isArray(m.stockists) ? m.stockists.some((st) => String(st.stockist || st).includes(String(s._id))) : false)
                .map((m) => m.company && (m.company._id || m.company) ? String(m.company._id || m.company) : null)
                .filter(Boolean)
            );

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
              if (byCompany.length > 0) medsForStockist = [...new Set([...(medsForStockist || []), ...byCompany])];
            }

            let companiesForStockist = companies
              .filter((c) => companyIds.has(String(c._id)))
              .map((c) => (c.name ? c.name : c.shortName || ""))
              .filter(Boolean);

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
                      const found = medicines.find((md) => String(md._id) === String(candidateId) || String(md._id) === String((candidateId && (candidateId._id || candidateId.id)) || candidateId));
                      if (found) return medicineDisplayName(found);
                    }
                  } catch (e) {}
                  return "";
                })
                .filter(Boolean);
            } else {
              meds = (medsForStockist || []).slice();
            }

            const deepScanCompanyReferences = (obj, sid) => {
              if (!obj) return false;
              const target = String(sid);
              const seen = new Set();
              const walk = (value) => {
                if (value == null) return false;
                if (seen.has(value)) return false;
                if (typeof value === "string" || typeof value === "number") return String(value) === target;
                if (Array.isArray(value)) { for (const item of value) if (walk(item)) return true; return false; }
                if (typeof value === "object") {
                  if (seen.has(value)) return false;
                  seen.add(value);
                  for (const k of Object.keys(value)) { if (walk(value[k])) return true; }
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
              
            return {
              _id: s._id,
              title: s.name,
              phone: s.phone,
              address: s.address ? `${s.address.street || ""}${s.address.city ? ", " + s.address.city : ""}` : "",
              items,
              Medicines: meds,
            };
          });
          setSectionData(mapped);
        }
      } catch (err) {
        console.warn("Nav: failed to load stockists", err);
      }
    })();
    return () => (mounted = false);
  }, []);

  const fetchStockistsPage = async (p = page) => {
    setPageLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      const [resStockist, resMedicine, resCompany] = await Promise.all([
        fetch(apiUrl(`/api/stockist?page=${p}&limit=${limit}`), { headers: authHeaders }),
        fetch(apiUrl("/api/medicine"), { headers: authHeaders }),
        fetch(apiUrl("/api/company"), { headers: authHeaders }),
      ]);

      const [jsonStockist, jsonMedicine, jsonCompany] = await Promise.all([
        resStockist.json(),
        resMedicine.json(),
        resCompany.json(),
      ]);

      const medicines = (jsonMedicine && jsonMedicine.data) || [];
      const companies = (jsonCompany && jsonCompany.data) || [];

      const data = (jsonStockist && jsonStockist.data) || [];

      const mapped = data.map((s) => {
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
            .filter((m) => Array.isArray(m.stockists) ? m.stockists.some((st) => String(st.stockist || st).includes(String(s._id))) : false)
            .map((m) => (m.company && (m.company._id || m.company) ? String(m.company._id || m.company) : null))
            .filter(Boolean)
        );

        let companiesForStockist = companies
          .filter((c) => companyIds.has(String(c._id)))
          .map((c) => (c.name ? c.name : c.shortName || ""))
          .filter(Boolean);

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
          if (byCompany.length > 0) medsForStockist = [...new Set([...(medsForStockist || []), ...byCompany])];
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
                  const found = medicines.find((md) => String(md._id) === String(candidateId) || String(md._id) === String(candidateId._id || candidateId.id || candidateId));
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
          items,
          Medicines: meds,
        };
      });

      setSelectedStockists(mapped);

      const tp = jsonStockist.totalPages || jsonStockist.pages || (jsonStockist.totalStockists && Math.ceil(jsonStockist.totalStockists / limit));
      if (tp != null) setTotalPages(Number(tp)); else setTotalPages(null);
      if (data.length === 0 && p > 1) setPage((cur) => Math.max(1, cur - 1));
    } catch (e) {
      console.warn("Nav: failed to fetch stockists page", e);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (filterType === "stockist" && showAllResults) fetchStockistsPage(page);
  }, [filterType, showAllResults, page]);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        setUserToken(token);
      } catch (e) {}
    })();
  }, []);

  const getAllItems = (type) => {
    if (type === "company") {
      const allCompanies = new Set();
      const norm = (s) => String(s || "").toLowerCase().trim();
      sectionData.forEach((section) => section.items?.forEach((item) => allCompanies.add(norm(item))));
      return Array.from(allCompanies);
    } else if (type === "stockist") {
      return sectionData.map((section) => section.title);
    } else if (type === "medicine") {
      const allMedicines = new Set();
      sectionData.forEach((section) => section.Medicines?.forEach((med) => allMedicines.add(med)));
      return Array.from(allMedicines);
    }
    return [];
  };

  const handleFilterTypeChange = (newType) => {
    setFilterType(newType);
    setSearchQuery("");
    setSelectedStockists([]);
    setShowAllResults(true);
    setShowFilterModal(false);

    const allItems = getAllItems(newType);
    if (newType === "stockist") {
      setSelectedStockists([]); 
      setPage(1);
      setShowAllResults(true);
    } else if (newType === "company") {
      const companyStockists = [];
      const norm = (s) => String(s || "").toLowerCase().trim();
      allItems.forEach((company) => {
        const stockists = sectionData.filter((section) => (section.items || []).some((it) => norm(it) === company));
        companyStockists.push(...stockists);
      });
      setSelectedStockists([...new Set(companyStockists)]);
    } else if (newType === "medicine") {
      const medicineStockists = [];
      allItems.forEach((medicine) => {
        const stockists = sectionData.filter((section) => section.Medicines && section.Medicines.includes(medicine));
        medicineStockists.push(...stockists);
      });
      setSelectedStockists([...new Set(medicineStockists)]);
    }
  };

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    const resultSet = new Set();

    if (!q) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    } else if (filterType === "stockist") {
      sectionData.forEach((section) => { if (section.title && section.title.toLowerCase().includes(q)) resultSet.add(section.title); });
    } else if (filterType === "medicine") {
      sectionData.forEach((section) => section.Medicines?.forEach((med) => { if (med && med.toLowerCase().includes(q)) resultSet.add(med); }));
    } else if (filterType === "company") {
      sectionData.forEach((section) => section.items?.forEach((item) => { if (item && item.toLowerCase().includes(q)) resultSet.add(item); }));
    }

    const results = [...resultSet];
    setSuggestions(results);
    setShowSuggestions(results.length > 0);

    if (q) {
      const norm = (s) => String(s || "").toLowerCase().trim();
      let matches = [];
      if (filterType === "company") {
        matches = sectionData.filter((section) => (section.items || []).some((it) => norm(it).includes(q)));
      } else if (filterType === "medicine") {
        matches = sectionData.filter((section) => (section.Medicines || []).some((med) => norm(med).includes(q)));
      } else if (filterType === "stockist") {
        matches = sectionData.filter((section) => norm(section.title).includes(q));
      }
      setSelectedStockists(matches);
      setShowAllResults(false);
      setShowSuggestions(results.length > 0);
      setIsLoading(false);
    }
  }, [searchQuery, filterType, sectionData]);

  const handleSuggestionClick = (suggestion) => {
    setIsLoading(true);
    setSearchQuery(suggestion);
    setShowSuggestions(false);

    setTimeout(() => {
      let stockists = [];
      const sugLower = String(suggestion).toLowerCase().trim();
      if (filterType === "stockist") {
        stockists = sectionData.filter((section) => section.title === suggestion);
      } else if (filterType === "company") {
        stockists = sectionData.filter((section) => (section.items || []).some((it) => String(it || "").toLowerCase().trim() === sugLower));
      } else if (filterType === "medicine") {
        stockists = sectionData.filter((section) => section.Medicines && section.Medicines.includes(suggestion));
      }
      setSelectedStockists(stockists);
      setShowAllResults(false);
      setIsLoading(false);
    }, 50);
  };

  const clearResults = () => {
    setSearchQuery("");
    setSelectedStockists([]);
    setShowSuggestions(false);
    setShowAllResults(false);
  };

  const getHealthIcon = (item) => {
    const healthIcons = { cardiovascular: "❤", diabetes: "🩺", pain: "💊", mental: "🧠", pediatric: "👶", emergency: "🚨", chronic: "⚕", preventive: "🛡", oncology: "🎗", respiratory: "🫁", dermatology: "🧴", orthopedic: "🦴", pharmacy: "💊", hospital: "🏥", clinic: "🏥", medical: "⚕", health: "🩺", care: "💊", medicine: "💉", drug: "💊", pharma: "💊", therapeutic: "🩹", surgical: "🔬", diagnostic: "🔬", laboratory: "🧪", radiology: "📷", nutrition: "🍎", wellness: "🌱", fitness: "💪", rehabilitation: "🏃♂" };
    const itemLower = String(item).toLowerCase();
    for (const [key, icon] of Object.entries(healthIcons)) {
      if (itemLower.includes(key)) return icon;
    }
    return "💊";
  };

  const handleToggleCard = (itemId) => setOpenCardId(openCardId === itemId ? null : itemId);

  const renderStockistCard = (item, idx) => {
    const isCardOpen = openCardId === item._id;
    return (
      <View key={item._id || idx} style={[styles.card, isCardOpen && styles.cardActive]}>
        <View style={styles.cardHeader}>
          <LinearGradient colors={["#22d3ee", "#14b8a6"]} style={styles.cardAvatar}>
            <Text style={styles.cardAvatarText}>{item.title?.charAt(0)}</Text>
          </LinearGradient>
          <View style={styles.cardTitleBox}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubtitle}>{item.address}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate(`/stockist/${item._id}`)} style={styles.cardArrow}>
            <Text style={styles.cardArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {filterType === "medicine" && item.Medicines && item.Medicines.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={styles.tagSectionTitle}>AVAILABLE MEDICINES</Text>
            <View style={styles.tagRow}>
              {item.Medicines.slice(0, 10).map((med, i) => {
                const isMatched = searchQuery && med.toLowerCase().includes(searchQuery.toLowerCase());
                return (
                  <View key={i} style={[styles.tag, isMatched && styles.tagMatched]}>
                    <Text style={[styles.tagText, isMatched && styles.tagTextMatched]}>{med}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {filterType === "company" && item.items && item.items.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={styles.tagSectionTitle}>PARTNER COMPANIES</Text>
            <View style={styles.tagRow}>
              {item.items.slice(0, 10).map((comp, i) => {
                const isMatched = searchQuery && comp.toLowerCase().includes(searchQuery.toLowerCase());
                return (
                  <View key={i} style={[styles.tag, isMatched && styles.tagMatched, { flexDirection: "row" }]}>
                    <Text style={{ marginRight: 4 }}>{getHealthIcon(comp)}</Text>
                    <Text style={[styles.tagText, isMatched && styles.tagTextMatched]}>{comp}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.verifiedBox}>
            <View style={styles.verifiedDot} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
          <TouchableOpacity onPress={() => handleToggleCard(item._id)} style={styles.contactBtn}>
            <Text style={styles.contactBtnText}>{isCardOpen ? "Hide Contact" : "Contact Now"}</Text>
          </TouchableOpacity>
        </View>

        {isCardOpen && (
          <View style={styles.contactCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactCardTitleH}>CONTACT DETAILS</Text>
              <Text style={styles.contactCardTitle}>{item.title}</Text>
              <Text style={styles.contactCardSub}>{item.address}</Text>
              <Text style={styles.contactCardPhone}>{item.phone}</Text>
            </View>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone || ""}`)} style={styles.callBtn}>
               <Text style={{ fontSize: 24 }}>📞</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const effectiveLimit = limit || 10;
  const fallbackTotalPages = sectionData && sectionData.length ? Math.ceil(sectionData.length / effectiveLimit) : 0;
  const effectiveTotalPages = totalPages != null ? totalPages : fallbackTotalPages;
  const displayedStockists = (filterType === "stockist" && showAllResults && selectedStockists && selectedStockists.length === 0 && !pageLoading)
    ? (sectionData || []).slice((page - 1) * effectiveLimit, page * effectiveLimit)
    : selectedStockists;

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>M</Text>
        </View>
        <TouchableOpacity style={styles.menuBtn} onPress={() => setIsMenuOpen(true)}>
          <Feather name="menu" size={24} color="#5b21b6" />
        </TouchableOpacity>
      </View>

      {/* Main Search Area */}
      <View style={styles.mainSearchArea}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputBox}>
            <View style={styles.searchIconWrap}>
              <Text style={{ fontSize: 16 }}>🔍</Text>
            </View>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (text === "") {
                  setShowAllResults(true);
                  if (filterType === "stockist") setSelectedStockists(sectionData);
                  // Omitted other auto-refills for brevity
                }
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder={`Search for ${filterType}...`}
              placeholderTextColor="#6b7280"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearResults} style={styles.clearBtn}>
                <Feather name="x" size={16} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterBtn}>
            <Text style={{ fontSize: 24 }}>{filterType === "medicine" ? "💊" : filterType === "company" ? "🏥" : "⚕"}</Text>
          </TouchableOpacity>
        </View>

        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Click suggestion to see detailed results</Text>
            <ScrollView style={{ maxHeight: 250 }}>
              {suggestions.map((sug, i) => (
                <TouchableOpacity key={i} style={styles.sugItem} onPress={() => handleSuggestionClick(sug)}>
                  <View style={styles.sugIconBox}>
                    <Text style={{ color: "#fff" }}>{filterType === "medicine" ? "💊" : filterType === "company" ? "🏥" : "⚕"}</Text>
                  </View>
                  <Text style={styles.sugText} numberOfLines={1}>{sug}</Text>
                  <Feather name="arrow-right" size={16} color="#7c3aed" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Search Results Overlay View (Using a ScrollView absolute overlay) */}
      {(selectedStockists.length > 0 || isLoading) && (
        <ScrollView style={styles.resultsOverlay} contentContainerStyle={styles.resultsOverlayContent}>
          <TouchableOpacity style={styles.closeOverlayBtn} onPress={clearResults}>
             <Feather name="chevron-left" size={24} color="#4b5563" />
             <Text style={styles.closeOverlayText}>Back to Map</Text>
          </TouchableOpacity>

          <View style={styles.resultsHeaderBox}>
             <View style={styles.resultsHeaderLeft}>
                <Text style={{ fontSize: 28 }}>🔍</Text>
                <View style={{ marginLeft: 12 }}>
                   <Text style={styles.resultsHeaderTitle}>Search Results</Text>
                   <Text style={styles.resultsHeaderSub}>{selectedStockists.length} results found</Text>
                </View>
             </View>
          </View>

          {isLoading && <ActivityIndicator size="large" color="#06b6d4" style={{ marginVertical: 40 }} />}

          {displayedStockists.map((s, i) => renderStockistCard(s, i))}
          
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <Modal visible={isMenuOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.menuModalContent}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setIsMenuOpen(false)} style={styles.menuCloseBtn}>
                <Feather name="x" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuOpen(false); navigation.navigate("/"); }}>
              <Text style={styles.menuItemIcon}>🏠</Text>
              <Text style={styles.menuItemText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuOpen(false); navigation.navigate("/saved"); }}>
              <Text style={styles.menuItemIcon}>⭐</Text>
              <Text style={styles.menuItemText}>Saved</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuOpen(false); navigation.navigate("/profile"); }}>
              <Text style={styles.menuItemIcon}>👤</Text>
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showFilterModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.menuModalContent}>
            <Text style={styles.filterTitle}>Select Search Category</Text>
            <TouchableOpacity style={[styles.filterOpt, filterType === "medicine" && styles.filterOptActive]} onPress={() => handleFilterTypeChange("medicine")}>
              <Text style={styles.filterOptIcon}>💊</Text>
              <Text style={[styles.filterOptText, filterType === "medicine" && styles.filterOptTextActive]}>Medicine</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterOpt, filterType === "company" && styles.filterOptActive]} onPress={() => handleFilterTypeChange("company")}>
              <Text style={styles.filterOptIcon}>🏥</Text>
              <Text style={[styles.filterOptText, filterType === "company" && styles.filterOptTextActive]}>Company</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterOpt, filterType === "stockist" && styles.filterOptActive]} onPress={() => handleFilterTypeChange("stockist")}>
              <Text style={styles.filterOptIcon}>⚕</Text>
              <Text style={[styles.filterOptText, filterType === "stockist" && styles.filterOptTextActive]}>Supplier</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.filterCloseBtn}>
              <Text style={styles.filterCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "transparent",
    zIndex: 10,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  logoRow: {
    width: 48,
    height: 48,
    backgroundColor: "#7c3aed",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: { color: "#fff", fontWeight: "bold", fontSize: 24 },
  menuBtn: {
    width: 48,
    height: 48,
    backgroundColor: "#fff",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  mainSearchArea: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#ede9fe",
  },
  searchRow: { flexDirection: "row", alignItems: "stretch", gap: 12 },
  searchInputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f3ff",
    borderRadius: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ddd6fe",
  },
  searchIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  searchInput: { flex: 1, height: 50, fontSize: 16, color: "#1f2937", fontWeight: "600" },
  clearBtn: { padding: 8, backgroundColor: "#ede9fe", borderRadius: 12 },
  filterBtn: {
    width: 60,
    backgroundColor: "#f5f3ff",
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionsContainer: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderColor: "#ddd6fe",
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  suggestionsTitle: {
    padding: 12,
    backgroundColor: "#f5f3ff",
    fontSize: 12,
    fontWeight: "bold",
    color: "#6b7280",
    borderBottomWidth: 1,
    borderColor: "#ede9fe",
  },
  sugItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#f3f4f6",
  },
  sugIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sugText: { flex: 1, fontSize: 16, fontWeight: "bold", color: "#1f2937" },
  resultsOverlay: {
    position: "absolute",
    top: 180,
    left: 16,
    right: 16,
    height: height - 180,
    backgroundColor: "#f8fafc",
    zIndex: 20,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 30,
    elevation: 10,
  },
  resultsOverlayContent: { padding: 16 },
  closeOverlayBtn: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  closeOverlayText: { color: "#4b5563", fontWeight: "bold", fontSize: 16, marginLeft: 8 },
  resultsHeaderBox: {
    backgroundColor: "#a78bfa",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  resultsHeaderLeft: { flexDirection: "row", alignItems: "center" },
  resultsHeaderTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  resultsHeaderSub: { color: "#ede9fe", fontSize: 14, fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardActive: { borderColor: "#22d3ee", borderWidth: 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardAvatarText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  cardTitleBox: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#1e293b", marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: "#64748b" },
  cardArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ecfeff",
    justifyContent: "center",
    alignItems: "center",
  },
  cardArrowText: { color: "#06b6d4", fontSize: 20, fontWeight: "bold" },
  tagSection: { marginBottom: 16 },
  tagSectionTitle: { fontSize: 11, fontWeight: "bold", color: "#64748b", marginBottom: 8 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { backgroundColor: "#f1f5f9", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 4 },
  tagMatched: { backgroundColor: "#f97316" },
  tagText: { color: "#334155", fontSize: 13, fontWeight: "600" },
  tagTextMatched: { color: "#fff" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderColor: "#f1f5f9", paddingTop: 16 },
  verifiedBox: { flexDirection: "row", alignItems: "center" },
  verifiedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e", marginRight: 6 },
  verifiedText: { color: "#16a34a", fontSize: 12, fontWeight: "bold" },
  contactBtn: { backgroundColor: "#06b6d4", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  contactBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  contactCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
  },
  contactCardTitleH: { fontSize: 10, fontWeight: "bold", color: "#64748b", marginBottom: 4 },
  contactCardTitle: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  contactCardSub: { fontSize: 13, color: "#64748b", marginVertical: 4 },
  contactCardPhone: { fontSize: 14, fontWeight: "bold", color: "#0891b2" },
  callBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#06b6d4",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 16 },
  menuModalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  menuHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  menuTitle: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  menuCloseBtn: { padding: 8, backgroundColor: "#f3f4f6", borderRadius: 12 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#f5f3ff",
    borderRadius: 16,
    marginBottom: 12,
  },
  menuItemIcon: { fontSize: 24, marginRight: 16 },
  menuItemText: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  filterTitle: { fontSize: 20, fontWeight: "bold", color: "#111827", textAlign: "center", marginBottom: 24 },
  filterOpt: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f5f3ff",
    marginBottom: 12,
  },
  filterOptActive: { backgroundColor: "#8b5cf6" },
  filterOptIcon: { fontSize: 24, marginRight: 16 },
  filterOptText: { fontSize: 18, fontWeight: "bold", color: "#1f2937" },
  filterOptTextActive: { color: "#fff" },
  filterCloseBtn: { marginTop: 16, padding: 16, backgroundColor: "#e5e7eb", borderRadius: 16, alignItems: "center" },
  filterCloseText: { fontSize: 16, fontWeight: "bold", color: "#374151" },
});


