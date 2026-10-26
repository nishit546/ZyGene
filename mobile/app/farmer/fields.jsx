import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  StatusBar,
  RefreshControl,
  Pressable,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../../services/api";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from "../../constants/theme";
import FarmerHeader from "../../components/ui/FarmerHeader";
import ErrorState from "../../components/ErrorState";
import FarmerBottomTabs from "../../components/FarmerBottomTabs";
import FarmerDrawer from "../../components/FarmerDrawer";
import SearchBar from "../../components/ui/SearchBar";
import FilterButton from "../../components/ui/FilterButton";
import FilterModal from "../../components/ui/FilterModal";
import FilterSection from "../../components/ui/FilterSection";
import EmptySearchState from "../../components/ui/EmptySearchState";

export default function FarmerFieldsScreen() {
  const router = useRouter();

  const [fields, setFields] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [filterVisible, setFilterVisible] = useState(false);
  const [sortBy, setSortBy] = useState("Recently added");
  const [tempSortBy, setTempSortBy] = useState("Recently added");
  
  const SORT_OPTIONS = ["Recently added", "Name A-Z", "Name Z-A", "Largest Area"];

  const openFilterModal = () => {
    setTempSortBy(sortBy);
    setFilterVisible(true);
  };

  const applyFilters = () => {
    setSortBy(tempSortBy);
    setFilterVisible(false);
  };

  const resetFilters = () => {
    setTempSortBy("Recently added");
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [fieldsRes, cropsRes] = await Promise.allSettled([
        API.get("/fields"),
        API.get("/crops"),
      ]);

      if (fieldsRes.status === "fulfilled") {
        setFields(fieldsRes.value.data?.fields || []);
      } else {
        throw new Error(
          fieldsRes.reason?.response?.data?.message || "Failed to load fields."
        );
      }

      if (cropsRes.status === "fulfilled") {
        setCrops(cropsRes.value.data?.crops || []);
      }
    } catch (err) {
      console.log("FETCH FIELDS ERROR:", err.message);
      setError(err.message || "Failed to load farm fields.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const totalAcreage = useMemo(() => {
    return fields.reduce((sum, f) => sum + (parseFloat(f.area) || 0), 0);
  }, [fields]);

  const activeFieldsCount = useMemo(() => {
    const activeFieldIds = new Set();
    crops.forEach((c) => {
      if (c.field_id && (c.crop_status || "").toLowerCase() !== "harvested") {
        activeFieldIds.add(c.field_id);
      }
    });
    return activeFieldIds.size;
  }, [crops]);

  const filteredFields = useMemo(() => {
    let result = fields;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((f) => {
        const matchName = (f.field_name || "").toLowerCase().includes(q);
        const matchLoc = (f.location || f.location_name || "").toLowerCase().includes(q);
        return matchName || matchLoc;
      });
    }

    result = [...result]; // Clone for sorting
    if (sortBy === "Name A-Z") {
      result.sort((a, b) => (a.field_name || "").localeCompare(b.field_name || ""));
    } else if (sortBy === "Name Z-A") {
      result.sort((a, b) => (b.field_name || "").localeCompare(a.field_name || ""));
    } else if (sortBy === "Largest Area") {
      result.sort((a, b) => (parseFloat(b.area) || 0) - (parseFloat(a.area) || 0));
    } else {
      result.sort((a, b) => b.id - a.id);
    }
    
    return result;
  }, [fields, searchQuery, sortBy]);

  const renderFieldCard = ({ item }) => {
    const fieldCrops = crops.filter(c => c.field_id === item.id);
    const activeCrops = fieldCrops.filter(c => (c.crop_status || "").toLowerCase() !== "harvested");
    const activeCropCount = activeCrops.length;
    const isFieldActive = activeCropCount > 0;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.fieldCard,
          pressed && { opacity: 0.8, backgroundColor: COLORS.surfaceSubtle }
        ]}
        onPress={() => router.push(`/farmer/field-details/${item.id}`)}
      >
        <View style={styles.fieldCardHeader}>
          <View style={styles.fieldNameRow}>
            <Text style={styles.fieldName}>{item.field_name || "Unnamed Field"}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.borderDark} />
          </View>
          <Text style={styles.locationText}>
            {item.location || item.location_name || "Location not recorded"}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.areaText}>
              {item.area ? `${item.area} ${item.area_unit || item.unit || "acres"}` : "--"}
            </Text>
            {isFieldActive && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>
        </View>

        {fieldCrops.length > 0 && (
          <>
            <View style={styles.cardDivider} />
            <View style={styles.fieldCropsSection}>
              <View style={styles.cropsHeaderRow}>
                <Text style={styles.cropsSectionTitle}>CROPS</Text>
                <Text style={styles.cropsCountTitle}>{fieldCrops.length}</Text>
              </View>
              {fieldCrops.map(crop => {
                const isActive = (crop.crop_status || "").toLowerCase() !== "harvested";
                return (
                  <TouchableOpacity
                    key={crop.id}
                    style={styles.cropRow}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/farmer/crop-details/${crop.id}`)}
                  >
                    <View style={styles.cropRowInfo}>
                      <Text style={styles.cropRowName}>{crop.crop_name}</Text>
                      {crop.variety && <Text style={styles.cropRowVariety}>{crop.variety}</Text>}
                      {isActive && <Text style={styles.cropRowStage}>{crop.current_stage || "Active"}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.borderDark} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <FarmerHeader
        title="Fields"
        subtitle="Manage your farm areas and growing locations."
        showDrawer={true}
        onOpenDrawer={() => setDrawerOpen(true)}
        rightAction={
          <TouchableOpacity
            style={styles.addHeaderBtn}
            onPress={() => router.push("/farmer/create-field")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add new field"
          >
            <Ionicons name="add" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        }
      />

      {/* Field Summary */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>TOTAL FIELDS</Text>
          <Text style={styles.summaryValue}>{String(fields.length).padStart(2, "0")}</Text>
        </View>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>TOTAL AREA</Text>
          <Text style={styles.summaryValue}>{totalAcreage.toFixed(1)} acres</Text>
        </View>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>ACTIVE FIELDS</Text>
          <Text style={styles.summaryValue}>{String(activeFieldsCount).padStart(2, "0")}</Text>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchCol}>
            <SearchBar
              placeholder="Search fields or locations..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={() => setSearchQuery("")}
            />
          </View>
          <View style={styles.filterCol}>
            <FilterButton
              count={0} // Only sorting currently implemented for fields
              label="Sort"
              onPress={openFilterModal}
            />
          </View>
        </View>
        {(searchQuery) && (
          <Text style={styles.resultCount}>
            Showing {filteredFields.length} {filteredFields.length === 1 ? "field" : "fields"}
          </Text>
        )}
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading fields...</Text>
        </View>
      ) : error && fields.length === 0 ? (
        <View style={styles.centerContainer}>
          <ErrorState
            title="Unable to load fields."
            message="Please check your connection and try again."
            onRetry={loadData}
          />
        </View>
      ) : (
        <FlatList
          data={filteredFields}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderFieldCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {searchQuery ? (
                <EmptySearchState
                  title="No fields found"
                  message="Try a different field name or location."
                  onClear={() => setSearchQuery("")}
                />
              ) : (
                <>
                  <Text style={styles.emptyTitle}>No fields yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Create your first field to start managing your crops.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyAddBtn}
                    onPress={() => router.push("/farmer/create-field")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={18} color={COLORS.surface} style={{ marginRight: 6 }} />
                    <Text style={styles.emptyAddBtnText}>Add Field</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          }
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={applyFilters}
        onReset={resetFilters}
        title="Sort Fields"
      >
        <FilterSection
          title="Sort By"
          options={SORT_OPTIONS}
          selectedValue={tempSortBy}
          onSelect={setTempSortBy}
        />
      </FilterModal>

      {/* Drawer */}
      <FarmerDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        farmerName="Farmer"
      />

      {/* Bottom Tabs */}
      <FarmerBottomTabs activeTab="fields" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  centerLoading: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { ...TYPOGRAPHY.supporting, marginTop: SPACING.md },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: SPACING.lg },
  addHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryStrip: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  summaryCol: { flex: 1 },
  summaryLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: "600", marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  searchCol: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  filterCol: {
    width: 90,
  },
  resultCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.base,
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    height: "100%",
    borderWidth: 0,
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
        boxShadow: "none",
      },
    }),
  },
  listContainer: {
    padding: SPACING.lg,
    paddingBottom: 80,
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
  },
  fieldCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.base,
    marginBottom: SPACING.md,
  },
  fieldCardHeader: { marginBottom: 8 },
  fieldNameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  fieldName: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  locationText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  areaText: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  statusBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
  },
  cardDivider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 12 },
  fieldCropsSection: {},
  cropsHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cropsSectionTitle: { fontSize: 11, fontWeight: "600", color: COLORS.textMuted },
  cropsCountTitle: { fontSize: 11, fontWeight: "600", color: COLORS.textMuted },
  cropRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  cropRowInfo: { flex: 1 },
  cropRowName: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  cropRowVariety: { fontSize: 12, color: COLORS.textSecondary },
  cropRowStage: { fontSize: 11, fontWeight: "600", color: COLORS.primaryDark, marginTop: 2 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", marginBottom: 20 },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  emptyAddBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.surface },
});
