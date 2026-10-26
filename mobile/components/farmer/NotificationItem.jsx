import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../constants/theme";

export default function NotificationItem({ item, onPress }) {
  const getIcon = () => {
    if (item.type === "ATTENTION") return "warning-outline";
    if (item.title.includes("Lifecycle")) return "leaf-outline";
    if (item.title.includes("Measurement")) return "bar-chart-outline";
    if (item.title.includes("Irrigation")) return "water-outline";
    if (item.title.includes("Treatment")) return "flask-outline";
    if (item.title.includes("Harvest")) return "basket-outline";
    return "notifications-outline";
  };

  const getIconColor = () => {
    if (item.type === "ATTENTION") return COLORS.error;
    return COLORS.primary;
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return "Recently";
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  };

  const timeAgo = getTimeAgo(item.date);

  return (
    <TouchableOpacity
      style={[styles.container, !item.read && styles.unreadContainer]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={getIcon()} size={24} color={getIconColor()} />
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={[styles.title, !item.read && styles.unreadText]}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.timeText}>{timeAgo}</Text>
      </View>

      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    alignItems: "flex-start",
  },
  unreadContainer: {
    backgroundColor: COLORS.primaryLight + "10", // subtle green tint
  },
  iconContainer: {
    marginRight: SPACING.md,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: "700",
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 8,
  },
});
