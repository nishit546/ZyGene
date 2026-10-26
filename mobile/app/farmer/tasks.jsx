import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../constants/theme";
import FarmerHeader from "../../components/ui/FarmerHeader";
import FarmerBottomTabs from "../../components/FarmerBottomTabs";
import API from "../../services/api";

const CATEGORY_CONFIG = {
  irrigation: { label: "Irrigation", icon: "water-outline", color: "#0284C7", bg: "#E0F2FE" },
  treatment: { label: "Treatment", icon: "shield-checkmark-outline", color: "#D97706", bg: "#FEF3C7" },
  fertilizer: { label: "Fertilizer", icon: "nutrition-outline", color: "#16A34A", bg: "#DCFCE7" },
  scouting: { label: "Scouting", icon: "search-outline", color: "#9333EA", bg: "#F3E8FF" },
  harvest: { label: "Harvest", icon: "cube-outline", color: "#CA8A04", bg: "#FEF9C3" },
  general: { label: "General", icon: "checkbox-outline", color: COLORS.textSecondary, bg: COLORS.surfaceSubtle },
};

const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", color: "#DC2626", bg: "#FEE2E2" },
  high: { label: "High", color: "#EA580C", bg: "#FFEDD5" },
  medium: { label: "Medium", color: "#D97706", bg: "#FEF3C7" },
  low: { label: "Low", color: "#64748B", bg: "#F1F5F9" },
};

export default function FarmerTasksScreen() {
  const router = useRouter();

  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, today: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("pending"); // "all" | "pending" | "completed" | "high"
  const [selectedCategory, setSelectedCategory] = useState("all");

  const loadTasksData = useCallback(async () => {
    try {
      const [tasksRes, statsRes] = await Promise.all([
        API.get("/tasks"),
        API.get("/tasks/stats"),
      ]);

      if (tasksRes.data?.tasks) {
        setTasks(tasksRes.data.tasks);
      }
      if (statsRes.data?.stats) {
        setStats(statsRes.data.stats);
      }
    } catch (err) {
      console.log("Error loading tasks:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTasksData();
  }, [loadTasksData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTasksData();
  }, [loadTasksData]);

  const handleToggleTask = async (task) => {
    const isCompleted = task.status === "completed";
    const nextStatus = isCompleted ? "pending" : "completed";

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: nextStatus, completed_at: nextStatus === "completed" ? new Date().toISOString() : null } : t
      )
    );

    try {
      await API.patch(`/tasks/${task.id}/toggle`);
      // Refresh stats in background
      API.get("/tasks/stats").then((res) => {
        if (res.data?.stats) setStats(res.data.stats);
      }).catch(() => {});
    } catch (err) {
      // Rollback on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status, completed_at: task.completed_at } : t))
      );
      Alert.alert("Error", "Could not update task status. Please try again.");
    }
  };

  const handleDeleteTask = (task) => {
    Alert.alert(
      "Delete Task",
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await API.delete(`/tasks/${task.id}`);
              setTasks((prev) => prev.filter((t) => t.id !== task.id));
              API.get("/tasks/stats").then((res) => {
                if (res.data?.stats) setStats(res.data.stats);
              }).catch(() => {});
            } catch (err) {
              Alert.alert("Error", "Could not delete task.");
            }
          },
        },
      ]
    );
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Status filter
      if (activeFilter === "pending" && task.status !== "pending" && task.status !== "in_progress") {
        return false;
      }
      if (activeFilter === "completed" && task.status !== "completed") {
        return false;
      }
      if (activeFilter === "high" && task.priority !== "high" && task.priority !== "urgent") {
        return false;
      }

      // Category filter
      if (selectedCategory !== "all" && task.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [tasks, activeFilter, selectedCategory]);

  const categories = ["all", "irrigation", "treatment", "fertilizer", "scouting", "harvest", "general"];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <FarmerHeader
        title="Farm Tasks"
        subtitle="Schedule & track field activities"
        showBack={true}
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/farmer/create-task")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Create task"
          >
            <Ionicons name="add" size={20} color={COLORS.surface} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
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
        {/* STATS STRIP */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, stats.today > 0 && { color: COLORS.primary }]}>{stats.today}</Text>
            <Text style={styles.statLabel}>Due Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, stats.overdue > 0 && { color: COLORS.danger }]}>{stats.overdue}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* STATUS FILTER PILLS */}
        <View style={styles.filterRow}>
          {[
            { id: "pending", label: "Pending" },
            { id: "all", label: "All Tasks" },
            { id: "high", label: "High Priority" },
            { id: "completed", label: "Completed" },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setActiveFilter(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CATEGORY SELECTOR */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((catKey) => {
            const isCatActive = selectedCategory === catKey;
            const label = catKey === "all" ? "All Categories" : (CATEGORY_CONFIG[catKey]?.label || catKey);
            const iconName = catKey === "all" ? "grid-outline" : (CATEGORY_CONFIG[catKey]?.icon || "bookmark-outline");

            return (
              <TouchableOpacity
                key={catKey}
                style={[styles.categoryChip, isCatActive && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(catKey)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={iconName}
                  size={14}
                  color={isCatActive ? COLORS.surface : COLORS.textSecondary}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.categoryChipText, isCatActive && styles.categoryChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* TASK LIST */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading farm tasks...</Text>
          </View>
        ) : filteredTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name={activeFilter === "completed" ? "checkmark-done-circle-outline" : "checkbox-outline"}
              size={48}
              color={COLORS.textMuted}
              style={{ marginBottom: SPACING.sm }}
            />
            <Text style={styles.emptyTitle}>
              {activeFilter === "completed"
                ? "No completed tasks yet"
                : "No tasks found"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === "completed"
                ? "Check off pending tasks to track your completed activities"
                : "Create tasks to keep track of irrigation, spraying, scouting, and field work"}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push("/farmer/create-task")}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={18} color={COLORS.surface} style={{ marginRight: 6 }} />
              <Text style={styles.emptyButtonText}>Add Farm Task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.taskList}>
            {filteredTasks.map((task) => {
              const isCompleted = task.status === "completed";
              const cat = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.general;
              const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

              let dueDateText = null;
              let isOverdue = false;
              let isDueToday = false;

              if (task.due_date) {
                const due = new Date(task.due_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                due.setHours(0, 0, 0, 0);

                if (due.getTime() < today.getTime() && !isCompleted) {
                  isOverdue = true;
                } else if (due.getTime() === today.getTime() && !isCompleted) {
                  isDueToday = true;
                }

                dueDateText = new Date(task.due_date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                });
              }

              return (
                <View
                  key={task.id}
                  style={[
                    styles.taskCard,
                    isCompleted && styles.taskCardCompleted,
                    isOverdue && styles.taskCardOverdue,
                  ]}
                >
                  <View style={styles.taskCardTop}>
                    {/* Checkbox */}
                    <TouchableOpacity
                      style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}
                      onPress={() => handleToggleTask(task)}
                      activeOpacity={0.7}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isCompleted }}
                      accessibilityLabel={`Mark ${task.title} as ${isCompleted ? "pending" : "completed"}`}
                    >
                      {isCompleted && <Ionicons name="checkmark" size={16} color={COLORS.surface} />}
                    </TouchableOpacity>

                    {/* Title & Info */}
                    <View style={styles.taskTextWrapper}>
                      <Text
                        style={[
                          styles.taskTitle,
                          isCompleted && styles.taskTitleCompleted,
                        ]}
                        numberOfLines={2}
                      >
                        {task.title}
                      </Text>

                      {task.description ? (
                        <Text
                          style={[
                            styles.taskDescription,
                            isCompleted && styles.taskDescriptionCompleted,
                          ]}
                          numberOfLines={2}
                        >
                          {task.description}
                        </Text>
                      ) : null}

                      {/* Meta Tags Row */}
                      <View style={styles.metaRow}>
                        {/* Category Badge */}
                        <View style={[styles.badge, { backgroundColor: cat.bg }]}>
                          <Ionicons name={cat.icon} size={11} color={cat.color} style={{ marginRight: 3 }} />
                          <Text style={[styles.badgeText, { color: cat.color }]}>{cat.label}</Text>
                        </View>

                        {/* Priority Badge */}
                        <View style={[styles.badge, { backgroundColor: pri.bg }]}>
                          <Text style={[styles.badgeText, { color: pri.color }]}>{pri.label}</Text>
                        </View>

                        {/* Linked Field */}
                        {task.field_name ? (
                          <View style={styles.metaContextBadge}>
                            <Ionicons name="map-outline" size={11} color={COLORS.textSecondary} style={{ marginRight: 2 }} />
                            <Text style={styles.metaContextText} numberOfLines={1}>{task.field_name}</Text>
                          </View>
                        ) : null}

                        {/* Linked Crop */}
                        {task.crop_name ? (
                          <View style={styles.metaContextBadge}>
                            <Ionicons name="leaf-outline" size={11} color={COLORS.textSecondary} style={{ marginRight: 2 }} />
                            <Text style={styles.metaContextText} numberOfLines={1}>{task.crop_name}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Delete action */}
                    <TouchableOpacity
                      onPress={() => handleDeleteTask(task)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.deleteButton}
                      accessibilityRole="button"
                      accessibilityLabel="Delete task"
                    >
                      <Ionicons name="trash-outline" size={17} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {/* Due Date Footer */}
                  {dueDateText ? (
                    <View style={styles.taskFooter}>
                      <Ionicons
                        name="calendar-outline"
                        size={12}
                        color={isOverdue ? COLORS.danger : isDueToday ? COLORS.primary : COLORS.textMuted}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.taskFooterText,
                          isOverdue && { color: COLORS.danger, fontWeight: "700" },
                          isDueToday && { color: COLORS.primary, fontWeight: "700" },
                        ]}
                      >
                        {isOverdue ? `Overdue (${dueDateText})` : isDueToday ? "Due Today" : `Due ${dueDateText}`}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <FarmerBottomTabs activeTab="more" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  addButtonText: {
    color: COLORS.surface,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.subtle,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: "500",
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: SPACING.sm,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  filterPillTextActive: {
    color: COLORS.surface,
    fontWeight: "700",
  },
  categoryScroll: {
    gap: 6,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.md,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: COLORS.surface,
    fontWeight: "600",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  emptyContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginTop: SPACING.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  emptyButtonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: "700",
  },
  taskList: {
    gap: 10,
  },
  taskCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOWS.subtle,
  },
  taskCardCompleted: {
    opacity: 0.75,
    backgroundColor: "#F9FAF9",
    borderColor: COLORS.borderLight,
  },
  taskCardOverdue: {
    borderColor: "#FECACA",
  },
  taskCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.borderDark,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    marginRight: 10,
    backgroundColor: COLORS.surface,
  },
  checkboxCompleted: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  taskTextWrapper: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 3,
    lineHeight: 20,
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: COLORS.textMuted,
  },
  taskDescription: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 17,
  },
  taskDescriptionCompleted: {
    color: COLORS.textMuted,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  metaContextBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaContextText: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  deleteButton: {
    paddingLeft: 8,
    paddingTop: 2,
  },
  taskFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  taskFooterText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
