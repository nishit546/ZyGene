import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  StatusBar,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import API from "../../services/api";
import { COLORS } from "../../constants/theme";
import FarmerHeader from "../../components/ui/FarmerHeader";
import ErrorState from "../../components/ErrorState";
import FarmerBottomTabs from "../../components/FarmerBottomTabs";
import FarmerDrawer from "../../components/FarmerDrawer";
import NotificationBadge from "../../components/farmer/NotificationBadge";
import AttentionCard from "../../components/farmer/AttentionCard";
import { fetchFarmerNotifications } from "../../utils/farmerNotifications";

export default function FarmerDashboard() {
  const [farmerName, setFarmerName] = useState("Farmer");
  const [fields, setFields] = useState([]);
  const [crops, setCrops] = useState([]);
  const [error, setError] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [tasks, setTasks] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const [fieldsResponse, cropsResponse, notifs, tasksRes] = await Promise.all([
        API.get("/fields"),
        API.get("/crops"),
        fetchFarmerNotifications(),
        API.get("/tasks?status=pending").catch(() => ({ data: { tasks: [] } })),
      ]);

      setFields(fieldsResponse.data?.fields || []);
      setCrops(cropsResponse.data?.crops || []);
      setNotifications(notifs || []);
      setTasks(tasksRes.data?.tasks || []);

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
      } catch {
        router.replace("/login");
      }
    };
    checkAndLoad();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (!loading && !refreshing) {
        fetchFarmerNotifications().then(setNotifications).catch(() => {});
        API.get("/tasks?status=pending")
          .then((res) => setTasks(res.data?.tasks || []))
          .catch(() => {});
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

  const handleToggleDashboardTask = async (task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await API.patch(`/tasks/${task.id}/toggle`);
    } catch {
      loadDashboard();
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
        const normalized = stage.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
        distribution[normalized] = (distribution[normalized] || 0) + 1;
      }
    });
    return Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  }, [crops]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <View className="flex-1 items-center justify-center p-6 bg-farmBg">
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text className="mt-3 text-sm text-textSecondary font-medium">
            Loading farm control center...
          </Text>
        </View>
        <FarmerBottomTabs activeTab="home" />
      </SafeAreaView>
    );
  }

  if (error && !refreshing && fields.length === 0 && crops.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <View className="flex-1 items-center justify-center p-6 bg-farmBg">
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <FarmerHeader
        title={`Good morning, ${farmerName}`}
        subtitle="Here's your farm overview"
        showDrawer={true}
        onOpenDrawer={() => setDrawerOpen(true)}
        rightAction={
          <NotificationBadge
            count={unreadCount}
            onPress={() => router.push("/farmer/notifications")}
          />
        }
      />

      <ScrollView
        className="flex-1 bg-farmBg"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 40,
          width: "100%",
          maxWidth: 860,
          alignSelf: "center",
        }}
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
          {/* QUICK STATS */}
          <View className="mb-2">
            <Text className="text-base font-bold text-textPrimary tracking-tight">Farm Overview</Text>
          </View>

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-white p-3 rounded-xl border border-farmBorderLight items-center justify-center shadow-sm">
              <Text className="text-2xl font-extrabold text-textPrimary">
                {String(stats.totalFields).padStart(2, "0")}
              </Text>
              <Text className="text-xs text-textMuted font-medium mt-0.5">Fields</Text>
            </View>
            <View className="flex-1 bg-white p-3 rounded-xl border border-farmBorderLight items-center justify-center shadow-sm">
              <Text className="text-2xl font-extrabold text-textPrimary">
                {String(stats.activeCrops).padStart(2, "0")}
              </Text>
              <Text className="text-xs text-textMuted font-medium mt-0.5">Active Crops</Text>
            </View>
          </View>

          {/* NEEDS ATTENTION */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base font-bold text-textPrimary tracking-tight">Needs Attention</Text>
              {notifications.length > 0 && (
                <TouchableOpacity
                  onPress={() => router.push("/farmer/notifications")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text className="text-xs font-semibold text-primary">View all →</Text>
                </TouchableOpacity>
              )}
            </View>

            {(() => {
              const attentionItems = notifications.filter((n) => n.type === "ATTENTION").slice(0, 2);
              const activityCount = notifications.filter((n) => n.type === "ACTIVITY").length;

              if (attentionItems.length === 0 && activityCount === 0) {
                return (
                  <View className="flex-row items-center bg-white p-3.5 rounded-xl border border-dashed border-farmBorderLight">
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={22}
                      color={COLORS.primary}
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-sm font-medium text-textSecondary">
                      Everything looks up to date
                    </Text>
                  </View>
                );
              }

              return (
                <View>
                  {attentionItems.map((item) => (
                    <AttentionCard
                      key={item.id}
                      item={item}
                      onPress={() => item.route && router.push(item.route)}
                    />
                  ))}
                  {activityCount > 0 && (
                    <TouchableOpacity
                      className="flex-row items-center bg-white p-3.5 rounded-xl border border-farmBorder mt-1.5"
                      onPress={() => router.push("/farmer/notifications")}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color={COLORS.textSecondary}
                        style={{ marginRight: 8 }}
                      />
                      <Text className="text-sm font-medium text-textSecondary flex-1">
                        {activityCount} recent crop {activityCount === 1 ? "update" : "updates"}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#CBD5CB" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}
          </View>

          {/* FARM TASKS SECTION */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base font-bold text-textPrimary tracking-tight">Farm Tasks</Text>
              <TouchableOpacity
                onPress={() => router.push("/farmer/tasks")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-xs font-semibold text-primary">View all →</Text>
              </TouchableOpacity>
            </View>

            {tasks.length === 0 ? (
              <View className="flex-row items-center bg-white p-3.5 rounded-xl border border-dashed border-farmBorderLight">
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color={COLORS.primary}
                  style={{ marginRight: 8 }}
                />
                <Text className="text-sm font-medium text-textSecondary">
                  No pending tasks — you're all caught up!
                </Text>
              </View>
            ) : (
              <View className="bg-white rounded-xl border border-farmBorder overflow-hidden shadow-sm">
                {tasks.slice(0, 3).map((task, idx) => (
                  <View
                    key={task.id}
                    className={`flex-row items-center py-3 px-3.5 ${
                      idx < Math.min(tasks.length, 3) - 1 ? "border-b border-farmBorderLight" : ""
                    }`}
                  >
                    <TouchableOpacity
                      className="mr-3 p-0.5"
                      onPress={() => handleToggleDashboardTask(task)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="checkbox"
                      accessibilityLabel={`Complete ${task.title}`}
                    >
                      <Ionicons name="square-outline" size={19} color="#CBD5CB" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1"
                      onPress={() => router.push("/farmer/tasks")}
                      activeOpacity={0.7}
                    >
                      <Text className="text-sm font-semibold text-textPrimary" numberOfLines={1}>
                        {task.title}
                      </Text>
                      <View className="flex-row items-center mt-0.5">
                        <Text className="text-[10px] font-bold text-primary tracking-wide uppercase">
                          {(task.category || "general").toUpperCase()}
                        </Text>
                        {task.due_date && (
                          <Text className="text-xs text-textMuted ml-1.5">
                            • Due{" "}
                            {new Date(task.due_date).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                    <Ionicons name="chevron-forward" size={16} color="#CBD5CB" />
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ACTIVE CROPS OR ONBOARDING */}
          {fields.length === 0 && crops.length === 0 ? (
            <View className="bg-white p-6 rounded-xl border border-farmBorder items-center my-3">
              <Text className="text-base font-bold text-textPrimary text-center mb-1">
                Your farm workspace is ready
              </Text>
              <Text className="text-sm text-textSecondary text-center leading-5 mb-4">
                Start by creating your first field, then add crops to begin tracking their lifecycle.
              </Text>
              <TouchableOpacity
                className="w-full bg-primary py-3 rounded-lg items-center mb-2"
                onPress={() => router.push("/farmer/create-field")}
                activeOpacity={0.8}
              >
                <Text className="text-sm font-bold text-white">Create Field</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="w-full bg-surface py-3 rounded-lg items-center border border-farmBorder"
                onPress={() => router.push("/farmer/create-crop")}
                activeOpacity={0.8}
              >
                <Text className="text-sm font-semibold text-textPrimary">Create Crop</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ACTIVE CROPS */}
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-base font-bold text-textPrimary tracking-tight">Active Crops</Text>
                  {crops.length > 0 && (
                    <TouchableOpacity
                      onPress={() => router.push("/farmer/crops")}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text className="text-xs font-semibold text-primary">View all →</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {crops.length === 0 ? (
                  <View className="bg-white p-5 rounded-xl border border-farmBorder items-center">
                    <Text className="text-sm font-semibold text-textPrimary mb-2">No active crops</Text>
                    <TouchableOpacity
                      className="bg-primary px-4 py-2 rounded-lg"
                      onPress={() => router.push("/farmer/create-crop")}
                      activeOpacity={0.8}
                    >
                      <Text className="text-xs font-bold text-white">Add Crop</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  crops
                    .filter((c) => (c.crop_status || "").toLowerCase() !== "harvested")
                    .slice(0, 3)
                    .map((crop) => {
                      const stage = crop.current_stage || "Vegetative";
                      const sownDateStr = crop.sowing_date
                        ? new Date(crop.sowing_date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Recorded";

                      return (
                        <TouchableOpacity
                          key={crop.id}
                          className="flex-row items-center bg-white p-3.5 rounded-xl border border-farmBorder mb-2 shadow-sm"
                          onPress={() => router.push(`/farmer/crop-details/${crop.id}`)}
                          activeOpacity={0.7}
                        >
                          <View className="flex-1 pr-3">
                            <Text className="text-base font-bold text-textPrimary mb-0.5">
                              {crop.crop_name || "Unnamed Crop"}
                            </Text>
                            <Text className="text-xs text-textSecondary mb-1">
                              {crop.variety || "Standard Variety"} • {crop.field_name || "Unassigned"}
                            </Text>
                            <View className="flex-row items-center gap-2">
                              <Text className="text-[11px] font-semibold text-primary bg-primaryLight px-1.5 py-0.5 rounded">
                                {stage.replace("_", " ")}
                              </Text>
                              <Text className="text-xs text-textMuted">Sown {sownDateStr}</Text>
                            </View>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#CBD5CB" />
                        </TouchableOpacity>
                      );
                    })
                )}
              </View>

              {/* CROP STATUS DISTRIBUTION */}
              {statusDistribution.length > 0 && (
                <View className="mb-4">
                  <Text className="text-sm font-bold text-textPrimary mb-2">Crop Status</Text>
                  <View className="bg-white rounded-xl border border-farmBorder overflow-hidden shadow-sm">
                    {statusDistribution.map(([stage, count], idx) => (
                      <View
                        key={stage}
                        className={`flex-row items-center justify-between py-2.5 px-3.5 ${
                          idx < statusDistribution.length - 1 ? "border-b border-farmBorderLight" : ""
                        }`}
                      >
                        <Text className="text-sm text-textSecondary font-medium">{stage}</Text>
                        <Text className="text-sm font-bold text-primary">{count}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* QUICK ACTIONS */}
              <View className="mb-5">
                <Text className="text-sm font-bold text-textPrimary mb-2">Quick Actions</Text>
                <View className="bg-white rounded-xl border border-farmBorder overflow-hidden shadow-sm">
                  <TouchableOpacity
                    className="flex-row items-center p-3.5 border-b border-farmBorderLight"
                    onPress={() => router.push("/farmer/tasks")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkbox-outline" size={20} color={COLORS.primary} style={{ marginRight: 12 }} />
                    <Text className="text-sm font-medium text-textPrimary">Farm Tasks</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-row items-center p-3.5 border-b border-farmBorderLight"
                    onPress={() => router.push("/farmer/create-crop")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={20} color={COLORS.primary} style={{ marginRight: 12 }} />
                    <Text className="text-sm font-medium text-textPrimary">Create Crop</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-row items-center p-3.5 border-b border-farmBorderLight"
                    onPress={() => router.push("/farmer/create-field")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={20} color={COLORS.primary} style={{ marginRight: 12 }} />
                    <Text className="text-sm font-medium text-textPrimary">Create Field</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-row items-center p-3.5 border-b border-farmBorderLight"
                    onPress={() => router.push("/farmer/field-work")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="document-text-outline" size={20} color={COLORS.primary} style={{ marginRight: 12 }} />
                    <Text className="text-sm font-medium text-textPrimary">Field Work</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-row items-center p-3.5 border-b border-farmBorderLight"
                    onPress={() => router.push("/farmer/crops")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="leaf-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 12 }} />
                    <Text className="text-sm font-medium text-textPrimary">View Crops</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-row items-center p-3.5"
                    onPress={() => router.push("/farmer/fields")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="map-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 12 }} />
                    <Text className="text-sm font-medium text-textPrimary">View Fields</Text>
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

      {/* Bottom Navigation */}
      <FarmerBottomTabs activeTab="home" />
    </SafeAreaView>
  );
}