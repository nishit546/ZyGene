import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../../services/api";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from "../../constants/theme";
import FarmerHeader from "../../components/ui/FarmerHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import ErrorState from "../../components/ErrorState";
import FarmerBottomTabs from "../../components/FarmerBottomTabs";
import FarmerDrawer from "../../components/FarmerDrawer";
import CropLifecycleProgress from "../../components/ui/CropLifecycleProgress";
import SearchBar from "../../components/ui/SearchBar";
import FilterButton from "../../components/ui/FilterButton";
import FilterModal from "../../components/ui/FilterModal";
import FilterSection from "../../components/ui/FilterSection";
import EmptySearchState from "../../components/ui/EmptySearchState";

export default function FarmerCropsScreen() {
  const router = useRouter();

  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);

  // Active filters
  const [activeStatus, setActiveStatus] = useState("All");
  const [activeStage, setActiveStage] = useState("All");
  const [sortBy, setSortBy] = useState("Recently added");

  // Temp filters (while modal is open)
  const [tempStatus, setTempStatus] = useState("All");
  const [tempStage, setTempStage] = useState("All");
  const [tempSortBy, setTempSortBy] = useState("Recently added");

  const STAGE_OPTIONS = ["All", "Seed Sowing", "Germination", "Seedling", "Vegetative", "Flowering", "Fruiting", "Maturity", "Harvest"];
  const STATUS_OPTIONS = ["All", "Active", "Completed"];
  const SORT_OPTIONS = ["Recently added", "Name A-Z", "Name Z-A"];

  const activeFilterCount = (activeStatus !== "All" ? 1 : 0) + (activeStage !== "All" ? 1 : 0);

  const openFilterModal = () => {
    setTempStatus(activeStatus);
    setTempStage(activeStage);
    setTempSortBy(sortBy);
    setFilterVisible(true);
  };

  const applyFilters = () => {
    setActiveStatus(tempStatus);
    setActiveStage(tempStage);
    setSortBy(tempSortBy);
    setFilterVisible(false);
  };

  const resetFilters = () => {
    setTempStatus("All");
    setTempStage("All");
    setTempSortBy("Recently added");
    // We don't apply immediately, let user press Apply. Or if reset should apply immediately:
    // Actually, prompt says "Reset All" clears both, but in modal Reset usually clears temp.
  };


  const loadCrops = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await API.get("/crops");
      setCrops(res.data?.crops || []);
    } catch (err) {
      console.log("FETCH CROPS ERROR:", err.response?.data || err.message);
      setError(
        err.response?.data?.message || "Failed to load crops. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCrops();
  }, [loadCrops]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadCrops();
    } finally {
      setRefreshing(false);
    }
  };

  const stats = useMemo(() => {
    const total = crops.length;
    let active = 0;
    let harvested = 0;
    crops.forEach((c) => {
      if ((c.crop_status || "").toLowerCase() === "harvested") {
        harvested++;
      } else {
        active++;
      }
    });
    return { total, active, harvested };
  }, [crops]);

  const filteredCrops = useMemo(() => {
    let result = crops.filter((item) => {
      const status = (item.crop_status || "active").toLowerCase();
      const stage = (item.current_stage || "Vegetative").toLowerCase();

      // Status filter
      if (activeStatus === "Active" && status === "harvested") return false;
      if (activeStatus === "Completed" && status !== "harvested") return false;

      // Stage filter
      if (activeStage !== "All" && stage !== activeStage.toLowerCase()) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (item.crop_name || "").toLowerCase().includes(q);
        const matchVariety = (item.variety || "").toLowerCase().includes(q);
        const matchField = (item.field_name || "").toLowerCase().includes(q);
        if (!matchName && !matchVariety && !matchField) return false;
      }

      return true;
    });

    // Sort
    if (sortBy === "Name A-Z") {
      result.sort((a, b) => (a.crop_name || "").localeCompare(b.crop_name || ""));
    } else if (sortBy === "Name Z-A") {
      result.sort((a, b) => (b.crop_name || "").localeCompare(a.crop_name || ""));
    } else {
      // Recently added (assume ID or createdAt)
      result.sort((a, b) => b.id - a.id);
    }

    return result;
  }, [crops, activeStatus, activeStage, sortBy, searchQuery]);

  const renderCropItem = ({ item }) => {
    const isHarvested = (item.crop_status || "").toLowerCase() === "harvested";
    const stage = item.current_stage || "Vegetative";

    return (
      <Pressable
        style={({ pressed }) => [
          styles.cropCard,
          pressed && { opacity: 0.8, backgroundColor: COLORS.surfaceSubtle },
        ]}
        onPress={() => router.push(`/farmer/crop-details/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cropName}>{item.crop_name || "Unnamed Crop"}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.borderDark} />
          </View>
        </View>

        <View style={styles.stageSection}>
          <CropLifecycleProgress currentStage={stage} />
        </View>

        <View style={styles.cardMetaRow}>
          <View style={styles.metaCol}>
            <View style={styles.metaIconRow}>
              <Ionicons name="map-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.cropField} numberOfLines={1}>
                {item.field_name || "Unassigned"}
              </Text>
            </View>
            {item.variety ? (
              <Text style={styles.cropVariety} numberOfLines={1}>{item.variety}</Text>
            ) : null}
          </View>
          <View style={styles.metaStatusCol}>
            <StatusBadge status={isHarvested ? "Harvested" : "Active"} size="sm" />
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <Text style={styles.sownText}>
            Sown:{" "}
            <Text style={styles.sownValue}>
              {item.sowing_date
                ? String(item.sowing_date).split("T")[0]
                : "--"}
            </Text>
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <FarmerHeader
        title="My Crops"
        subtitle="Track your crops from sowing to harvest"
        showDrawer={true}
        onOpenDrawer={() => setDrawerOpen(true)}
        rightAction={
          <TouchableOpacity
            style={styles.addHeaderBtn}
            onPress={() => router.push("/farmer/create-crop")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add new crop"
          >
            <Ionicons name="add" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        }
      />

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{String(stats.total).padStart(2, "0")}</Text>
          <Text style={styles.summaryLabel}>TOTAL CROPS</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{String(stats.active).padStart(2, "0")}</Text>
          <Text style={styles.summaryLabel}>ACTIVE</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{String(stats.harvested).padStart(2, "0")}</Text>
          <Text style={styles.summaryLabel}>HARVESTED</Text>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <View style={styles.searchCol}>
            <SearchBar
              placeholder="Search crops..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={() => setSearchQuery("")}
            />
          </View>
          <View style={styles.filterCol}>
            <FilterButton
              count={activeFilterCount}
              onPress={openFilterModal}
            />
          </View>
        </View>
        {(searchQuery || activeFilterCount > 0) && (
          <Text style={styles.resultCount}>
            Showing {filteredCrops.length} {filteredCrops.length === 1 ? "crop" : "crops"}
          </Text>
        )}
      </View>

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading crops catalog...</Text>
        </View>
      ) : error && crops.length === 0 ? (
        <View style={styles.centerContainer}>
          <ErrorState
            title="Unable to load crops"
            message={error}
            onRetry={loadCrops}
          />
        </View>
      ) : (
        <FlatList
          data={filteredCrops}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCropItem}
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
              {searchQuery || activeFilterCount > 0 ? (
                <EmptySearchState
                  title="No crops found"
                  message="Try a different crop name, variety, or filter."
                  onClear={() => {
                    setSearchQuery("");
                    setActiveStatus("All");
                    setActiveStage("All");
                  }}
                />
              ) : (
                <>
                  <Text style={styles.emptyTitle}>No crops yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Create your first crop to start tracking its lifecycle.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyAddBtn}
                    onPress={() => router.push("/farmer/create-crop")}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.emptyAddBtnText}>Add Crop</Text>
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
        title="Filter & Sort Crops"
      >
        <FilterSection
          title="Lifecycle Stage"
          options={STAGE_OPTIONS}
          selectedValue={tempStage}
          onSelect={setTempStage}
        />
        <FilterSection
          title="Status"
          options={STATUS_OPTIONS}
          selectedValue={tempStatus}
          onSelect={setTempStatus}
        />
        <FilterSection
          title="Sort By"
          options={SORT_OPTIONS}
          selectedValue={tempSortBy}
          onSelect={setTempSortBy}
        />
      </FilterModal>

      {/* Hamburger Drawer */}
      <FarmerDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Fixed 4-item bottom navigation */}
      <FarmerBottomTabs activeTab="crops" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  addHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.borderLight,
    alignSelf: "center",
  },
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
  searchSection: {
    paddingHorizontal: SPACING.lg, // 20px
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    padding: 0,
    borderWidth: 0,
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
        boxShadow: "none",
      },
    }),
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  listContainer: {
    paddingHorizontal: SPACING.lg, // 20px
    paddingTop: SPACING.base,
    paddingBottom: 32,
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
  },
  cropCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
    marginBottom: 10,
    ...SHADOWS.subtle,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  cropName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  stageSection: {
    marginTop: 10,
  },
  cardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 12,
  },
  metaCol: {
    flex: 1,
  },
  metaIconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  cropField: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  cropVariety: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 18, // Aligns text with field text (indented past icon)
  },
  metaStatusCol: {
    alignItems: "flex-end",
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sownText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sownValue: {
    fontWeight: "600",
    color: COLORS.text,
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  emptyContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.supporting,
    textAlign: "center",
    marginBottom: SPACING.base,
  },
  emptyAddBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textLight,
  },
});