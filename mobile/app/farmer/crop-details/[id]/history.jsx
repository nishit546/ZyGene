import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from "../../../../constants/theme";
import API from "../../../../services/api";
import FarmerHeader from "../../../../components/ui/FarmerHeader";
import CropContextBar from "../../../../components/ui/CropContextBar";
import SearchBar from "../../../../components/ui/SearchBar";

const EVENT_COLORS = {
  lifecycle: COLORS.primary, // agricultural green
  measurement: "#607d8b", // blue gray
  irrigation: "#0288d1", // subtle blue
  treatment: "#4caf50", // subtle green
  disease: "#f57c00", // subtle amber
  harvest: "#1b5e20", // deep green
  photo: "#757575", // neutral gray
};

const EVENT_ICONS = {
  lifecycle: "leaf-outline",
  measurement: "bar-chart-outline",
  irrigation: "water-outline",
  treatment: "flask-outline",
  disease: "warning-outline",
  harvest: "basket-outline",
  photo: "camera-outline",
};

export default function CropHistoryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc"); // 'desc' = Newest first, 'asc' = Oldest first

  const [apiErrors, setApiErrors] = useState([]); // Track partial failures
  const fetchHistory = async () => {
    try {
      setLoading(true);
      setApiErrors([]);
      
      const lcRes = await API.get(`/lifecycle/${id}`);
      const lifecycles = lcRes.data?.records || [];
      
      let allEvents = [];

      // Add lifecycle events
      lifecycles.forEach(lc => {
        allEvents.push({
          id: `lc-${lc.id}`,
          type: "lifecycle",
          date: lc.start_date || lc.created_at,
          title: "Lifecycle Stage",
          mainValue: lc.stage_name ? lc.stage_name.replace("_", " ") : "Unknown",
          description: lc.notes || "",
          raw: lc,
          route: `/farmer/crop-details/${id}/lifecycle`,
          lrId: lc.id
        });
      });

      // Fetch all sub-records for all lifecycles
      const subFetchPromises = lifecycles.map(async (lc) => {
        const lrId = lc.id;
        
        const endpoints = [
          { type: 'measurement', url: `/measurements/${lrId}` },
          { type: 'irrigation', url: `/irrigation/${lrId}` },
          { type: 'treatment', url: `/treatments/${lrId}` },
          { type: 'disease', url: `/disease-pest/${lrId}` },
          { type: 'harvest', url: `/harvest/${lrId}` },
          { type: 'photo', url: `/photos/${lrId}` }
        ];

        const results = await Promise.allSettled(
          endpoints.map(ep => API.get(ep.url).then(r => ({ ...r.data, __type: ep.type, __lrId: lrId })))
        );

        results.forEach(res => {
          if (res.status === 'fulfilled') {
            const data = res.value;
            const t = data.__type;
            const lid = data.__lrId;
            
            if (t === 'measurement' && data.measurements) {
              data.measurements.forEach(m => {
                allEvents.push({
                  id: `mes-${m.id}`, type: t, date: m.measurement_date || m.created_at,
                  title: "Measurement", mainValue: `${m.measurement_type}: ${m.measurement_value} ${m.unit||''}`,
                  description: m.notes || "", raw: m, route: `/farmer/crop-details/${id}/measurements/${lid}`
                });
              });
            }
            if (t === 'irrigation' && data.irrigation) {
              data.irrigation.forEach(i => {
                allEvents.push({
                  id: `irr-${i.id}`, type: t, date: i.irrigation_date || i.created_at,
                  title: "Irrigation", mainValue: `${i.water_quantity} ${i.unit||''}`,
                  description: i.irrigation_method || i.notes || "", raw: i, route: `/farmer/crop-details/${id}/irrigation/${lid}`
                });
              });
            }
            if (t === 'treatment' && data.treatments) {
              data.treatments.forEach(tr => {
                allEvents.push({
                  id: `trt-${tr.id}`, type: t, date: tr.application_date || tr.created_at,
                  title: "Treatment", mainValue: tr.treatment_name,
                  description: `${tr.quantity} ${tr.unit||''}${tr.notes ? ' - '+tr.notes : ''}`, raw: tr, route: `/farmer/crop-details/${id}/treatments/${lid}`
                });
              });
            }
            if (t === 'disease' && data.observations) {
              data.observations.forEach(d => {
                allEvents.push({
                  id: `dis-${d.id}`, type: t, date: d.observation_date || d.created_at,
                  title: "Disease/Pest", mainValue: d.name,
                  description: `Severity: ${d.severity||'Unknown'}${d.notes ? ' - '+d.notes : ''}`, raw: d, route: `/farmer/crop-details/${id}/disease-pest/${lid}`
                });
              });
            }
            if (t === 'harvest' && data.harvest) {
              data.harvest.forEach(h => {
                allEvents.push({
                  id: `har-${h.id}`, type: t, date: h.harvest_date || h.created_at,
                  title: "Harvest", mainValue: `${h.total_yield} ${h.yield_unit||''}`,
                  description: h.quality_grade ? `Grade: ${h.quality_grade}` : (h.notes || ""), raw: h, route: `/farmer/crop-details/${id}/harvest/${lid}`
                });
              });
            }
            if (t === 'photo' && data.photos) {
              data.photos.forEach(p => {
                allEvents.push({
                  id: `pho-${p.id}`, type: t, date: p.captured_at || p.created_at,
                  title: "Photo Added", mainValue: p.caption || "Crop Photo",
                  description: p.notes || "", raw: p, route: `/farmer/crop-details/${id}/photos/${lid}`,
                  imageUrl: p.image_url
                });
              });
            }
          } else {
             // Partial failure tracking
             setApiErrors(prev => [...prev, 'Some records failed to load.']);
          }
        });
      });

      await Promise.all(subFetchPromises);
      setEvents(allEvents);

    } catch (err) {
      console.log("Error fetching timeline", err);
      Alert.alert("Error", "Failed to load crop history.");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchHistory();
  }, [id]);

  

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown Date";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const filteredAndSortedEvents = useMemo(() => {
    let result = [...events];

    if (filterType !== "all") {
      result = result.filter(e => e.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => 
        (e.title || "").toLowerCase().includes(q) ||
        (e.mainValue || "").toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [events, searchQuery, filterType, sortOrder]);

  const availableFilters = useMemo(() => {
    const types = new Set(events.map(e => e.type));
    const filters = [{ id: "all", label: "All" }];
    if (types.has("lifecycle")) filters.push({ id: "lifecycle", label: "Lifecycle" });
    if (types.has("measurement")) filters.push({ id: "measurement", label: "Measurements" });
    if (types.has("photo")) filters.push({ id: "photo", label: "Photos" });
    if (types.has("irrigation")) filters.push({ id: "irrigation", label: "Irrigation" });
    if (types.has("treatment")) filters.push({ id: "treatment", label: "Treatments" });
    if (types.has("disease")) filters.push({ id: "disease", label: "Disease/Pest" });
    if (types.has("harvest")) filters.push({ id: "harvest", label: "Harvest" });
    return filters;
  }, [events]);

  const renderEvent = ({ item, index }) => {
    const isLast = index === filteredAndSortedEvents.length - 1;
    const color = EVENT_COLORS[item.type] || COLORS.primary;
    const icon = EVENT_ICONS[item.type] || "document-text-outline";

    return (
      <View style={styles.timelineRow}>
        {/* Timeline Line & Node */}
        <View style={styles.nodeColumn}>
          <View style={styles.dateLabelWrapper}>
            <Text style={styles.dateLabelText}>{formatDate(item.date)}</Text>
          </View>
          <View style={[styles.nodeIndicator, { borderColor: color }]}>
             <Ionicons name={icon} size={12} color={color} />
          </View>
          {!isLast && <View style={[styles.timelineLine, { backgroundColor: COLORS.borderLight }]} />}
        </View>

        {/* Card Content */}
        <TouchableOpacity 
          style={styles.eventCard}
          activeOpacity={0.7}
          onPress={() => router.push(item.route)}
          accessibilityRole="button"
          accessibilityLabel={`${formatDate(item.date)} ${item.title} record`}
        >
          <Text style={[styles.eventTitle, { color }]}>{item.title}</Text>
          <Text style={styles.eventMainValue} numberOfLines={2}>{item.mainValue}</Text>
          {!!item.description && (
            <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text>
          )}
          {item.type === "photo" && item.imageUrl && (
            <View style={styles.photoThumbnail}>
               <Ionicons name="image-outline" size={24} color={COLORS.textMuted} />
               {/* Real image component could go here if url is valid */}
            </View>
          )}
          
          <View style={styles.viewAction}>
            <Text style={styles.viewActionText}>View</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary} />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      
      <FarmerHeader
        title="Crop History"
        showBack={true}
        onBack={() => router.back()}
        compact
      />

      <CropContextBar cropId={id} />

      <View style={styles.controlsArea}>
        <SearchBar 
          placeholder="Search history..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery("")}
        />
        
        <View style={styles.filtersRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
            {availableFilters.map(f => (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterPill, filterType === f.id && styles.filterPillActive]}
                onPress={() => setFilterType(f.id)}
              >
                <Text style={[styles.filterPillText, filterType === f.id && styles.filterPillTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity 
             style={styles.sortBtn}
             onPress={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
          >
             <Ionicons name={sortOrder === "desc" ? "arrow-down-outline" : "arrow-up-outline"} size={16} color={COLORS.textSecondary} />
             <Text style={styles.sortBtnText}>{sortOrder === "desc" ? "Newest" : "Oldest"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.countText}>
            Showing {filteredAndSortedEvents.length} {filteredAndSortedEvents.length === 1 ? "activity" : "activities"}
          </Text>
          {apiErrors.length > 0 && (
            <Text style={styles.errorWarning}>Some records failed to load</Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading chronological history...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No crop history found</Text>
              <Text style={styles.emptyDesc}>Records added to this crop will appear here chronologically.</Text>
            </View>
          }
        />
      )}

      {/* Quick Add at the bottom */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
           style={styles.quickAddBtn}
           onPress={() => router.push(`/farmer/field-work?cropId=${id}`)}
           accessibilityRole="button"
           accessibilityLabel="Add Record"
        >
          <Ionicons name="add" size={20} color={COLORS.surface} />
          <Text style={styles.quickAddText}>Add Record</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
  },
  controlsArea: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.md,
  },
  pillsScroll: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: COLORS.primaryLight + "20",
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  filterPillTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  sortBtnText: {
    fontSize: 13,
    marginLeft: 4,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.sm,
    paddingHorizontal: 4,
  },
  countText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  errorWarning: {
    fontSize: 12,
    color: COLORS.danger,
    fontStyle: "italic",
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl * 2, // Space for bottom bar
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },
  timelineRow: {
    flexDirection: "row",
    marginBottom: SPACING.md,
  },
  nodeColumn: {
    width: 60,
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  dateLabelWrapper: {
    marginBottom: 4,
  },
  dateLabelText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  nodeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    marginTop: 4,
    marginBottom: -SPACING.md, // Connect to next node
  },
  eventCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  eventMainValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
    textTransform: "capitalize",
  },
  eventDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  photoThumbnail: {
    marginTop: 8,
    width: 60,
    height: 60,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  viewAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  viewActionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
    marginRight: 2,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    paddingBottom: Platform.OS === "ios" ? 34 : SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.medium,
  },
  quickAddBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: RADIUS.md,
  },
  quickAddText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  }
});
