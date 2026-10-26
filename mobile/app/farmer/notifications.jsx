import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SectionList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../constants/theme";
import { fetchFarmerNotifications, markAsRead, markAllAsRead } from "../../utils/farmerNotifications";
import NotificationItem from "../../components/farmer/NotificationItem";
import FilterModal from "../../components/ui/FilterModal";
import FilterSection from "../../components/ui/FilterSection";
import FilterButton from "../../components/ui/FilterButton";

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [tempFilter, setTempFilter] = useState("All");

  const loadNotifications = async () => {
    try {
      const data = await fetchFarmerNotifications();
      setNotifications(data);
    } catch (err) {
      console.log("Error loading notifications", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (item) => {
    if (!item.read) {
      await markAsRead(item.id);
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    }
    if (item.route) {
      router.push(item.route);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead(notifications);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "All") return notifications;
    if (activeFilter === "Attention") return notifications.filter(n => n.type === "ATTENTION");
    if (activeFilter === "Activity") return notifications.filter(n => n.type === "ACTIVITY");
    return notifications;
  }, [notifications, activeFilter]);

  const sections = useMemo(() => {
    const todayList = [];
    const yesterdayList = [];
    const earlierList = [];
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    filteredNotifications.forEach(n => {
      const date = new Date(n.date);
      if (date.toDateString() === today.toDateString()) {
        todayList.push(n);
      } else if (date.toDateString() === yesterday.toDateString()) {
        yesterdayList.push(n);
      } else {
        earlierList.push(n);
      }
    });

    const result = [];
    if (todayList.length > 0) result.push({ title: "Today", data: todayList });
    if (yesterdayList.length > 0) result.push({ title: "Yesterday", data: yesterdayList });
    if (earlierList.length > 0) result.push({ title: "Earlier", data: earlierList });
    return result;
  }, [filteredNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.toolbar}>
        <FilterButton 
          label={activeFilter === "All" ? "Filter" : activeFilter}
          count={activeFilter !== "All" ? 1 : 0}
          onPress={() => {
            setTempFilter(activeFilter);
            setFilterVisible(true);
          }}
        />
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-done-circle-outline" size={64} color={COLORS.borderDark} />
          <Text style={styles.emptyTitle}>You're all caught up</Text>
          <Text style={styles.emptySub}>
            New crop activity and important updates will appear here.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem item={item} onPress={() => handleNotificationPress(item)} />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={() => {
          setActiveFilter(tempFilter);
          setFilterVisible(false);
        }}
        onReset={() => setTempFilter("All")}
        title="Filter Notifications"
      >
        <FilterSection
          title="Notification Type"
          options={["All", "Attention", "Activity"]}
          selectedValue={tempFilter}
          onSelect={setTempFilter}
        />
      </FilterModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: SPACING.xxl,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
