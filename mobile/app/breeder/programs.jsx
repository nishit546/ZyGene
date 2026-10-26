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
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../../services/api";
import BreederNavigation from "../../components/BreederNavigation";
import LoadingState from "../../components/LoadingState";
import ErrorState from "../../components/ErrorState";

export default function BreedingPrograms() {
  const router = useRouter();

  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [deletingId, setDeletingId] = useState(null);

  // Filter tabs for programs
  const filterTabs = [
    { id: "all", label: "All" },
    { id: "planned", label: "Planned" },
    { id: "active", label: "Active" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  // Fetch breeding programs
  const fetchPrograms = async (isPullToRefresh = false) => {
    try {
      if (isPullToRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setFetchError(false);

      const response = await API.get("/breeder/programs");
      setPrograms(response.data?.programs || []);
    } catch (error) {
      console.log(
        "FETCH BREEDING PROGRAMS ERROR:",
        error.response?.data || error.message
      );
      setFetchError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const onRefresh = useCallback(() => {
    fetchPrograms(true);
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
      case "active":
        return {
          backgroundColor: "#E8F5E9",
          textColor: "#2E7D32",
          dotColor: "#2E7D32",
          label: "Active",
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

  // Confirm and delete program
  const confirmDeleteProgram = (id, programName) => {
    Alert.alert(
      "Delete Breeding Program?",
      `This will permanently remove "${programName || "this breeding program"}" and its related records.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteProgram(id),
        },
      ]
    );
  };

  const handleDeleteProgram = async (id) => {
    try {
      setDeletingId(id);
      const response = await API.delete(`/breeder/programs/${id}`);
      Alert.alert(
        "Success",
        response.data?.message || "Breeding program deleted successfully."
      );
      fetchPrograms();
    } catch (error) {
      console.log(
        "DELETE BREEDING PROGRAM ERROR:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Delete Error",
        error.response?.data?.message ||
          "Could not delete this breeding program. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Render individual program item
  const renderProgramCard = ({ item }) => {
    const statusConfig = getStatusBadge(item.status);
    const isDeleting = deletingId === item.id;

    return (
      <View style={styles.card}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <View style={styles.cropTag}>
              <Ionicons name="leaf-outline" size={13} color="#2E7D32" />
              <Text style={styles.cropTagText}>
                {item.crop_name || "Crop"}
              </Text>
            </View>
            <Text style={styles.programName} numberOfLines={2}>
              {item.program_name}
            </Text>
          </View>

          {/* Status Badge */}
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
            <Text
              style={[styles.statusText, { color: statusConfig.textColor }]}
            >
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Objective */}
        {item.objective ? (
          <View style={styles.sectionRow}>
            <Ionicons
              name="radio-button-on-outline"
              size={15}
              color="#2E7D32"
              style={styles.sectionIcon}
            />
            <View style={styles.sectionContent}>
              <Text style={styles.fieldLabel}>Objective</Text>
              <Text style={styles.fieldValue}>{item.objective}</Text>
            </View>
          </View>
        ) : null}

        {/* Description */}
        {item.description ? (
          <View style={styles.sectionRow}>
            <Ionicons
              name="document-text-outline"
              size={15}
              color="#546E7A"
              style={styles.sectionIcon}
            />
            <View style={styles.sectionContent}>
              <Text style={styles.fieldLabel}>Description</Text>
              <Text style={styles.descriptionText} numberOfLines={3}>
                {item.description}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Date Row */}
        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Ionicons name="calendar-outline" size={14} color="#78909C" />
            <Text style={styles.dateLabel}>Start: </Text>
            <Text style={styles.dateValue}>{formatDate(item.start_date)}</Text>
          </View>

          <View style={styles.dateItem}>
            <Ionicons name="flag-outline" size={14} color="#78909C" />
            <Text style={styles.dateLabel}>End: </Text>
            <Text style={styles.dateValue}>
              {formatDate(item.expected_end_date)}
            </Text>
          </View>
        </View>

        {/* Card Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => router.push(`/breeder/program-details/${item.id}`)}
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
            onPress={() => confirmDeleteProgram(item.id, item.program_name)}
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

  // Filter programs by status and search query
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      // 1. Status filter
      if (selectedStatus !== "all") {
        const itemStatus = (p.status || "").toLowerCase();
        if (itemStatus !== selectedStatus) return false;
      }

      // 2. Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const name = (p.program_name || "").toLowerCase();
      const crop = (p.crop_name || "").toLowerCase();
      const obj = (p.objective || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      return (
        name.includes(q) ||
        crop.includes(q) ||
        obj.includes(q) ||
        desc.includes(q)
      );
    });
  }, [programs, selectedStatus, searchQuery]);

  // Header Component for FlatList
  const renderListHeader = () => (
    <View style={styles.topActionContainer}>
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
          placeholder="Search by program, crop, objective..."
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

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => router.push("/breeder/create-program")}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={22} color="#FFFFFF" />
        <Text style={styles.createButtonText}>+ Create Program</Text>
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

      <View style={styles.listSubheader}>
        <Text style={styles.listSubheaderTitle}>
          {searchQuery || selectedStatus !== "all"
            ? "Filtered Programs"
            : "All Breeding Programs"}
        </Text>
        <Text style={styles.listSubheaderCount}>
          {filteredPrograms.length}{" "}
          {filteredPrograms.length === 1 ? "Program" : "Programs"}
        </Text>
      </View>
    </View>
  );

  // Empty State Component
  const renderEmptyComponent = () => {
    if (loading || fetchError) return null;

    if (searchQuery.trim() || selectedStatus !== "all") {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={54} color="#B0BEC5" />
          <Text style={styles.emptyTitle}>No matching programs found.</Text>
          <Text style={styles.emptySubtitle}>
            No breeding programs matched your search or filter criteria.
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
          <Ionicons name="file-tray-outline" size={48} color="#81C784" />
        </View>
        <Text style={styles.emptyTitle}>No breeding programs yet.</Text>
        <Text style={styles.emptySubtitle}>
          Create your first breeding program to start tracking your work.
        </Text>
        <TouchableOpacity
          style={styles.emptyCreateButton}
          onPress={() => router.push("/breeder/create-program")}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.emptyCreateButtonText}>+ Create Program</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />

      {/* Screen Header Banner */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Breeding Programs</Text>
          <Text style={styles.subtitle}>
            Manage your crop breeding programs
          </Text>
        </View>
      </View>

      {/* Module Navigation */}
      <View style={{ marginTop: 14 }}>
        <BreederNavigation activeTab="programs" />
      </View>

      {/* Main List / States */}
      {loading ? (
        <LoadingState message="Loading breeding programs..." />
      ) : fetchError ? (
        <ErrorState
          title="Unable to load breeding programs"
          message="Could not retrieve breeding programs. Please check your network and try again."
          onRetry={() => fetchPrograms()}
        />
      ) : (
        <FlatList
          data={filteredPrograms}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProgramCard}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F8F5",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#555555",
    fontWeight: "500",
  },

  /* Header */
  header: {
    backgroundColor: "#1B5E20",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  headerTextContainer: {
    paddingHorizontal: 4,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "bold",
    letterSpacing: 0.3,
  },
  subtitle: {
    color: "#D7F0D8",
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },

  /* List & Top Action */
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  topActionContainer: {
    marginTop: 16,
    marginBottom: 12,
  },

  /* Search Container */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CFD8DC",
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#263238",
    paddingVertical: 8,
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

  /* Filter Tabs */
  filterTabsContainer: {
    marginTop: 12,
    marginBottom: 6,
  },
  filterTabsContent: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
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

  /* Empty Clear Button */
  emptyClearButton: {
    backgroundColor: "#E8F5E9",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginTop: 12,
  },
  emptyClearButtonText: {
    color: "#2E7D32",
    fontSize: 14,
    fontWeight: "700",
  },
  createButton: {
    backgroundColor: "#2E7D32",
    borderRadius: 14,
    height: 52,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  listSubheader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  listSubheaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#263238",
  },
  listSubheaderCount: {
    fontSize: 13,
    color: "#607D8B",
    fontWeight: "600",
  },

  /* Card */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#E8F0E8",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  cropTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  cropTagText: {
    color: "#2E7D32",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  programName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#263238",
    lineHeight: 22,
  },

  /* Status Badge */
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  /* Section Rows */
  sectionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
  },
  sectionIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  sectionContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#78909C",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  fieldValue: {
    fontSize: 14,
    color: "#37474F",
    fontWeight: "500",
    marginTop: 1,
  },
  descriptionText: {
    fontSize: 13,
    color: "#546E7A",
    lineHeight: 18,
    marginTop: 2,
  },

  /* Dates */
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F7FAF7",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#EAEFEA",
  },
  dateItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 12,
    color: "#78909C",
    marginLeft: 5,
    fontWeight: "500",
  },
  dateValue: {
    fontSize: 12,
    color: "#263238",
    fontWeight: "600",
  },

  /* Card Actions */
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F4F0",
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  viewDetailsText: {
    color: "#1B5E20",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#FFEBEE",
  },
  deleteButtonText: {
    color: "#D32F2F",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },

  /* Empty State */
  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 30,
    marginTop: 20,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#E8F0E8",
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#263238",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#687076",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  emptyCreateButton: {
    backgroundColor: "#2E7D32",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 2,
  },
  emptyCreateButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 6,
  },
});
