import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../constants/theme";

/**
 * Status indicator & banner component.
 * Statuses: 'online' | 'offline' | 'syncing' | 'failed'
 */
export default function SyncStatus({
  status = "online", // 'online' | 'offline' | 'syncing' | 'failed'
  pendingCount = 0,
  onRetry,
  showBanner = true,
}) {
  const isOffline = status === "offline";
  const isSyncing = status === "syncing";
  const isFailed = status === "failed";

  const getStatusBadge = () => {
    if (isSyncing) {
      return {
        label: "Syncing...",
        color: COLORS.primary || "#2E7D32",
        bgColor: "#E8F5E9",
        icon: null,
        loading: true,
      };
    }
    if (isFailed) {
      return {
        label: "Sync failed",
        color: COLORS.danger || "#D32F2F",
        bgColor: "#FFEBEE",
        icon: "alert-circle-outline",
        loading: false,
      };
    }
    if (isOffline) {
      return {
        label: "Offline",
        color: "#616161",
        bgColor: "#EEEEEE",
        icon: "cloud-offline-outline",
        loading: false,
      };
    }
    return {
      label: "Online",
      color: COLORS.primary || "#2E7D32",
      bgColor: "#E8F5E9",
      icon: "checkmark-circle-outline",
      loading: false,
    };
  };

  const badge = getStatusBadge();

  return (
    <View style={styles.container}>
      {/* Subtle Offline / Sync Banner */}
      {showBanner && isOffline && (
        <View style={styles.banner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#424242" style={styles.bannerIcon} />
          <Text style={styles.bannerText}>
            You are offline. Changes will be saved on this device.
          </Text>
        </View>
      )}

      {showBanner && isFailed && (
        <View style={[styles.banner, styles.failedBanner]}>
          <Ionicons name="warning-outline" size={16} color={COLORS.danger || "#D32F2F"} style={styles.bannerIcon} />
          <Text style={[styles.bannerText, { color: COLORS.danger || "#D32F2F", flex: 1 }]}>
            Unable to sync some records. Data is safe locally.
          </Text>
          {onRetry && (
            <TouchableOpacity onPress={onRetry} style={styles.retryBtn} activeOpacity={0.7}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Compact Status Indicator Chip */}
      <View style={[styles.indicatorChip, { backgroundColor: badge.bgColor }]}>
        {badge.loading ? (
          <ActivityIndicator size="small" color={badge.color} style={{ marginRight: 5 }} />
        ) : (
          <Ionicons name={badge.icon} size={14} color={badge.color} style={{ marginRight: 5 }} />
        )}
        <Text style={[styles.indicatorText, { color: badge.color }]}>{badge.label}</Text>
        {pendingCount > 0 && !isSyncing && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{pendingCount}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  failedBanner: {
    backgroundColor: "#FFEBEE",
    borderBottomColor: "#FFCDD2",
  },
  bannerIcon: {
    marginRight: 8,
  },
  bannerText: {
    fontSize: 12,
    color: "#424242",
    fontWeight: "500",
  },
  retryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#FFCDD2",
    borderRadius: 4,
    marginLeft: 6,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.danger || "#D32F2F",
  },
  indicatorChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  indicatorText: {
    fontSize: 12,
    fontWeight: "600",
  },
  countBadge: {
    marginLeft: 5,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  countText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
