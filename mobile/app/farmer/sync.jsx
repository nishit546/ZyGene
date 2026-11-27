import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import FarmerHeader from "../../components/ui/FarmerHeader";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../constants/theme";
import useNetworkStatus from "../../hooks/useNetworkStatus";
import {
  getQueueOperations,
  getQueueStats,
  processSyncQueue,
  retryFailedOperations,
  retrySpecificOperation,
  subscribeSyncEvents,
} from "../../services/syncService";
import { getSyncMetadata } from "../../services/offlineStorage";
import { getCurrentUserId } from "../../services/auth";

export default function SynchronizationScreen() {
  const [userId, setUserId] = useState(null);
  const [operations, setOperations] = useState([]);
  const [stats, setStats] = useState({ pending: 0, syncing: 0, failed: 0, synced: 0 });
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'pending' | 'failed' | 'synced'

  const { isOnline } = useNetworkStatus(async () => {
    // When back online, trigger auto sync
    if (userId) {
      handleSyncNow();
    }
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const uid = await getCurrentUserId();
      setUserId(uid);

      const [ops, queueStats, lastSync] = await Promise.all([
        getQueueOperations(uid),
        getQueueStats(uid),
        getSyncMetadata("last_successful_sync"),
      ]);

      setOperations(ops);
      setStats(queueStats);
      setLastSyncTime(lastSync);
    } catch (err) {
      console.warn("[syncScreen] Error loading sync data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to real-time sync events
    const unsubscribe = subscribeSyncEvents((event) => {
      if (event.type === "SYNC_START") {
        setIsSyncing(true);
      } else if (event.type === "SYNC_COMPLETE") {
        setIsSyncing(false);
        loadData();
      } else {
        loadData();
      }
    });

    return () => unsubscribe();
  }, [loadData]);

  const handleSyncNow = async () => {
    if (!isOnline) {
      Alert.alert(
        "Offline",
        "Your device is currently offline. Synchronization will resume automatically when internet connectivity returns."
      );
      return;
    }

    try {
      setIsSyncing(true);
      await processSyncQueue(userId);
      await loadData();
    } catch (e) {
      console.warn("Manual sync error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!isOnline) {
      Alert.alert(
        "Offline",
        "Cannot retry synchronization while offline. Please connect to the internet."
      );
      return;
    }

    try {
      setIsSyncing(true);
      await retryFailedOperations(userId);
      await loadData();
    } catch (e) {
      console.warn("Retry failed error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetrySingle = async (opId) => {
    if (!isOnline) {
      Alert.alert("Offline", "Please reconnect to retry.");
      return;
    }
    try {
      setIsSyncing(true);
      await retrySpecificOperation(opId, userId);
      await loadData();
    } catch (e) {
      console.warn("Retry single error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredOperations = operations.filter((op) => {
    if (activeTab === "pending") return op.status === "pending" || op.status === "syncing";
    if (activeTab === "failed") return op.status === "failed";
    if (activeTab === "synced") return op.status === "synced";
    return true; // 'all'
  });

  const formatRecordType = (type) => {
    switch (type) {
      case "field":
        return "Field Plot";
      case "crop":
        return "Crop Record";
      case "lifecycle":
        return "Lifecycle Stage";
      case "measurement":
        return "Growth Measurement";
      case "photo":
        return "Field Photo";
      case "irrigation":
        return "Irrigation Event";
      case "treatment":
        return "Crop Treatment";
      case "disease_pest":
        return "Disease / Pest";
      case "harvest":
        return "Harvest Production";
      default:
        return type;
    }
  };

  const formatPayloadSummary = (op) => {
    try {
      const p = JSON.parse(op.payload_json);
      if (op.record_type === "measurement") {
        return `${p.measurement_type}: ${p.measurement_value} ${p.unit || ""}`.trim();
      }
      if (op.record_type === "photo") {
        return p.caption || "Crop photo captured";
      }
      if (op.record_type === "irrigation") {
        return `Date: ${p.irrigation_date} (${p.water_amount || ""} ${p.water_unit || ""})`.trim();
      }
      if (op.record_type === "treatment") {
        return `${p.treatment_type}: ${p.product_name || "Treatment"} (${p.application_date})`;
      }
      if (op.record_type === "disease_pest") {
        return `${p.observation_type}: ${p.name} (Severity: ${p.severity || "N/A"})`;
      }
      if (op.record_type === "harvest") {
        return `Harvest on ${p.harvest_date} - Yield: ${p.total_yield || 0} ${p.yield_unit || ""}`.trim();
      }
      if (op.record_type === "crop") {
        return `Crop: ${p.crop_name} (${p.variety || "Standard"})`;
      }
      if (op.record_type === "field") {
        return `Field: ${p.field_name} (${p.location_name || "Farm"})`;
      }
      if (op.record_type === "lifecycle") {
        return `Stage: ${p.stage} (${p.record_date})`;
      }
      return "";
    } catch {
      return "";
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "Never";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString() + " at " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoString;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <FarmerHeader title="Synchronization" showBack={true} />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} colors={[COLORS.primary]} />
        }
      >
        {/* CONNECTION & LAST SYNC CARD */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.statusIndicatorRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isOnline ? COLORS.primary || "#2E7D32" : "#757575" },
                ]}
              />
              <Text style={styles.connectionTitle}>
                {isOnline ? "Connected (Online)" : "No Internet (Offline)"}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: isOnline ? "#E8F5E9" : "#EEEEEE" },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: isOnline ? COLORS.primary || "#2E7D32" : "#616161" },
                ]}
              >
                {isOnline ? "Ready to sync" : "Offline mode active"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.metaLabel}>Last Successful Sync:</Text>
            <Text style={styles.metaValue}>{formatDateTime(lastSyncTime)}</Text>
          </View>
        </View>

        {/* SUMMARY STATS BAR */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: "#E65100" }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: COLORS.danger || "#D32F2F" }]}>
              {stats.failed}
            </Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: COLORS.primary || "#2E7D32" }]}>
              {stats.synced}
            </Text>
            <Text style={styles.statLabel}>Synced</Text>
          </View>
        </View>

        {/* PRIMARY ACTIONS */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (isSyncing || !isOnline) && styles.disabledBtn,
            ]}
            onPress={handleSyncNow}
            disabled={isSyncing || !isOnline}
            activeOpacity={0.8}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
            ) : (
              <Ionicons name="sync-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            )}
            <Text style={styles.primaryBtnText}>
              {isSyncing ? "Syncing Changes..." : "Sync Now"}
            </Text>
          </TouchableOpacity>

          {stats.failed > 0 && (
            <TouchableOpacity
              style={[
                styles.retryAllBtn,
                (isSyncing || !isOnline) && styles.disabledBtn,
              ]}
              onPress={handleRetryFailed}
              disabled={isSyncing || !isOnline}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={18} color={COLORS.danger || "#D32F2F"} style={{ marginRight: 6 }} />
              <Text style={styles.retryAllBtnText}>Retry Failed</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* FILTER TABS */}
        <View style={styles.tabBar}>
          {[
            { key: "all", label: `All (${operations.length})` },
            { key: "pending", label: `Pending (${stats.pending})` },
            { key: "failed", label: `Failed (${stats.failed})` },
            { key: "synced", label: `Synced (${stats.synced})` },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab.key && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* OPERATIONS LIST */}
        <View style={styles.recordsList}>
          {filteredOperations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color="#9E9E9E" />
              <Text style={styles.emptyTitle}>No records in this section</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === "pending"
                  ? "All records are synchronized with the server."
                  : "No synchronization history to display."}
              </Text>
            </View>
          ) : (
            filteredOperations.map((item) => (
              <View key={item.operation_id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <View style={styles.recordTypeTag}>
                    <Text style={styles.recordTypeText}>{formatRecordType(item.record_type)}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      item.status === "synced" && styles.statusPillSynced,
                      item.status === "failed" && styles.statusPillFailed,
                      item.status === "pending" && styles.statusPillPending,
                      item.status === "syncing" && styles.statusPillSyncing,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        item.status === "synced" && { color: COLORS.primary },
                        item.status === "failed" && { color: COLORS.danger },
                        item.status === "pending" && { color: "#E65100" },
                        item.status === "syncing" && { color: "#1565C0" },
                      ]}
                    >
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.payloadSummary}>{formatPayloadSummary(item)}</Text>

                <View style={styles.recordFooter}>
                  <Text style={styles.dateText}>
                    Created: {formatDateTime(item.created_at)}
                  </Text>
                  {item.status === "failed" && (
                    <TouchableOpacity
                      style={styles.singleRetryBtn}
                      onPress={() => handleRetrySingle(item.operation_id)}
                      disabled={isSyncing || !isOnline}
                    >
                      <Ionicons name="refresh" size={14} color="#D32F2F" />
                      <Text style={styles.singleRetryText}>Retry</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {item.last_error && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={14} color="#D32F2F" style={{ marginRight: 4 }} />
                    <Text style={styles.errorText} numberOfLines={2}>
                      {item.last_error}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background || "#F9FBF7",
  },
  container: {
    padding: SPACING.md || 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.surface || "#FFFFFF",
    borderRadius: RADIUS.md || 10,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border || "#E5E7EB",
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  connectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary || "#1F2937",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border || "#E5E7EB",
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 13,
    color: COLORS.textSecondary || "#6B7280",
    marginLeft: 6,
    marginRight: 6,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary || "#1F2937",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface || "#FFFFFF",
    borderRadius: RADIUS.md || 10,
    paddingVertical: 12,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border || "#E5E7EB",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary || "#6B7280",
    fontWeight: "500",
  },
  actionButtonsRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary || "#2E7D32",
    paddingVertical: 12,
    borderRadius: RADIUS.md || 10,
    marginRight: 6,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  retryAllBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFEBEE",
    borderWidth: 1,
    borderColor: "#FFCDD2",
    paddingVertical: 12,
    borderRadius: RADIUS.md || 10,
    marginLeft: 6,
  },
  retryAllBtnText: {
    color: COLORS.danger || "#D32F2F",
    fontSize: 14,
    fontWeight: "700",
  },
  disabledBtn: {
    opacity: 0.5,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#EAEAEA",
    borderRadius: 8,
    padding: 3,
    marginBottom: 14,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 6,
  },
  tabItemActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary || "#6B7280",
  },
  tabLabelActive: {
    color: COLORS.textPrimary || "#1F2937",
    fontWeight: "700",
  },
  recordsList: {
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary || "#1F2937",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary || "#6B7280",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 20,
  },
  recordCard: {
    backgroundColor: COLORS.surface || "#FFFFFF",
    borderRadius: RADIUS.md || 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border || "#E5E7EB",
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  recordTypeTag: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recordTypeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary || "#2E7D32",
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusPillSynced: {
    backgroundColor: "#E8F5E9",
  },
  statusPillPending: {
    backgroundColor: "#FFF3E0",
  },
  statusPillSyncing: {
    backgroundColor: "#E3F2FD",
  },
  statusPillFailed: {
    backgroundColor: "#FFEBEE",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  payloadSummary: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary || "#1F2937",
    marginBottom: 8,
  },
  recordFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textSecondary || "#6B7280",
  },
  singleRetryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  singleRetryText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D32F2F",
    marginLeft: 3,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FED7D7",
    padding: 6,
    borderRadius: 4,
    marginTop: 8,
  },
  errorText: {
    fontSize: 11,
    color: "#C53030",
    flex: 1,
  },
});
