import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useCallback } from "react";
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
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api";
import BreederNavigation from "../../components/BreederNavigation";

export default function BreederDashboard() {
  const router = useRouter();

  // State management
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState(false);
  const [topVarieties, setTopVarieties] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [userName, setUserName] = useState("");
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Helper to compute initials from breeder name
  const getInitials = (name) => {
    if (!name || typeof name !== "string") return "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Helper for safe numeric display
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

  // Helper to format date into "DD Mon YYYY"
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const day = String(d.getDate()).padStart(2, "0");
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return String(dateStr);
    }
  };

  // Load user profile details from AsyncStorage fallback
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

  // Fetch breeder profile from GET /breeder/profile
  const loadBreederProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await API.get("/breeder/profile");
      if (res.data?.profile) {
        setProfile(res.data.profile);
      }
    } catch (error) {
      // Profile failure falls back to default Breeder name
      console.log("BREEDER PROFILE ERROR:", error.response?.data || error.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Build combined recent activity list from programs, crosses, and trials
  const buildRecentActivity = (programsList, crossesList, trialsList) => {
    const combined = [];

    if (Array.isArray(programsList)) {
      programsList.forEach((p) => {
        combined.push({
          id: `program-${p.id}`,
          type: "Program Created",
          name: p.program_name || "Breeding Program",
          date: p.created_at || p.start_date,
          icon: "🧬",
          route: `/breeder/program-details/${p.id}`,
        });
      });
    }

    if (Array.isArray(crossesList)) {
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
          icon: "🌱",
          route: `/breeder/cross/${c.id}`,
        });
      });
    }

    if (Array.isArray(trialsList)) {
      trialsList.forEach((t) => {
        combined.push({
          id: `trial-${t.id}`,
          type: "Trial Created",
          name: t.trial_name || "Field Trial",
          date: t.created_at || t.start_date,
          icon: "🔬",
          route: `/breeder/trial/${t.id}`,
        });
      });
    }

    // Sort by date descending
    combined.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });

    // Return the latest 5 activities
    return combined.slice(0, 5);
  };

  // Fetch all dashboard data using Promise.allSettled for failure resilience
  const fetchDashboardData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        API.get("/breeder/overview"),
        API.get("/breeder/top-varieties"),
        API.get("/breeder/programs"),
        API.get("/breeder/crosses"),
        API.get("/breeder/trials"),
      ]);

      const [overviewRes, varietiesRes, programsRes, crossesRes, trialsRes] =
        results;

      // Handle Overview
      if (overviewRes.status === "fulfilled") {
        setOverview(overviewRes.value.data?.overview || null);
        setOverviewError(false);
      } else {
        setOverviewError(true);
        console.log(
          "BREEDER OVERVIEW ERROR:",
          overviewRes.reason?.response?.data || overviewRes.reason?.message
        );
      }

      // Handle Top Varieties
      if (varietiesRes.status === "fulfilled") {
        setTopVarieties(varietiesRes.value.data?.varieties || []);
      } else {
        // Failure doesn't break dashboard
        setTopVarieties([]);
        console.log(
          "BREEDER TOP VARIETIES ERROR:",
          varietiesRes.reason?.response?.data || varietiesRes.reason?.message
        );
      }

      // Handle Programs
      let currentPrograms = [];
      if (programsRes.status === "fulfilled") {
        currentPrograms = programsRes.value.data?.programs || [];
      } else {
        console.log(
          "BREEDER PROGRAMS ERROR:",
          programsRes.reason?.response?.data || programsRes.reason?.message
        );
      }

      // Handle Crosses
      let currentCrosses = [];
      if (crossesRes.status === "fulfilled") {
        currentCrosses = crossesRes.value.data?.crosses || [];
      } else {
        console.log(
          "BREEDER CROSSES ERROR:",
          crossesRes.reason?.response?.data || crossesRes.reason?.message
        );
      }

      // Handle Trials
      let currentTrials = [];
      if (trialsRes.status === "fulfilled") {
        currentTrials = trialsRes.value.data?.trials || [];
      } else {
        console.log(
          "BREEDER TRIALS ERROR:",
          trialsRes.reason?.response?.data || trialsRes.reason?.message
        );
      }

      // Calculate recent activities
      const activities = buildRecentActivity(
        currentPrograms,
        currentCrosses,
        currentTrials
      );
      setRecentActivities(activities);
    } catch (err) {
      console.log("DASHBOARD FETCH ERROR:", err.response?.data || err.message);
    }
  }, []);

  // Initial load with session check
  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          router.replace("/login");
          return;
        }
        await Promise.all([
          loadUserData(),
          loadBreederProfile(),
          fetchDashboardData(),
        ]);
      } catch (err) {
        console.log("Session init error:", err);
        router.replace("/login");
        return;
      }
      setInitialLoading(false);
    };
    init();
  }, [fetchDashboardData, router]);

  // Keep breeder greeting in sync when returning from Profile screen
  useFocusEffect(
    useCallback(() => {
      loadUserData();
      loadBreederProfile();
    }, [])
  );

  // Full refresh handler
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await Promise.all([
      loadUserData(),
      loadBreederProfile(),
      fetchDashboardData(),
    ]);
    setRefreshing(false);
  };

  // Logout handler
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
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

  // Safe user & profile values
  const breederName = profile?.breeder_name || userName || "";
  const organizationName = profile?.organization?.trim() || "Breeder";
  const initials = getInitials(breederName);
  const welcomeTitle =
    loadingProfile && !breederName
      ? "Welcome, Breeder"
      : breederName
      ? `Welcome, ${breederName}`
      : "Welcome, Breeder";

  // Check if workspace is brand new (all 0s or missing overview, and no top varieties)
  const isWorkspaceEmpty =
    !initialLoading &&
    !overviewError &&
    formatInt(overview?.total_crops) === 0 &&
    formatInt(overview?.total_varieties) === 0 &&
    formatInt(overview?.total_harvested) === 0 &&
    topVarieties.length === 0;

  // Workflow steps configuration
  const workflowSteps = [
    {
      id: 1,
      stepNum: "1",
      title: "Breeding Program",
      description: "Define breeding objective",
      icon: "🧬",
      route: "/breeder/programs",
    },
    {
      id: 2,
      stepNum: "2",
      title: "Parent Cross",
      description: "Record selected parents",
      icon: "🌱",
      route: "/breeder/crosses",
    },
    {
      id: 3,
      stepNum: "3",
      title: "Field Trial",
      description: "Evaluate candidate material",
      icon: "🔬",
      route: "/breeder/trials",
    },
    {
      id: 4,
      stepNum: "4",
      title: "Observations",
      description: "Record trial measurements",
      icon: "📋",
      route: "/breeder/trials",
    },
    {
      id: 5,
      stepNum: "5",
      title: "Analysis",
      description: "Compare performance",
      icon: "📊",
      route: "/breeder/analytics",
    },
  ];

  // Initial Loading Skeleton / Spinner
  if (initialLoading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading Breeder Dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#2E7D32"]}
            tintColor="#2E7D32"
          />
        }
      >
        {/* 1. HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTopBar}>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>🌿 ZyGENE Breeder Portal</Text>
            </View>

            <View style={styles.headerRightActions}>
              {/* Refresh Button */}
              <TouchableOpacity
                style={styles.iconHeaderButton}
                onPress={handleRefresh}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Refresh dashboard"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={refreshing ? "sync" : "refresh-outline"}
                  size={17}
                  color="#FFFFFF"
                />
                <Text style={styles.headerButtonText}>
                  {refreshing ? "Refreshing..." : "Refresh"}
                </Text>
              </TouchableOpacity>

              {/* Profile Button */}
              <TouchableOpacity
                style={styles.iconHeaderButton}
                onPress={() => router.push("/breeder/profile")}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Open breeder profile"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="person-circle-outline" size={17} color="#FFFFFF" />
                <Text style={styles.headerButtonText}>Profile</Text>
              </TouchableOpacity>

              {/* Logout Button */}
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Logout"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Personalized User Row */}
          <View style={styles.personalizedUserRow}>
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={() => router.push("/breeder/profile")}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="View profile"
            >
              {initials ? (
                <Text style={styles.avatarInitialsText}>{initials}</Text>
              ) : (
                <Ionicons name="person" size={24} color="#1B5E20" />
              )}
            </TouchableOpacity>

            <View style={styles.personalizedTextContainer}>
              <Text style={styles.welcomeTitle} numberOfLines={1}>
                {welcomeTitle}
              </Text>
              <Text style={styles.organizationSubtitle} numberOfLines={1}>
                {organizationName}
              </Text>
            </View>
          </View>

          <Text style={styles.headerCaption}>
            Central control center for breeding programs, parent crosses, trials & analytics
          </Text>
        </View>

        {/* Global Breeder Workspace Navigation Bar */}
        <BreederNavigation activeTab="dashboard" />

        {/* 7. EMPTY / NEW USER EXPERIENCE BANNER */}
        {isWorkspaceEmpty && (
          <View style={styles.newUserBanner}>
            <View style={styles.newUserHeader}>
              <View style={styles.newUserIconWrap}>
                <Ionicons name="sparkles" size={24} color="#2E7D32" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.newUserTitle}>
                  Your breeding workspace is ready.
                </Text>
                <Text style={styles.newUserSubtitle}>
                  Create your first breeding program to start tracking crosses, trials, and observations.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.newUserButton}
              onPress={() => router.push("/breeder/create-program")}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.newUserButtonText}>Create Breeding Program</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. OVERVIEW CARDS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.sectionCaption}>Real-time crop production metrics</Text>
        </View>

        {overviewError ? (
          <View style={styles.errorCard}>
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={22} color="#D32F2F" />
              <View style={styles.errorTextWrap}>
                <Text style={styles.errorTitle}>Unable to load overview</Text>
                <Text style={styles.errorSubtitle}>
                  Could not retrieve crop metrics. Tap retry to reload.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchDashboardData}
              activeOpacity={0.8}
            >
              <Ionicons name="reload" size={15} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.overviewGrid}>
            {/* Total Crops */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBadge, { backgroundColor: "#E8F5E9" }]}>
                <Ionicons name="leaf" size={18} color="#2E7D32" />
              </View>
              <Text style={styles.statNumber}>
                {formatInt(overview?.total_crops)}
              </Text>
              <Text style={styles.statLabel}>Total Crops</Text>
            </View>

            {/* Total Varieties */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBadge, { backgroundColor: "#E3F2FD" }]}>
                <Ionicons name="git-branch" size={18} color="#1565C0" />
              </View>
              <Text style={[styles.statNumber, { color: "#1565C0" }]}>
                {formatInt(overview?.total_varieties)}
              </Text>
              <Text style={styles.statLabel}>Total Varieties</Text>
            </View>

            {/* Total Harvested */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBadge, { backgroundColor: "#FFF3E0" }]}>
                <Ionicons name="basket" size={18} color="#E65100" />
              </View>
              <Text style={[styles.statNumber, { color: "#E65100" }]}>
                {formatInt(overview?.total_harvested)}
              </Text>
              <Text style={styles.statLabel}>Total Harvested</Text>
            </View>

            {/* Average Yield */}
            <View style={styles.statCard}>
              <View style={[styles.statIconBadge, { backgroundColor: "#E0F2F1" }]}>
                <Ionicons name="trending-up" size={18} color="#00695C" />
              </View>
              <Text style={[styles.statNumber, { color: "#00695C" }]}>
                {formatNum(overview?.average_yield, 1)}
              </Text>
              <Text style={styles.statLabel}>Average Yield</Text>
            </View>
          </View>
        )}

        {/* 3. QUICK ACTIONS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionCaption}>Immediate actions & module directory</Text>
        </View>

        {/* Creation Primary Actions */}
        <View style={styles.primaryActionsGrid}>
          {/* + New Breeding Program */}
          <TouchableOpacity
            style={styles.primaryActionCard}
            onPress={() => router.push("/breeder/create-program")}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBadge, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="add" size={20} color="#2E7D32" />
            </View>
            <Text style={styles.primaryActionTitle}>+ New Breeding Program</Text>
            <Text style={styles.primaryActionDesc}>Set crop objectives & start dates</Text>
          </TouchableOpacity>

          {/* + Record Cross */}
          <TouchableOpacity
            style={styles.primaryActionCard}
            onPress={() => router.push("/breeder/create-cross")}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBadge, { backgroundColor: "#EDE7F6" }]}>
              <Ionicons name="git-merge" size={19} color="#5E35B1" />
            </View>
            <Text style={styles.primaryActionTitle}>+ Record Cross</Text>
            <Text style={styles.primaryActionDesc}>Log parent lines & pollination</Text>
          </TouchableOpacity>

          {/* + Create Trial */}
          <TouchableOpacity
            style={styles.primaryActionCard}
            onPress={() => router.push("/breeder/create-trial")}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconBadge, { backgroundColor: "#E0F2F1" }]}>
              <Ionicons name="flask" size={19} color="#00695C" />
            </View>
            <Text style={styles.primaryActionTitle}>+ Create Trial</Text>
            <Text style={styles.primaryActionDesc}>Setup season & trial location</Text>
          </TouchableOpacity>
        </View>

        {/* Navigation Actions (View Programs, View Crosses, View Trials, Analytics) */}
        <View style={styles.secondaryActionsGrid}>
          {/* View Programs */}
          <TouchableOpacity
            style={styles.secondaryActionCard}
            onPress={() => router.push("/breeder/programs")}
            activeOpacity={0.8}
          >
            <Ionicons name="leaf-outline" size={18} color="#2E7D32" />
            <Text style={styles.secondaryActionText}>View Programs</Text>
            <Ionicons name="chevron-forward" size={15} color="#90A4AE" style={{ marginLeft: "auto" }} />
          </TouchableOpacity>

          {/* View Crosses */}
          <TouchableOpacity
            style={styles.secondaryActionCard}
            onPress={() => router.push("/breeder/crosses")}
            activeOpacity={0.8}
          >
            <Ionicons name="git-network-outline" size={18} color="#5E35B1" />
            <Text style={styles.secondaryActionText}>View Crosses</Text>
            <Ionicons name="chevron-forward" size={15} color="#90A4AE" style={{ marginLeft: "auto" }} />
          </TouchableOpacity>

          {/* View Trials */}
          <TouchableOpacity
            style={styles.secondaryActionCard}
            onPress={() => router.push("/breeder/trials")}
            activeOpacity={0.8}
          >
            <Ionicons name="flask-outline" size={18} color="#00695C" />
            <Text style={styles.secondaryActionText}>View Trials</Text>
            <Ionicons name="chevron-forward" size={15} color="#90A4AE" style={{ marginLeft: "auto" }} />
          </TouchableOpacity>

          {/* Analytics */}
          <TouchableOpacity
            style={styles.secondaryActionCard}
            onPress={() => router.push("/breeder/analytics")}
            activeOpacity={0.8}
          >
            <Ionicons name="bar-chart-outline" size={18} color="#1565C0" />
            <Text style={styles.secondaryActionText}>Analytics</Text>
            <Ionicons name="chevron-forward" size={15} color="#90A4AE" style={{ marginLeft: "auto" }} />
          </TouchableOpacity>
        </View>

        {/* 4. BREEDING WORKFLOW SECTION */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Breeding Workflow</Text>
          <Text style={styles.sectionCaption}>Standard research lifecycle pipeline</Text>
        </View>

        <View style={styles.workflowContainer}>
          {workflowSteps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <TouchableOpacity
                style={styles.workflowStepCard}
                onPress={() => router.push(step.route)}
                activeOpacity={0.75}
              >
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>{step.stepNum}</Text>
                </View>

                <View style={styles.stepDetails}>
                  <View style={styles.stepTitleRow}>
                    <Text style={styles.stepIcon}>{step.icon}</Text>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                  </View>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>

                <View style={styles.stepActionIndicator}>
                  <Ionicons name="arrow-forward-circle" size={22} color="#2E7D32" />
                </View>
              </TouchableOpacity>

              {/* Step connector arrow */}
              {idx < workflowSteps.length - 1 && (
                <View style={styles.connectorRow}>
                  <View style={styles.connectorLine} />
                  <Ionicons name="chevron-down" size={14} color="#81C784" />
                  <View style={styles.connectorLine} />
                </View>
              )}
            </React.Fragment>
          ))}
        </View>

        {/* 5. TOP VARIETIES */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Varieties</Text>
          <Text style={styles.sectionCaption}>Genetic trial leaderboards</Text>
        </View>

        {topVarieties.length === 0 ? (
          <View style={styles.emptyNoticeCard}>
            <Ionicons name="ribbon-outline" size={32} color="#A5D6A7" />
            <Text style={styles.emptyNoticeTitle}>
              No variety performance data available yet.
            </Text>
            <Text style={styles.emptyNoticeSub}>
              Data will populate as field trials record yield and disease resistance metrics.
            </Text>
          </View>
        ) : (
          <View style={styles.varietiesListContainer}>
            {topVarieties.slice(0, 3).map((item, index) => {
              const varietyName =
                item.variety || item.variety_name || "Unknown Variety";
              const yieldValue =
                item.yield ?? item.average_yield ?? item.avg_yield ?? null;
              const performanceScore =
                item.performance_score ?? item.score ?? null;

              return (
                <TouchableOpacity
                  key={`top-var-${index}`}
                  style={styles.varietyCard}
                  onPress={() => router.push("/breeder/analytics")}
                  activeOpacity={0.8}
                >
                  <View style={styles.varietyHeaderRow}>
                    <View style={styles.varietyRankBadge}>
                      <Text style={styles.varietyRankText}>#{index + 1}</Text>
                    </View>
                    <View style={styles.varietyNameWrap}>
                      <Text style={styles.varietyNameText} numberOfLines={1}>
                        {varietyName}
                      </Text>
                      <Text style={styles.varietySubtext}>
                        {item.crop_name || "Genetic Variety"}
                      </Text>
                    </View>
                    {performanceScore !== null && (
                      <View style={styles.varietyScoreBadge}>
                        <Text style={styles.varietyScoreNum}>
                          {formatNum(performanceScore, 1)}
                        </Text>
                        <Text style={styles.varietyScoreLabel}>SCORE</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.varietyMetricsRow}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricItemLabel}>Avg Yield</Text>
                      <Text style={styles.metricItemVal}>
                        {yieldValue !== null ? formatNum(yieldValue, 1) : "N/A"}
                      </Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricItemLabel}>Disease %</Text>
                      <Text
                        style={[
                          styles.metricItemVal,
                          {
                            color:
                              Number(
                                item.disease_occurrence_percentage ??
                                  item.disease_percentage ??
                                  0
                              ) > 30
                                ? "#C62828"
                                : "#2E7D32",
                          },
                        ]}
                      >
                        {item.disease_occurrence_percentage !== undefined ||
                        item.disease_percentage !== undefined
                          ? `${formatNum(
                              item.disease_occurrence_percentage ??
                                item.disease_percentage,
                              1
                            )}%`
                          : "N/A"}
                      </Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricItemLabel}>Tested Crops</Text>
                      <Text style={styles.metricItemVal}>
                        {item.crop_count ? formatInt(item.crop_count) : 0}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 6. RECENT ACTIVITY (From existing dashboard data) */}
        {recentActivities.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Work</Text>
              <Text style={styles.sectionCaption}>Latest programs, crosses & trials</Text>
            </View>

            <View style={styles.activityListCard}>
              {recentActivities.map((act, index) => (
                <TouchableOpacity
                  key={act.id}
                  style={[
                    styles.activityItem,
                    index < recentActivities.length - 1 && styles.activityDivider,
                  ]}
                  onPress={() => router.push(act.route)}
                  activeOpacity={0.7}
                >
                  <View style={styles.activityIconCircle}>
                    <Text style={styles.activityEmoji}>{act.icon}</Text>
                  </View>

                  <View style={styles.activityDetails}>
                    <Text style={styles.activityType}>{act.type}</Text>
                    <Text style={styles.activityName} numberOfLines={1}>
                      {act.name}
                    </Text>
                    <Text style={styles.activityDate}>{formatDate(act.date)}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#CFD8DC" />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Bottom Session Logout Button */}
        <View style={styles.bottomSessionContainer}>
          <TouchableOpacity
            style={styles.bottomLogoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color="#D32F2F" />
            <Text style={styles.bottomLogoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1B5E20",
  },

  container: {
    flex: 1,
    backgroundColor: "#F5F8F5",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F8F5",
  },

  loadingText: {
    marginTop: 12,
    color: "#2E7D32",
    fontSize: 15,
    fontWeight: "600",
  },

  /* 1. Header Styles */
  header: {
    backgroundColor: "#1B5E20",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  headerTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    flexWrap: "wrap",
    gap: 8,
  },

  badgeContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  iconHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },

  headerButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  logoutButton: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    padding: 6,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  personalizedUserRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#C8E6C9",
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },

  avatarInitialsText: {
    color: "#1B5E20",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  personalizedTextContainer: {
    flex: 1,
    justifyContent: "center",
  },

  welcomeTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  organizationSubtitle: {
    color: "#D7F0D8",
    fontSize: 13.5,
    fontWeight: "600",
    marginTop: 2,
  },

  headerCaption: {
    color: "#A5D6A7",
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },

  /* Section Header */
  sectionHeader: {
    marginBottom: 10,
    marginTop: 10,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1B5E20",
  },

  sectionCaption: {
    fontSize: 11.5,
    color: "#607D8B",
    marginTop: 1,
  },

  /* 7. New User Workspace Banner */
  newUserBanner: {
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#A5D6A7",
  },

  newUserHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },

  newUserIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#C8E6C9",
    justifyContent: "center",
    alignItems: "center",
  },

  newUserTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1B5E20",
  },

  newUserSubtitle: {
    fontSize: 12.5,
    color: "#2E7D32",
    marginTop: 4,
    lineHeight: 17,
  },

  newUserButton: {
    backgroundColor: "#2E7D32",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },

  newUserButtonText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
  },

  /* 2. Overview Grid & Error */
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8ECE8",
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
    }),
  },

  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  statNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2E7D32",
  },

  statLabel: {
    color: "#607D8B",
    marginTop: 4,
    fontSize: 11.5,
    fontWeight: "600",
  },

  errorCard: {
    backgroundColor: "#FFEBEE",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },

  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  errorTextWrap: {
    flex: 1,
  },

  errorTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#C62828",
  },

  errorSubtitle: {
    fontSize: 12,
    color: "#D32F2F",
    marginTop: 2,
  },

  retryButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#C62828",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  /* 3. Quick Actions Styles */
  primaryActionsGrid: {
    gap: 10,
    marginBottom: 12,
  },

  primaryActionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8ECE8",
    flexDirection: "row",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  actionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  primaryActionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#263238",
    flex: 1,
  },

  primaryActionDesc: {
    fontSize: 11,
    color: "#78909C",
    marginTop: 2,
    position: "absolute",
    left: 64,
    bottom: 12,
  },

  secondaryActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 8,
  },

  secondaryActionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E8ECE8",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  secondaryActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#37474F",
  },

  /* 4. Breeding Workflow Pipeline */
  workflowContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8ECE8",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  workflowStepCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#F9FBF9",
    borderWidth: 1,
    borderColor: "#E8F0E8",
  },

  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  stepDetails: {
    flex: 1,
  },

  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  stepIcon: {
    fontSize: 15,
  },

  stepTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#263238",
  },

  stepDescription: {
    fontSize: 11.5,
    color: "#607D8B",
    marginTop: 2,
  },

  stepActionIndicator: {
    marginLeft: 8,
  },

  connectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 8,
  },

  connectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },

  /* 5. Top Varieties Styles */
  emptyNoticeCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 14,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8ECE8",
  },

  emptyNoticeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#37474F",
    marginTop: 8,
    textAlign: "center",
  },

  emptyNoticeSub: {
    fontSize: 12,
    color: "#78909C",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },

  varietiesListContainer: {
    gap: 10,
    marginBottom: 16,
  },

  varietyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8ECE8",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  varietyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  varietyRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFF8E1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#FFE082",
  },

  varietyRankText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#F57F17",
  },

  varietyNameWrap: {
    flex: 1,
  },

  varietyNameText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1B5E20",
  },

  varietySubtext: {
    fontSize: 11,
    color: "#78909C",
    marginTop: 1,
  },

  varietyScoreBadge: {
    backgroundColor: "#E8F5E9",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },

  varietyScoreNum: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2E7D32",
  },

  varietyScoreLabel: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#388E3C",
  },

  varietyMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F9FBF9",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#EDF2ED",
  },

  metricItem: {
    alignItems: "center",
    flex: 1,
  },

  metricItemLabel: {
    fontSize: 10.5,
    color: "#78909C",
    fontWeight: "600",
  },

  metricItemVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#263238",
    marginTop: 2,
  },

  /* 6. Recent Work Styles */
  activityListCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8ECE8",
  },

  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  activityDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F0",
  },

  activityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F8F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  activityEmoji: {
    fontSize: 18,
  },

  activityDetails: {
    flex: 1,
    paddingRight: 8,
  },

  activityType: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2E7D32",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  activityName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#263238",
    marginTop: 1,
  },

  activityDate: {
    fontSize: 10.5,
    color: "#90A4AE",
    marginTop: 2,
    fontWeight: "500",
  },

  /* Bottom Session Logout Button */
  bottomSessionContainer: {
    marginTop: 16,
    marginBottom: 8,
    alignItems: "center",
  },

  bottomLogoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: "#FFEBEE",
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },

  bottomLogoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#D32F2F",
  },
});