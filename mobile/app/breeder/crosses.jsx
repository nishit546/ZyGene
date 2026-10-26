import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../../services/api";
import BreederNavigation from "../../components/BreederNavigation";
import LoadingState from "../../components/LoadingState";
import ErrorState from "../../components/ErrorState";

export default function BreedingCrosses() {
  const router = useRouter();

  const [crosses, setCrosses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [deletingId, setDeletingId] = useState(null);

  // Status options for filter tabs
  const filterTabs = [
    { id: "all", label: "All" },
    { id: "planned", label: "Planned" },
    { id: "successful", label: "Successful" },
    { id: "under_evaluation", label: "Evaluating" },
    { id: "failed", label: "Failed" },
  ];

  // Fetch breeding crosses
  const fetchCrosses = async (isPullToRefresh = false) => {
    try {
      if (isPullToRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setFetchError(false);

      const response = await API.get("/breeder/crosses");
      setCrosses(response.data?.crosses || []);
    } catch (error) {
      console.log(
        "FETCH BREEDING CROSSES ERROR:",
        error.response?.data || error.message
      );
      setFetchError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCrosses();
  }, []);

  const onRefresh = useCallback(() => {
    fetchCrosses(true);
  }, []);

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Status visual badge styling
  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "successful":
        return {
          backgroundColor: "#E8F5E9",
          textColor: "#2E7D32",
          dotColor: "#2E7D32",
          label: "Successful",
        };
      case "under_evaluation":
        return {
          backgroundColor: "#FFF8E1",
          textColor: "#F57F17",
          dotColor: "#F57F17",
          label: "Under Evaluation",
        };
      case "failed":
        return {
          backgroundColor: "#FFEBEE",
          textColor: "#C62828",
          dotColor: "#C62828",
          label: "Failed",
        };
      case "planned":
      default:
        return {
          backgroundColor: "#E3F2FD",
          textColor: "#1565C0",
          dotColor: "#1565C0",
          label: "Planned",
        };
    }
  };

  // Delete cross handler
  const confirmDeleteCross = (id, crossCode) => {
    Alert.alert(
      "Delete Breeding Cross?",
      `This will permanently remove this breeding cross${
        crossCode ? ` (${crossCode})` : ""
      } and its related records.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteCross(id),
        },
      ]
    );
  };

  const handleDeleteCross = async (id) => {
    try {
      setDeletingId(id);
      const response = await API.delete(`/breeder/crosses/${id}`);
      Alert.alert(
        "Success",
        response.data?.message || "Breeding cross deleted successfully."
      );
      fetchCrosses();
    } catch (error) {
      console.log(
        "DELETE BREEDING CROSS ERROR:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Delete Failed",
        error.response?.data?.message ||
          "Could not delete this breeding cross. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Filter crosses by status filter and search query across multiple fields
  const filteredCrosses = useMemo(() => {
    return crosses.filter((c) => {
      // 1. Status Filter
      if (selectedStatus !== "all") {
        const itemStatus = (c.success_status || "").toLowerCase();
        if (itemStatus !== selectedStatus) return false;
      }

      // 2. Search Query Filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const code = (c.cross_code || "").toLowerCase();
      const p1 = (c.parent_1 || "").toLowerCase();
      const p2 = (c.parent_2 || "").toLowerCase();
      const prog = (c.program_name || "").toLowerCase();
      const gen = (c.generation || "").toLowerCase();
      return (
        code.includes(q) ||
        p1.includes(q) ||
        p2.includes(q) ||
        prog.includes(q) ||
        gen.includes(q)
      );
    });
  }, [crosses, selectedStatus, searchQuery]);

  // Render individual cross card
  const renderCrossCard = ({ item }) => {
    const statusConfig = getStatusBadge(item.success_status);
    const isDeleting = deletingId === item.id;

    return (
      <View style={styles.card}>
        {/* Top Header: Cross Code & Status Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.codeContainer}>
            <Ionicons name="git-merge" size={16} color="#1B5E20" />
            <Text style={styles.crossCode}>{item.cross_code || "CROSS"}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusConfig.backgroundColor },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusConfig.dotColor },
              ]}
            />
            <Text style={[styles.statusText, { color: statusConfig.textColor }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Parents Row: Parent 1 × Parent 2 */}
        <View style={styles.parentsRow}>
          <View style={styles.parentBox}>
            <Text style={styles.parentLabel}>Female Parent (♀)</Text>
            <Text style={styles.parentName} numberOfLines={1}>
              {item.parent_1 || "Unknown Parent 1"}
            </Text>
          </View>

          <View style={styles.crossSymbolWrapper}>
            <Text style={styles.crossSymbol}>×</Text>
          </View>

          <View style={styles.parentBox}>
            <Text style={styles.parentLabel}>Male Parent (♂)</Text>
            <Text style={styles.parentName} numberOfLines={1}>
              {item.parent_2 || "Unknown Parent 2"}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          {/* Program Name */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons name="leaf-outline" size={15} color="#2E7D32" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Program</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {item.program_name || "Unassigned"}
              </Text>
            </View>
          </View>

          {/* Generation & Date in side-by-side columns */}
          <View style={styles.twoColumnGrid}>
            <View style={styles.columnItem}>
              <View style={styles.detailIconBox}>
                <Ionicons name="layers-outline" size={15} color="#1565C0" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Generation</Text>
                <Text style={styles.generationTag}>
                  {item.generation || "F1"}
                </Text>
              </View>
            </View>

            <View style={styles.columnItem}>
              <View style={styles.detailIconBox}>
                <Ionicons name="calendar-outline" size={15} color="#546E7A" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Cross Date</Text>
                <Text style={styles.detailValue}>
                  {formatDate(item.cross_date)}
                </Text>
              </View>
            </View>
          </View>

          {/* Objective */}
          {item.objective ? (
            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Ionicons
                  name="disc-outline"
                  size={15}
                  color="#D84315"
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Objective</Text>
                <Text style={styles.detailValue} numberOfLines={2}>
                  {item.objective}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Actions Row */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => router.push(`/breeder/cross/${item.id}`)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="information-circle-outline"
              size={17}
              color="#1B5E20"
            />
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => confirmDeleteCross(item.id, item.cross_code)}
            disabled={isDeleting}
            activeOpacity={0.7}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#D32F2F" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color="#D32F2F" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Header Component for FlatList
  const renderListHeader = () => (
    <View style={styles.listHeaderContainer}>
      {/* Search Input Box */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={19}
          color="#78909C"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by code, parent, program, generation..."
          placeholderTextColor="#90A4AE"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
          autoCapitalize="none"
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={styles.clearSearchButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={18} color="#78909C" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Prominent Top Action: Create Cross Button */}
      <TouchableOpacity
        style={styles.createCrossButton}
        onPress={() => router.push("/breeder/create-cross")}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={22} color="#FFFFFF" />
        <Text style={styles.createCrossButtonText}>+ Create Cross</Text>
      </TouchableOpacity>

      {/* Status Filter Horizontal Tabs */}
      <View style={styles.filterTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContent}
        >
          {filterTabs.map((tab) => {
            const isSelected = selectedStatus === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.filterTab,
                  isSelected && styles.filterTabActive,
                ]}
                onPress={() => setSelectedStatus(tab.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isSelected && styles.filterTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Section Title & Item Count */}
      <View style={styles.countRow}>
        <Text style={styles.sectionTitle}>
          {searchQuery || selectedStatus !== "all"
            ? "Filtered Crosses"
            : "All Crosses"}
        </Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{filteredCrosses.length}</Text>
        </View>
      </View>
    </View>
  );

  // Empty List Component
  const renderEmptyComponent = () => {
    if (loading || fetchError) return null;

    if (searchQuery.trim() || selectedStatus !== "all") {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={54} color="#B0BEC5" />
          <Text style={styles.emptyTitle}>No matching crosses found.</Text>
          <Text style={styles.emptySubtitle}>
            No breeding crosses matched your search or filter criteria.
          </Text>
          <TouchableOpacity
            style={styles.emptyClearButton}
            onPress={() => {
              setSearchQuery("");
              setSelectedStatus("all");
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyClearButtonText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="git-merge-outline" size={54} color="#2E7D32" />
        </View>
        <Text style={styles.emptyTitle}>No breeding crosses yet.</Text>
        <Text style={styles.emptySubtitle}>
          Record your first parent cross to track genetic material.
        </Text>
        <TouchableOpacity
          style={styles.emptyActionBtn}
          onPress={() => router.push("/breeder/create-cross")}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.emptyActionBtnText}>+ Create Cross</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />

      {/* Dark Green Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Breeding Crosses</Text>
        <Text style={styles.headerSubtitle}>
          Manage parent crosses and breeding generations
        </Text>
      </View>

      {/* Module Navigation */}
      <View style={{ marginTop: 14 }}>
        <BreederNavigation activeTab="crosses" />
      </View>

      {/* Main Content / States */}
      {loading && !refreshing ? (
        <LoadingState message="Loading breeding crosses..." />
      ) : fetchError ? (
        <ErrorState
          title="Unable to load breeding crosses"
          message="Could not retrieve breeding crosses. Please check your network and try again."
          onRetry={() => fetchCrosses()}
        />
      ) : (
        <FlatList
          data={filteredCrosses}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCrossCard}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2E7D32"]}
              tintColor="#2E7D32"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1B5E20",
  },

  /* Header */
  header: {
    backgroundColor: "#1B5E20",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "bold",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: "#D7F0D8",
    fontSize: 14,
    marginTop: 4,
    lineHeight: 19,
  },

  /* List & Header Controls */
  listContent: {
    paddingBottom: 36,
  },
  listHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  /* Search Box */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1.2,
    borderColor: "#E0E7E0",
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#263238",
  },
  clearSearchButton: {
    padding: 4,
  },

  /* Prominent Create Cross Button */
  createCrossButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2E7D32",
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 3,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    marginBottom: 14,
  },
  createCrossButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
    letterSpacing: 0.3,
  },

  /* Filter Tabs */
  filterTabsContainer: {
    marginBottom: 14,
  },
  filterTabsContent: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#ECEFF1",
    borderWidth: 1,
    borderColor: "#CFD8DC",
  },
  filterTabActive: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },
  filterTabText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#546E7A",
  },
  filterTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  /* Count & Section Title Row */
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#37474F",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2E7D32",
  },

  /* Card */
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },

  /* Card Header */
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F8F1",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  crossCode: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1B5E20",
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 12,
  },
  statusDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  /* Parents Display */
  parentsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAF9",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E8EFE8",
    marginBottom: 12,
  },
  parentBox: {
    flex: 1,
  },
  parentLabel: {
    fontSize: 10.5,
    color: "#78909C",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  parentName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#263238",
  },
  crossSymbolWrapper: {
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  crossSymbol: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2E7D32",
  },

  cardDivider: {
    height: 1,
    backgroundColor: "#F0F4F0",
    marginBottom: 12,
  },

  /* Details Grid */
  detailsGrid: {
    gap: 8,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  detailIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: "#F4F7F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginTop: 1,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: "#78909C",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 13.5,
    color: "#37474F",
    fontWeight: "500",
    marginTop: 1,
  },

  twoColumnGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  columnItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  generationTag: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1565C0",
    marginTop: 1,
  },

  /* Card Actions */
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F0F4F0",
    paddingTop: 12,
    gap: 10,
  },
  viewDetailsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  viewDetailsText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#1B5E20",
    marginLeft: 6,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFEBEE",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EF9A9A",
  },
  deleteButtonText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#D32F2F",
    marginLeft: 5,
  },

  /* Center Loading */
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: "#2E7D32",
    fontWeight: "600",
  },

  /* Empty State */
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#263238",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#78909C",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E7D32",
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  emptyActionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },
  emptyClearButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: "#ECEFF1",
  },
  emptyClearButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#455A64",
  },
});
