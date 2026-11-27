import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  Platform,
  Animated,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api";
import FarmerHeader from "../../components/ui/FarmerHeader";
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from "../../constants/theme";

export default function BreederDashboard() {
  const router = useRouter();

  // State management
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState(false);
  const [topVarieties, setTopVarieties] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [programsCount, setProgramsCount] = useState(0);
  const [crossesCount, setCrossesCount] = useState(0);
  const [trialsCount, setTrialsCount] = useState(0);

  const [userName, setUserName] = useState("");
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Helper to compute initials from breeder name
  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "BR";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "BR";
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Safe formatting helpers
  const formatNum = (val, decimals = 1) => {
    if (val === null || val === undefined || val === "") return "0.0";
    const num = Number(val);
    if (isNaN(num)) return "0.0";
    return Number.isInteger(num) ? String(num) : num.toFixed(decimals);
  };

  const formatInt = (val) => {
    if (val === null || val === undefined || val === "") return 0;
    const num = Number(val);
    if (isNaN(num)) return 0;
    return Math.round(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Recent";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const day = String(d.getDate()).padStart(2, "0");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return String(dateStr);
    }
  };

  // Load user profile details
  const loadUserData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUserName(parsed.name || parsed.username || "");
      }
    } catch (e) {
      console.log("Error loading user profile info:", e.message);
    }
  };

  const loadBreederProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await API.get("/breeder/profile");
      if (res.data?.profile) {
        setProfile(res.data.profile);
      }
    } catch (error) {
      console.log("BREEDER PROFILE ERROR:", error.response?.data || error.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  const buildRecentActivity = (programsList, crossesList, trialsList) => {
    const combined = [];

    if (Array.isArray(programsList)) {
      setProgramsCount(programsList.length);
      programsList.forEach((p) => {
        combined.push({
          id: `program-${p.id}`,
          type: "Program Created",
          name: p.program_name || "Breeding Program",
          date: p.created_at || p.start_date,
          icon: "leaf-outline",
          route: `/breeder/program-details/${p.id}`,
        });
      });
    }

    if (Array.isArray(crossesList)) {
      setCrossesCount(crossesList.length);
      crossesList.forEach((c) => {
        const crossName = c.cross_code
          ? c.cross_code
          : c.parent_1 && c.parent_2
          ? `${c.parent_1} × ${c.parent_2}`
          : "Breeding Cross";
        combined.push({
          id: `cross-${c.id}`,
          type: "Cross Created",
          name: crossName,
          date: c.created_at || c.cross_date,
          icon: "git-merge-outline",
          route: `/breeder/cross/${c.id}`,
        });
      });
    }

    if (Array.isArray(trialsList)) {
      setTrialsCount(trialsList.length);
      trialsList.forEach((t) => {
        combined.push({
          id: `trial-${t.id}`,
          type: "Trial Created",
          name: t.trial_name || "Field Trial",
          date: t.created_at || t.start_date,
          icon: "flask-outline",
          route: `/breeder/trial/${t.id}`,
        });
      });
    }

    combined.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });

    return combined.slice(0, 4);
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        API.get("/breeder/overview"),
        API.get("/breeder/top-varieties"),
        API.get("/breeder/programs"),
        API.get("/breeder/crosses"),
        API.get("/breeder/trials"),
      ]);

      const [overviewRes, varietiesRes, programsRes, crossesRes, trialsRes] = results;

      if (overviewRes.status === "fulfilled") {
        setOverview(overviewRes.value.data?.overview || null);
        setOverviewError(false);
      } else {
        setOverviewError(true);
      }

      if (varietiesRes.status === "fulfilled") {
        setTopVarieties(varietiesRes.value.data?.varieties || []);
      } else {
        setTopVarieties([]);
      }

      const currentPrograms = programsRes.status === "fulfilled" ? programsRes.value.data?.programs || [] : [];
      const currentCrosses = crossesRes.status === "fulfilled" ? crossesRes.value.data?.crosses || [] : [];
      const currentTrials = trialsRes.status === "fulfilled" ? trialsRes.value.data?.trials || [] : [];

      const activities = buildRecentActivity(currentPrograms, currentCrosses, currentTrials);
      setRecentActivities(activities);
    } catch (err) {
      console.log("BREEDER DASHBOARD FETCH ERROR:", err.message);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          router.replace("/login");
          return;
        }
        await Promise.all([loadUserData(), loadBreederProfile(), fetchDashboardData()]);
      } catch (err) {
        console.log("Session init error:", err);
        router.replace("/login");
        return;
      }
      setInitialLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    };
    init();
  }, [fetchDashboardData, router, fadeAnim]);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      loadBreederProfile();
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await Promise.all([loadUserData(), loadBreederProfile(), fetchDashboardData()]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove(["token", "user"]);
          } catch (err) {
            console.log("Logout error:", err.message);
          } finally {
            router.replace("/login");
          }
        },
      },
    ]);
  };

  const breederName = profile?.breeder_name || userName || "Breeder";
  const organizationName = profile?.organization?.trim() || "Genetic Research";
  const initials = getInitials(breederName);

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color={COLORS.primary || "#1B5E20"} />
        <Text style={styles.loadingText}>Loading Breeder Workspace...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER: Exactly matches FarmerHeader design system */}
      <FarmerHeader
        title="ZYGENE"
        subtitle="Breeder Workspace"
        rightAction={
          <View style={styles.headerRightRow}>
            <TouchableOpacity
              style={styles.profileBadge}
              onPress={() => router.push("/breeder/profile")}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="View breeder profile"
            >
              <Text style={styles.profileInitials}>{initials}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerLogoutBtn}
              onPress={handleLogout}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            >
              <Ionicons name="log-out-outline" size={19} color="#64748B" />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary || "#1B5E20"]}
            tintColor={COLORS.primary || "#1B5E20"}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* WORKSPACE STATUS BANNER (Matching Farmer Dashboard sync/status banner) */}
          <View style={styles.statusBanner}>
            <View style={styles.statusBannerLeft}>
              <View style={styles.pulseDot} />
              <View>
                <Text style={styles.statusBannerTitle}>Breeder Intelligence Active</Text>
                <Text style={styles.statusBannerSub}>
                  {organizationName} · {breederName}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.refreshBadgeBtn}
              onPress={handleRefresh}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={refreshing ? "sync" : "refresh-outline"}
                size={16}
                color={COLORS.primary || "#1B5E20"}
              />
            </TouchableOpacity>
          </View>

          {/* 1. RESEARCH OVERVIEW (2x2 Grid exactly matching Farmer Dashboard) */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Research Overview</Text>
          </View>

          <View style={styles.overviewGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {String(formatInt(overview?.total_crops)).padStart(2, "0")}
              </Text>
              <Text style={styles.statLabel}>Total Crops</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: "#0284C7" }]}>
                {String(formatInt(overview?.total_varieties)).padStart(2, "0")}
              </Text>
              <Text style={styles.statLabel}>Varieties</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: "#D97706" }]}>
                {String(formatInt(overview?.total_harvested)).padStart(2, "0")}
              </Text>
              <Text style={styles.statLabel}>Harvested</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: "#15803D" }]}>
                {formatNum(overview?.average_yield, 1)}
              </Text>
              <Text style={styles.statLabel}>Avg Yield</Text>
            </View>
          </View>

          {/* 2. PRIMARY CREATION HERO ACTIONS (Matching Farmer Dashboard + Add Field / + Add Crop) */}
          <View style={styles.heroActionsRow}>
            {/* + New Program */}
            <TouchableOpacity
              style={styles.heroActionCard}
              onPress={() => router.push("/breeder/create-program")}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel="Create breeding program"
            >
              <View style={[styles.heroIconBadge, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="leaf" size={18} color="#15803D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroActionTitle}>+ Program</Text>
                <Text style={styles.heroActionSub}>Objective & dates</Text>
              </View>
            </TouchableOpacity>

            {/* + Record Cross */}
            <TouchableOpacity
              style={styles.heroActionCard}
              onPress={() => router.push("/breeder/create-cross")}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel="Record cross"
            >
              <View style={[styles.heroIconBadge, { backgroundColor: "#EDE7F6" }]}>
                <Ionicons name="git-merge" size={18} color="#6D28D9" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroActionTitle}>+ Cross</Text>
                <Text style={styles.heroActionSub}>Parents & code</Text>
              </View>
            </TouchableOpacity>

            {/* + Create Trial */}
            <TouchableOpacity
              style={styles.heroActionCard}
              onPress={() => router.push("/breeder/create-trial")}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel="Create trial"
            >
              <View style={[styles.heroIconBadge, { backgroundColor: "#E0F2FE" }]}>
                <Ionicons name="flask" size={18} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroActionTitle}>+ Trial</Text>
                <Text style={styles.heroActionSub}>Field evaluation</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* 3. BREEDING MODULES DIRECTORY (Clean vertical cards with chevron navigation) */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Breeding Modules</Text>
          </View>

          <View style={styles.modulesCard}>
            {/* Programs */}
            <TouchableOpacity
              style={styles.moduleItem}
              onPress={() => router.push("/breeder/programs")}
              activeOpacity={0.7}
            >
              <View style={[styles.moduleIconBox, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="leaf-outline" size={20} color="#15803D" />
              </View>
              <View style={styles.moduleTextBox}>
                <Text style={styles.moduleTitle}>Breeding Programs</Text>
                <Text style={styles.moduleSub}>
                  {programsCount > 0 ? `${programsCount} programs tracked` : "Define breeding goals & varieties"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Crosses */}
            <TouchableOpacity
              style={styles.moduleItem}
              onPress={() => router.push("/breeder/crosses")}
              activeOpacity={0.7}
            >
              <View style={[styles.moduleIconBox, { backgroundColor: "#EDE7F6" }]}>
                <Ionicons name="git-network-outline" size={20} color="#6D28D9" />
              </View>
              <View style={styles.moduleTextBox}>
                <Text style={styles.moduleTitle}>Parent Crosses</Text>
                <Text style={styles.moduleSub}>
                  {crossesCount > 0 ? `${crossesCount} crosses recorded` : "Parent lines, generations & pedigrees"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Trials */}
            <TouchableOpacity
              style={styles.moduleItem}
              onPress={() => router.push("/breeder/trials")}
              activeOpacity={0.7}
            >
              <View style={[styles.moduleIconBox, { backgroundColor: "#E0F2FE" }]}>
                <Ionicons name="flask-outline" size={20} color="#0284C7" />
              </View>
              <View style={styles.moduleTextBox}>
                <Text style={styles.moduleTitle}>Field Trials & Observations</Text>
                <Text style={styles.moduleSub}>
                  {trialsCount > 0 ? `${trialsCount} active field trials` : "Field plot seasons & trait evaluations"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Analytics */}
            <TouchableOpacity
              style={[styles.moduleItem, { borderBottomWidth: 0 }]}
              onPress={() => router.push("/breeder/analytics")}
              activeOpacity={0.7}
            >
              <View style={[styles.moduleIconBox, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="bar-chart-outline" size={20} color="#B45309" />
              </View>
              <View style={styles.moduleTextBox}>
                <Text style={styles.moduleTitle}>Genetic Analytics & Performance</Text>
                <Text style={styles.moduleSub}>Yield curves, disease resistance & traits</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* 4. TOP VARIETIES (Vertical Leaderboard Cards) */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Top Performing Varieties</Text>
            {topVarieties.length > 0 && (
              <TouchableOpacity onPress={() => router.push("/breeder/analytics")}>
                <Text style={styles.viewAllText}>Analytics →</Text>
              </TouchableOpacity>
            )}
          </View>

          {topVarieties.length === 0 ? (
            <View style={styles.emptyNoticeCard}>
              <Ionicons name="ribbon-outline" size={26} color="#94A3B8" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyNoticeTitle}>No variety leaderboard data</Text>
                <Text style={styles.emptyNoticeSub}>
                  Performance data will calculate as trials log observations and harvest metrics.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.varietiesListContainer}>
              {topVarieties.slice(0, 3).map((item, index) => {
                const varietyName = item.variety || item.variety_name || "Unknown Variety";
                const yieldValue = item.yield ?? item.average_yield ?? item.avg_yield ?? null;
                const score = item.performance_score ?? item.score ?? null;

                return (
                  <TouchableOpacity
                    key={`top-var-${index}`}
                    style={styles.varietyCard}
                    onPress={() => router.push("/breeder/analytics")}
                    activeOpacity={0.75}
                  >
                    <View style={styles.varietyHeaderRow}>
                      <View style={styles.varietyRankBadge}>
                        <Text style={styles.varietyRankText}>#{index + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.varietyNameText} numberOfLines={1}>
                          {varietyName}
                        </Text>
                        <Text style={styles.varietyCropText}>
                          {item.crop_name || "Genetic Variety"}
                        </Text>
                      </View>
                      {score !== null && (
                        <View style={styles.scoreBadge}>
                          <Text style={styles.scoreText}>{formatNum(score, 1)} SCORE</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.varietyMetricsRow}>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Avg Yield</Text>
                        <Text style={styles.metricVal}>
                          {yieldValue !== null ? `${formatNum(yieldValue, 1)} kg` : "--"}
                        </Text>
                      </View>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Disease Rate</Text>
                        <Text
                          style={[
                            styles.metricVal,
                            {
                              color:
                                Number(item.disease_occurrence_percentage ?? item.disease_percentage ?? 0) > 30
                                  ? "#DC2626"
                                  : "#15803D",
                            },
                          ]}
                        >
                          {item.disease_occurrence_percentage !== undefined || item.disease_percentage !== undefined
                            ? `${formatNum(item.disease_occurrence_percentage ?? item.disease_percentage, 1)}%`
                            : "--"}
                        </Text>
                      </View>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Tested Crops</Text>
                        <Text style={styles.metricVal}>{formatInt(item.crop_count)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* 5. RECENT WORK (Vertical List Cards matching Farmer Activity) */}
          {recentActivities.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Research Work</Text>
              </View>

              <View style={styles.activityCard}>
                {recentActivities.map((act, index) => (
                  <TouchableOpacity
                    key={act.id}
                    style={[
                      styles.activityRow,
                      index < recentActivities.length - 1 && styles.activityDivider,
                    ]}
                    onPress={() => router.push(act.route)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.activityIconCircle}>
                      <Ionicons name={act.icon} size={17} color={COLORS.primary || "#1B5E20"} />
                    </View>

                    <View style={styles.activityTextWrap}>
                      <Text style={styles.activityName} numberOfLines={1}>
                        {act.name}
                      </Text>
                      <Text style={styles.activityMeta}>
                        {act.type} • {formatDate(act.date)}
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* 6. SWITCH WORKSPACE OR MANAGE ACCOUNT */}
          <View style={styles.footerSessionRow}>
            <TouchableOpacity
              style={styles.switchWorkspaceBtn}
              onPress={() => router.push("/farmer/dashboard")}
              activeOpacity={0.8}
            >
              <Ionicons name="swap-horizontal" size={16} color={COLORS.primary || "#1B5E20"} />
              <Text style={styles.switchWorkspaceText}>Switch to Farmer Workspace</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutFooterBtn}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={16} color="#DC2626" />
              <Text style={styles.logoutFooterText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAF8",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAF8",
  },
  loadingText: {
    marginTop: 12,
    color: "#1B5E20",
    fontSize: 14.5,
    fontWeight: "600",
  },

  /* Header Custom Actions */
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  profileBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1B5E20",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitials: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  headerLogoutBtn: {
    padding: 4,
  },

  /* Status Banner */
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  statusBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#15803D",
    marginRight: 10,
  },
  statusBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803D",
  },
  statusBannerSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  refreshBadgeBtn: {
    padding: 4,
  },

  /* Section Headers */
  sectionHeader: {
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.primary || "#1B5E20",
  },

  /* 1. Overview Grid (2x2) */
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
      },
    }),
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },

  /* 2. Hero Actions Row */
  heroActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  heroActionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
      },
    }),
  },
  heroIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  heroActionTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  heroActionSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },

  /* 3. Modules Directory Card */
  modulesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
      },
    }),
  },
  moduleItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  moduleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  moduleTextBox: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  moduleSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },

  /* 4. Top Varieties */
  emptyNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 16,
  },
  emptyNoticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptyNoticeSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  varietiesListContainer: {
    marginBottom: 16,
  },
  varietyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 13,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
      },
    }),
  },
  varietyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  varietyRankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  varietyRankText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
  },
  varietyNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  varietyCropText: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  scoreBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  scoreText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
  },
  varietyMetricsRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAF8",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: "space-between",
  },
  metricCol: {
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "500",
  },
  metricVal: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },

  /* 5. Recent Activity */
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 16,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  activityDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  activityIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  activityTextWrap: {
    flex: 1,
  },
  activityName: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#0F172A",
  },
  activityMeta: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },

  /* 6. Footer Session */
  footerSessionRow: {
    marginTop: 8,
    marginBottom: 16,
    gap: 10,
  },
  switchWorkspaceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  switchWorkspaceText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary || "#1B5E20",
  },
  logoutFooterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  logoutFooterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
  },
});
