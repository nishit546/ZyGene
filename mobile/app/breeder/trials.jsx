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

export default function BreedingTrials() {
  const router = useRouter();

  const [trials, setTrials] = useState([]);
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
    { id: "ongoing", label: "Ongoing" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  // Fetch breeding trials
  const fetchTrials = async (isPullToRefresh = false) => {
    try {
      if (isPullToRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setFetchError(false);

      const response = await API.get("/breeder/trials");
      setTrials(response.data?.trials || []);
    } catch (error) {
      console.log(
        "FETCH BREEDING TRIALS ERROR:",
        error.response?.data || error.message
      );
      setFetchError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrials();
  }, []);

  const onRefresh = useCallback(() => {
    fetchTrials(true);
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
      case "ongoing":
        return {
          backgroundColor: "#E8F5E9",
          textColor: "#2E7D32",
          dotColor: "#2E7D32",
          label: "Ongoing",
        };
      case "completed":
        return {
          backgroundColor: "#E0F2F1",
          textColor: "#00695C",
          dotColor: "#00695C",
          label: "Completed",
        };
      case "cancelled":
        return {
          backgroundColor: "#FFEBEE",
          textColor: "#C62828",
          dotColor: "#C62828",
          label: "Cancelled",
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

  // Delete trial handler
  const confirmDeleteTrial = (id, trialName) => {
    Alert.alert(
      "Delete Breeding Trial?",
      `This will permanently remove this breeding trial${
        trialName ? ` "${trialName}"` : ""
      } and its related observations.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteTrial(id),
        },
      ]
    );
  };

  const handleDeleteTrial = async (id) => {
    try {
      setDeletingId(id);
      const response = await API.delete(`/breeder/trials/${id}`);
      Alert.alert(
        "Success",
        response.data?.message || "Breeding trial deleted successfully."
      );
      fetchTrials();
    } catch (error) {
      console.log(
        "DELETE BREEDING TRIAL ERROR:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Delete Failed",
        error.response?.data?.message ||
          "Could not delete this breeding trial. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Filter trials by search query and status filter
  const filteredTrials = useMemo(() => {
    return trials.filter((t) => {
      // 1. Status Filter
      if (selectedStatus !== "all") {
        const itemStatus = (t.status || "").toLowerCase();
        if (itemStatus !== selectedStatus) return false;
      }

      // 2. Search Query Filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const name = (t.trial_name || "").toLowerCase();
      const prog = (t.program_name || "").toLowerCase();
      const cross = (t.cross_code || "").toLowerCase();
      const loc = (t.location || "").toLowerCase();
      const season = (t.season || "").toLowerCase();
      const status = (t.status || "").toLowerCase();

      return (
        name.includes(q) ||
        prog.includes(q) ||
        cross.includes(q) ||
        loc.includes(q) ||
        season.includes(q) ||
        status.includes(q)
      );
    });
  }, [trials, selectedStatus, searchQuery]);

  // Render individual trial card
  const renderTrialCard = ({ item }) => {
    const statusConfig = getStatusBadge(item.status);
    const isDeleting = deletingId === item.id;

    return (
      <View style={styles.card}>
        {/* Card Top: Title & Status Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.trialName} numberOfLines={2}>
              {item.trial_name}
            </Text>
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

        {/* Tags Row: Program & Cross Code */}
        <View style={styles.tagsRow}>
          {item.program_name ? (
            <View style={styles.programTag}>
              <Ionicons name="leaf-outline" size={13} color="#2E7D32" />
              <Text style={styles.programTagText} numberOfLines={1}>
                {item.program_name}
              </Text>
            </View>
          ) : null}

          {item.cross_code ? (
            <View style={styles.crossTag}>
              <Ionicons name="git-merge" size={12} color="#1565C0" />
              <Text style={styles.crossTagText}>
                {item.cross_code}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          {/* Location & Season */}
          <View style={styles.twoColumnGrid}>
            <View style={styles.gridItem}>
              <View style={styles.detailIconBox}>
                <Ionicons name="location-outline" size={15} color="#E65100" />
              </View>
              <View style={styles.gridItemContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {item.location || "Unspecified"}
                </Text>
              </View>
            </View>

            <View style={styles.gridItem}>
              <View style={styles.detailIconBox}>
                <Ionicons name="partly-sunny-outline" size={15} color="#F57F17" />
              </View>
              <View style={styles.gridItemContent}>
                <Text style={styles.detailLabel}>Season</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {item.season || "Unspecified"}
                </Text>
              </View>
            </View>
          </View>

          {/* Dates: Start & End */}
          <View style={styles.datesBox}>
            <View style={styles.dateCol}>
              <Ionicons name="calendar-outline" size={13} color="#546E7A" />
              <Text style={styles.dateLabel}>Start: </Text>
              <Text style={styles.dateValue}>{formatDate(item.start_date)}</Text>
            </View>

            <View style={styles.dateDivider} />

            <View style={styles.dateCol}>
              <Ionicons name="flag-outline" size={13} color="#546E7A" />
              <Text style={styles.dateLabel}>End: </Text>
              <Text style={styles.dateValue}>{formatDate(item.end_date)}</Text>
            </View>
          </View>

          {/* Notes Preview */}
          {item.notes ? (
            <View style={styles.notesRow}>
              <Ionicons
                name="document-text-outline"
                size={14}
                color="#78909C"
                style={styles.notesIcon}
              />
              <Text style={styles.notesText} numberOfLines={2}>
                {item.notes}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Card Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => router.push(`/breeder/trial/${item.id}`)}
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
            onPress={() => confirmDeleteTrial(item.id, item.trial_name)}
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
          placeholder="Search by name, program, cross, location..."
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

      {/* Prominent Top Action: Create Trial Button */}
      <TouchableOpacity
        style={styles.createTrialButton}
        onPress={() => router.push("/breeder/create-trial")}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={22} color="#FFFFFF" />
        <Text style={styles.createTrialButtonText}>+ Create Trial</Text>
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
                  isSelected && styles.filterTabSelected,
                ]}
                onPress={() => setSelectedStatus(tab.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isSelected && styles.filterTabTextSelected,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Count & Section Title Row */}
      <View style={styles.countRow}>
        <Text style={styles.sectionTitle}>
          {selectedStatus !== "all" || searchQuery
            ? "Filtered Trials"
            : "All Trials"}
        </Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{filteredTrials.length}</Text>
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
          <Text style={styles.emptyTitle}>No matching trials found.</Text>
          <Text style={styles.emptySubtitle}>
            No breeding trials found matching your current filter and search criteria.
          </Text>
          <TouchableOpacity
            style={styles.emptyResetButton}
            onPress={() => {
              setSearchQuery("");
              setSelectedStatus("all");
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyResetButtonText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="flask-outline" size={54} color="#2E7D32" />
        </View>
        <Text style={styles.emptyTitle}>No breeding trials yet.</Text>
        <Text style={styles.emptySubtitle}>
          Set up your first field trial to begin evaluating candidate crops.
        </Text>
        <TouchableOpacity
          style={styles.emptyActionBtn}
          onPress={() => router.push("/breeder/create-trial")}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.emptyActionBtnText}>+ Create Trial</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />

      {/* Header */}
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
        <Text style={styles.headerTitle}>Breeding Trials</Text>
        <Text style={styles.headerSubtitle}>
          Track field trials and breeding performance
        </Text>
      </View>

      {/* Module Navigation */}
      <View style={{ marginTop: 14 }}>
        <BreederNavigation activeTab="trials" />
      </View>

      {/* Main Content / States */}
      {loading && !refreshing ? (
        <LoadingState message="Loading breeding trials..." />
      ) : fetchError ? (
        <ErrorState
          title="Unable to load breeding trials"
          message="Could not retrieve breeding trials. Please check your network and try again."
          onRetry={() => fetchTrials()}
        />
      ) : (
        <FlatList
          data={filteredTrials}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTrialCard}
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

  /* List Content */
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
    borderWidth: 0,
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
        boxShadow: "none",
      },
    }),
  },
  clearSearchButton: {
    padding: 4,
  },

  /* Create Trial Button */
  createTrialButton: {
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
    marginBottom: 16,
  },
  createTrialButtonText: {
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
    gap: 8,
    paddingRight: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#CFD8DC",
  },
  filterTabSelected: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#546E7A",
  },
  filterTabTextSelected: {
    color: "#FFFFFF",
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  trialName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B5E20",
    lineHeight: 23,
    letterSpacing: 0.2,
  },

  /* Status Badge */
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

  /* Tags Row */
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  programTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: "65%",
  },
  programTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2E7D32",
    marginLeft: 4,
  },
  crossTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  crossTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1565C0",
    marginLeft: 4,
  },

  /* Details Grid */
  detailsGrid: {
    gap: 10,
    marginBottom: 14,
  },
  twoColumnGrid: {
    flexDirection: "row",
    gap: 12,
  },
  gridItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  detailIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "#F4F7F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  gridItemContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10.5,
    color: "#78909C",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 13,
    color: "#263238",
    fontWeight: "600",
    marginTop: 1,
  },

  /* Dates Box */
  datesBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAF9",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E8EFE8",
  },
  dateCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 12,
    color: "#78909C",
    marginLeft: 4,
  },
  dateValue: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#37474F",
  },
  dateDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#CFD8DC",
    marginHorizontal: 10,
  },

  /* Notes Row */
  notesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FAFCFA",
    padding: 8,
    borderRadius: 8,
  },
  notesIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: "#607D8B",
    lineHeight: 17,
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
  emptyResetButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: "#ECEFF1",
  },
  emptyResetButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#455A64",
  },
});
