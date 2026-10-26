import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  StatusBar,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import API from "../../services/api";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from "../../constants/theme";
import FarmerHeader from "../../components/ui/FarmerHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import ErrorState from "../../components/ErrorState";
import FarmerBottomTabs from "../../components/FarmerBottomTabs";
import FarmerDrawer from "../../components/FarmerDrawer";
import CropLifecycleProgress from "../../components/ui/CropLifecycleProgress";
import NotificationBadge from "../../components/farmer/NotificationBadge";
import AttentionCard from "../../components/farmer/AttentionCard";
import { fetchFarmerNotifications } from "../../utils/farmerNotifications";
import { useFocusEffect } from "expo-router";

export default function FarmerDashboard() {
  const [farmerName, setFarmerName] = useState("Farmer");
  const [fields, setFields] = useState([]);
  const [crops, setCrops] = useState([]);
  const [error, setError] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const [notifications, setNotifications] = useState([]);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const [fieldsResponse, cropsResponse, notifs] = await Promise.all([
        API.get("/fields"),
        API.get("/crops"),
        fetchFarmerNotifications()
      ]);

      setFields(fieldsResponse.data?.fields || []);
      setCrops(cropsResponse.data?.crops || []);
      setNotifications(notifs || []);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.log("DASHBOARD ERROR:", err.response?.data || err.message);
      setError(
        err.response?.data?.message ||
          "Unable to load farm data. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAndLoad = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const userStr = await AsyncStorage.getItem("user");

        if (!token) {
          router.replace("/login");
          return;
        }

        if (userStr) {
          try {
            const parsed = JSON.parse(userStr);
            const name = parsed.farmer_name || parsed.name || parsed.username;
            if (name) setFarmerName(name);
          } catch {
            // ignore JSON parse err
          }
        }

        await loadDashboard();
      } catch (err) {
        console.log("Farmer session check error:", err);
        router.replace("/login");
      }
    };
    checkAndLoad();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Refresh notifications on screen focus to update unread count
      if (!loading && !refreshing) {
        fetchFarmerNotifications().then(setNotifications).catch(() => {});
      }
    }, [loading, refreshing])
  );

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadDashboard();
    } catch (err) {
      console.log("Farmer refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const stats = useMemo(() => {
    const totalFields = fields.length;
    const totalCrops = crops.length;
    const activeCrops = crops.filter(
      (c) => (c.crop_status || "").toLowerCase() !== "harvested"
    ).length;
    const harvestedCrops = crops.filter(
      (c) => (c.crop_status || "").toLowerCase() === "harvested"
    ).length;

    return { totalFields, totalCrops, activeCrops, harvestedCrops };
  }, [fields, crops]);

  const statusDistribution = useMemo(() => {
    const distribution = {};
    crops.forEach((c) => {
      if ((c.crop_status || "").toLowerCase() !== "harvested") {
        const stage = c.current_stage || "Vegetative";
        const normalized = stage.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
        distribution[normalized] = (distribution[normalized] || 0) + 1;
      }
    });
    return Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  }, [crops]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading farm control center...</Text>
        </View>
        <FarmerBottomTabs activeTab="home" />
      </SafeAreaView>
    );
  }

  if (error && !refreshing && fields.length === 0 && crops.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <View style={styles.centerContainer}>
          <ErrorState
            title="Dashboard Unavailable"
            message={error}
            onRetry={loadDashboard}
          />
        </View>
        <FarmerBottomTabs activeTab="home" />
      </SafeAreaView>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <FarmerHeader
        title={`Good morning, ${farmerName}`}
        subtitle="Here's your farm overview"
        showDrawer={true}
        onOpenDrawer={() => setDrawerOpen(true)}
        rightAction={<NotificationBadge count={unreadCount} onPress={() => router.push("/farmer/notifications")} />}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

        {/* FARM OVERVIEW - QUICK STATISTICS */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Farm Overview</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>
              {String(stats.totalFields).padStart(2, "0")}
            </Text>
            <Text style={styles.statCardLabel}>Fields</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>
              {String(stats.activeCrops).padStart(2, "0")}
            </Text>
            <Text style={styles.statCardLabel}>Active Crops</Text>
          </View>
        </View>

        {/* NEEDS ATTENTION */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderBetween}>
            <Text style={styles.sectionTitle}>Needs Attention</Text>
            {notifications.length > 0 && (
              <TouchableOpacity onPress={() => router.push("/farmer/notifications")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.sectionActionText}>View all →</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {(() => {
            const attentionItems = notifications.filter(n => n.type === "ATTENTION").slice(0, 2);
            const activityCount = notifications.filter(n => n.type === "ACTIVITY").length;
            
            if (attentionItems.length === 0 && activityCount === 0) {
              return (
                <View style={styles.emptyAttentionCard}>
                  <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.emptyAttentionText}>Everything looks up to date</Text>
                </View>
              );
            }

            return (
              <View>
                {attentionItems.map(item => (
                  <AttentionCard 
                    key={item.id} 
                    item={item} 
                    onPress={() => item.route && router.push(item.route)} 
                  />
                ))}
                {activityCount > 0 && (
                  <TouchableOpacity 
                    style={styles.activitySummaryCard}
                    onPress={() => router.push("/farmer/notifications")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
                    <Text style={styles.activitySummaryText}>{activityCount} recent crop {activityCount === 1 ? "update" : "updates"}</Text>
                    <View style={{ flex: 1 }} />
                    <Ionicons name="chevron-forward" size={16} color={COLORS.borderDark} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}
        </View>

        {fields.length === 0 && crops.length === 0 ? (
          <View style={styles.emptyOnboardContainer}>
            <Text style={styles.emptyOnboardTitle}>Your farm workspace is ready</Text>
            <Text style={styles.emptyOnboardSubtitle}>
              Start by creating your first field, then add crops to begin tracking their lifecycle.
            </Text>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => router.push("/farmer/create-field")}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryActionText}>Create Field</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => router.push("/farmer/create-crop")}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryActionText}>Create Crop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ACTIVE CROPS SECTION */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderBetween}>
                <Text style={styles.sectionTitle}>Active Crops</Text>
                {crops.length > 0 && (
                  <TouchableOpacity
                    onPress={() => router.push("/farmer/crops")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.sectionActionText}>View all →</Text>
                  </TouchableOpacity>
                )}
              </View>

              {crops.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No active crops</Text>
                  <TouchableOpacity
                    style={styles.emptyActionButton}
                    onPress={() => router.push("/farmer/create-crop")}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptyActionText}>Add Crop</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                crops
                  .filter((c) => (c.crop_status || "").toLowerCase() !== "harvested")
                  .slice(0, 3)
                  .map((crop) => {
                    const stage = crop.current_stage || "Vegetative";
                    const sownDateStr = crop.sowing_date ? new Date(crop.sowing_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "Recorded";

                    return (
                      <TouchableOpacity
                         key={crop.id}
                         style={styles.cropCardRow}
                         onPress={() => router.push(`/farmer/crop-details/${crop.id}`)}
                         activeOpacity={0.7}
                       >
                         <View style={styles.cropCardLeft}>
                           <Text style={styles.cropName}>{crop.crop_name || "Unnamed Crop"}</Text>
                           <Text style={styles.cropVariety}>{crop.variety || "Standard Variety"} • {crop.field_name || "Unassigned"}</Text>
                           <Text style={styles.cropStageText}>{stage.replace("_", " ")}</Text>
                           <Text style={styles.cropSownText}>Sown {sownDateStr}</Text>
                         </View>
                         <View style={styles.cropCardRight}>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.borderDark} />
                         </View>
                       </TouchableOpacity>
                    );
                  })
              )}
            </View>

            {/* CROP STATUS DISTRIBUTION */}
            {statusDistribution.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitleSmall}>Crop Status</Text>
                <View style={styles.distributionCard}>
                  {statusDistribution.map(([stage, count], idx) => (
                    <View key={stage} style={[styles.distRow, idx < statusDistribution.length - 1 && styles.distRowBorder]}>
                      <Text style={styles.distLabel}>{stage}</Text>
                      <Text style={styles.distCount}>{count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* QUICK ACTIONS */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitleSmall}>Quick Actions</Text>
              <View style={styles.quickActionsContainer}>
                <TouchableOpacity
                  style={[styles.quickActionRow, styles.quickActionBorder]}
                  onPress={() => router.push("/farmer/create-crop")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={20} color={COLORS.primary} style={styles.qaIcon} />
                  <Text style={styles.qaText}>Create Crop</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionRow, styles.quickActionBorder]}
                  onPress={() => router.push("/farmer/create-field")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={20} color={COLORS.primary} style={styles.qaIcon} />
                  <Text style={styles.qaText}>Create Field</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionRow, styles.quickActionBorder]}
                  onPress={() => router.push("/farmer/field-work")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text-outline" size={20} color={COLORS.primary} style={styles.qaIcon} />
                  <Text style={styles.qaText}>Field Work</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionRow, styles.quickActionBorder]}
                  onPress={() => router.push("/farmer/crops")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="leaf-outline" size={20} color={COLORS.textSecondary} style={styles.qaIcon} />
                  <Text style={styles.qaText}>View Crops</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickActionRow}
                  onPress={() => router.push("/farmer/fields")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="map-outline" size={20} color={COLORS.textSecondary} style={styles.qaIcon} />
                  <Text style={styles.qaText}>View Fields</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
        </Animated.View>
      </ScrollView>

      {/* Drawer */}
      <FarmerDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        farmerName={farmerName}
      />

      {/* 4-Tab Bottom Navigation */}
      <FarmerBottomTabs activeTab="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    ...TYPOGRAPHY.supporting,
    marginTop: SPACING.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  scrollContainer: {
    paddingHorizontal: SPACING.lg, // 20px
    paddingTop: SPACING.base,
    paddingBottom: 32,
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
  },
  sectionHeaderRow: {
    marginBottom: SPACING.sm,
  },
  sectionHeaderBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  sectionTitleSmall: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  sectionActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  statsGrid: {
    flexDirection: "row",
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    marginRight: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOWS.subtle,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  statCardLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sectionBlock: {
    marginBottom: SPACING.xl,
  },
  emptyOnboardContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  emptyOnboardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyOnboardSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  primaryActionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    width: "100%",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.surface,
  },
  secondaryActionBtn: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    width: "100%",
    alignItems: "center",
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  emptyContainer: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginBottom: SPACING.base,
  },
  emptyActionButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  cropCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: 10,
    ...SHADOWS.subtle,
  },
  cropCardLeft: {
    flex: 1,
  },
  cropName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  cropVariety: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  cropStageText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primaryDark,
    marginBottom: 2,
  },
  cropSownText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  cropCardRight: {
    paddingLeft: SPACING.md,
  },
  distributionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  distRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: SPACING.md,
  },
  distRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  distLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  distCount: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  quickActionsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  quickActionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
  },
  quickActionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  qaIcon: {
    marginRight: 12,
  },
  qaText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  emptyAttentionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderStyle: "dashed",
  },
  emptyAttentionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  activitySummaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  activitySummaryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
});