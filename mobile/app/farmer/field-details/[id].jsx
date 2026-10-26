import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../../../services/api";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from "../../../constants/theme";
import FarmerHeader from "../../../components/ui/FarmerHeader";
import StatusBadge from "../../../components/ui/StatusBadge";
import ErrorState from "../../../components/ErrorState";

export default function FieldDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [field, setField] = useState(null);
  const [fieldCrops, setFieldCrops] = useState([]);
  const [activities, setActivities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [cropsError, setCropsError] = useState(false);
  
  const [overflowVisible, setOverflowVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      setCropsError(false);

      const [fieldRes, cropsRes] = await Promise.allSettled([
        API.get(`/fields/${id}`),
        API.get("/crops")
      ]);

      if (fieldRes.status === "fulfilled") {
        setField(fieldRes.value.data?.field || fieldRes.value.data || null);
      } else {
        throw new Error(fieldRes.reason?.response?.data?.message || "Failed to load field details.");
      }

      let cropsInField = [];
      if (cropsRes.status === "fulfilled") {
        const allCrops = cropsRes.value.data?.crops || [];
        cropsInField = allCrops.filter(c => String(c.field_id) === String(id));
        setFieldCrops(cropsInField);
      } else {
        setCropsError(true);
      }

      // Fetch lifecycles for active crops to generate activity feed
      if (cropsInField.length > 0) {
        const activeCrops = cropsInField.filter(c => (c.crop_status || "").toLowerCase() !== "harvested");
        
        const lifecyclePromises = activeCrops.map(c => 
          API.get(`/lifecycle/${c.id}`).then(res => ({ cropId: c.id, cropName: c.crop_name, lifecycles: res.data?.lifecycle || [] })).catch(() => null)
        );
        
        const lifecycleResults = await Promise.all(lifecyclePromises);
        let recentActs = [];
        
        lifecycleResults.forEach(res => {
          if (res && res.lifecycles) {
            res.lifecycles.forEach(l => {
              recentActs.push({
                id: `life_${l.id}`,
                type: 'Lifecycle Update',
                icon: 'git-commit-outline',
                date: l.stage_start_date || l.created_at,
                desc: `${res.cropName} · ${l.stage ? l.stage.replace('_', ' ') : 'Stage updated'}`,
              });
            });
          }
        });
        
        recentActs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setActivities(recentActs.slice(0, 5));
      }

    } catch (err) {
      console.log("FIELD DETAILS ERROR:", err.message);
      setError(err.message || "Unable to load field.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDeleteField = () => {
    setOverflowVisible(false);
    Alert.alert(
      "Delete Field?",
      "Deleting this field may affect its associated crop records.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              setLoading(true);
              await API.delete(`/fields/${id}`);
              router.replace("/farmer/fields");
            } catch (err) {
              setLoading(false);
              Alert.alert("Error", "Failed to delete field.");
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "--";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr.split("T")[0];
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading field workspace...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !field) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <FarmerHeader title="Unable to load field" showBack={true} />
        <View style={styles.centerContainer}>
          <ErrorState title="Unable to load field" message={error || "We couldn't retrieve this field."} onRetry={loadData} />
        </View>
      </SafeAreaView>
    );
  }

  const activeCropsCount = fieldCrops.filter(c => (c.crop_status || "").toLowerCase() !== "harvested").length;
  const harvestedCropsCount = fieldCrops.filter(c => (c.crop_status || "").toLowerCase() === "harvested").length;
  const totalCropsCount = fieldCrops.length;
  const isFieldActive = activeCropsCount > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <FarmerHeader
        title="Field Details"
        showBack={true}
        rightAction={
          <TouchableOpacity onPress={() => setOverflowVisible(true)} style={styles.headerIconBtn}>
            <Ionicons name="ellipsis-vertical" size={22} color={COLORS.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 3. FIELD OVERVIEW */}
        <View style={styles.section}>
          <View style={styles.overviewTop}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.overviewName}>{field.field_name || "Unnamed Field"}</Text>
              <Text style={styles.overviewLocation}>
                <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} /> {field.location || field.location_name || "Location not recorded"}
              </Text>
            </View>
            {isFieldActive && <StatusBadge status="Active" size="sm" />}
          </View>
        </View>

        {/* 4. FIELD INFORMATION */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>Field Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoGridRow}>
              <View style={styles.infoCol}><Text style={styles.infoLabel}>Field Name</Text><Text style={styles.infoValue}>{field.field_name || "--"}</Text></View>
              <View style={styles.infoCol}><Text style={styles.infoLabel}>Area</Text><Text style={styles.infoValue}>{field.area ? `${field.area} ${field.area_unit || field.unit || 'acres'}` : "--"}</Text></View>
            </View>
            <View style={styles.infoGridDivider} />
            <View style={styles.infoGridRow}>
              <View style={styles.infoCol}><Text style={styles.infoLabel}>Location</Text><Text style={styles.infoValue}>{field.location || field.location_name || "--"}</Text></View>
              <View style={styles.infoCol}><Text style={styles.infoLabel}>Created Date</Text><Text style={styles.infoValue}>{formatDate(field.created_at)}</Text></View>
            </View>
            {field.description && (
              <>
                <View style={styles.infoGridDivider} />
                <View style={styles.infoGridRow}>
                  <View style={styles.infoCol}><Text style={styles.infoLabel}>Description</Text><Text style={styles.infoValue}>{field.description}</Text></View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* 7. FIELD CROP SUMMARY */}
        <View style={styles.sectionBlock}>
          <View style={styles.summaryStrip}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryValue}>{String(totalCropsCount).padStart(2, "0")}</Text>
              <Text style={styles.summaryLabel}>Total Crops</Text>
            </View>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryValue}>{String(activeCropsCount).padStart(2, "0")}</Text>
              <Text style={styles.summaryLabel}>Active</Text>
            </View>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryValue}>{String(harvestedCropsCount).padStart(2, "0")}</Text>
              <Text style={styles.summaryLabel}>Harvested</Text>
            </View>
          </View>
        </View>

        {/* 5. CROPS IN THIS FIELD */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderBetween}>
            <Text style={styles.sectionHeader}>Crops in This Field</Text>
            <TouchableOpacity onPress={() => router.push(`/farmer/create-crop?field_id=${id}`)}>
              <Text style={styles.actionText}>Add Crop +</Text>
            </TouchableOpacity>
          </View>
          
          {cropsError ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>Unable to load crops</Text>
              <TouchableOpacity onPress={loadData}><Text style={styles.textActionText}>Retry</Text></TouchableOpacity>
            </View>
          ) : fieldCrops.length > 0 ? (
            <View style={styles.listCard}>
              {fieldCrops.map((crop, idx) => {
                const isActive = (crop.crop_status || "").toLowerCase() !== "harvested";
                return (
                  <TouchableOpacity
                    key={crop.id}
                    style={[styles.cropRow, idx < fieldCrops.length - 1 && styles.cropRowBorder]}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/farmer/crop-details/${crop.id}`)}
                  >
                    <View style={styles.cropRowContent}>
                      <View>
                        <Text style={styles.cropRowName}>{crop.crop_name}</Text>
                        <Text style={styles.cropRowSub}>{crop.variety || "Unknown variety"}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        {isActive ? (
                          <Text style={styles.cropRowStage}>{crop.current_stage ? crop.current_stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : "Active"}</Text>
                        ) : (
                          <Text style={styles.cropRowHarvested}>Harvested</Text>
                        )}
                        <Text style={styles.cropRowDate}>Sown {formatDate(crop.sowing_date)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyBoxLarge}>
              <Text style={styles.emptyBoxTitle}>No crops in this field</Text>
              <Text style={styles.emptyBoxDesc}>Add a crop to start tracking its lifecycle.</Text>
              <TouchableOpacity style={styles.primaryActionButton} onPress={() => router.push(`/farmer/create-crop?field_id=${id}`)}>
                <Text style={styles.primaryActionText}>Create Crop</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 8. FIELD ACTIVITY */}
        {activities.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeader}>Field Activity</Text>
            <View style={styles.activityList}>
              {activities.map((act, idx) => (
                <View key={act.id} style={[styles.activityItem, idx < activities.length - 1 && styles.activityItemBorder]}>
                  <View style={styles.activityIconBox}><Ionicons name={act.icon} size={18} color={COLORS.primary} /></View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{act.type}</Text>
                    <Text style={styles.activityDesc}>{act.desc}</Text>
                  </View>
                  <Text style={styles.activityDate}>{formatDate(act.date)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 10. FIELD ACTIONS */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>Field Actions</Text>
          <View style={styles.listCard}>
            <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={() => router.push(`/farmer/create-crop?field_id=${id}`)}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.textSecondary} style={styles.actionIcon} />
              <Text style={styles.actionRowText}>Add Crop</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.borderDark} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* OVERFLOW MENU */}
      <Modal visible={overflowVisible} transparent animationType="fade" onRequestClose={() => setOverflowVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOverflowVisible(false)}>
          <View style={styles.overflowMenu}>
            {/* Edit action skipped as per instructions since there's no edit form */}
            <TouchableOpacity style={styles.overflowMenuItem} onPress={handleDeleteField} accessibilityRole="button" accessibilityLabel="Delete field">
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} style={styles.overflowMenuIcon} />
              <Text style={[styles.overflowMenuText, { color: COLORS.danger }]}>Delete Field</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  centerLoading: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { ...TYPOGRAPHY.supporting, marginTop: SPACING.md },
  scrollContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.base,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },
  headerIconBtn: { padding: 4 },
  section: { marginBottom: SPACING.lg },
  sectionBlock: { marginBottom: SPACING.xl },
  sectionHeader: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: SPACING.sm },
  sectionHeaderBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm },
  actionText: { fontSize: 13, fontWeight: "600", color: COLORS.primary },

  overviewTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  overviewName: { fontSize: 24, fontWeight: "800", color: COLORS.text, letterSpacing: -0.3 },
  overviewLocation: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4 },

  infoGrid: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, ...SHADOWS.subtle },
  infoGridRow: { flexDirection: "row" },
  infoGridDivider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 12 },
  infoCol: { flex: 1, paddingRight: 8 },
  infoLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: "600", color: COLORS.text },

  summaryStrip: { flexDirection: "row", backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, ...SHADOWS.subtle },
  summaryCol: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 20, fontWeight: "700", color: COLORS.text, marginBottom: 2 },
  summaryLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: "500" },

  listCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderLight, overflow: "hidden", ...SHADOWS.subtle },
  
  cropRow: { padding: SPACING.md },
  cropRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  cropRowContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cropRowName: { fontSize: 16, fontWeight: "600", color: COLORS.text, marginBottom: 2 },
  cropRowSub: { fontSize: 13, color: COLORS.textSecondary },
  cropRowStage: { fontSize: 13, fontWeight: "600", color: COLORS.primaryDark, marginBottom: 2 },
  cropRowHarvested: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted, marginBottom: 2 },
  cropRowDate: { fontSize: 12, color: COLORS.textSecondary },

  emptyBox: { backgroundColor: COLORS.surfaceSubtle, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: "center", borderWidth: 1, borderColor: COLORS.borderLight, borderStyle: "dashed" },
  emptyBoxText: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  textActionText: { fontSize: 14, fontWeight: "600", color: COLORS.primary },

  emptyBoxLarge: { backgroundColor: COLORS.surfaceSubtle, borderRadius: RADIUS.md, padding: SPACING.xl, alignItems: "center", borderWidth: 1, borderColor: COLORS.borderLight, borderStyle: "dashed" },
  emptyBoxTitle: { fontSize: 16, fontWeight: "600", color: COLORS.text, marginBottom: 8 },
  emptyBoxDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", marginBottom: 20 },
  primaryActionButton: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.md },
  primaryActionText: { fontSize: 14, fontWeight: "600", color: COLORS.surface },

  activityList: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.subtle },
  activityItem: { flexDirection: "row", alignItems: "center", padding: SPACING.md },
  activityItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  activityIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceSubtle, alignItems: "center", justifyContent: "center", marginRight: 12 },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  activityDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  activityDate: { fontSize: 12, color: COLORS.textMuted },

  actionRow: { flexDirection: "row", alignItems: "center", padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  actionIcon: { marginRight: 12 },
  actionRowText: { flex: 1, fontSize: 15, fontWeight: "500", color: COLORS.text },

  modalOverlay: { flex: 1, justifyContent: "flex-start", alignItems: "flex-end", backgroundColor: "rgba(0,0,0,0.1)" },
  overflowMenu: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 8, marginTop: 60, marginRight: SPACING.lg, width: 160, ...SHADOWS.medium },
  overflowMenuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12 },
  overflowMenuIcon: { marginRight: 10 },
  overflowMenuText: { fontSize: 15, fontWeight: "500", color: COLORS.text },
});
