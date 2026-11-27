import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../../services/api";
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from "../../constants/theme";
import FarmerHeader from "../../components/ui/FarmerHeader";
import FarmMapView from "../../components/FarmMapView";
import SyncStatus from "../../components/SyncStatus";
import useNetworkStatus from "../../hooks/useNetworkStatus";
import { getCachedFields, cacheFields } from "../../services/offlineStorage";
import { getCurrentUserId } from "../../services/auth";
import { getCurrentLocation } from "../../services/locationService";

export default function FarmMapScreen() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedField, setSelectedField] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const { isOnline } = useNetworkStatus(() => {
    loadFields();
  });

  const loadFields = useCallback(async () => {
    try {
      setLoading(true);
      const uid = await getCurrentUserId();

      if (isOnline) {
        try {
          const res = await API.get("/fields");
          const fetchedFields = res.data?.fields || [];
          setFields(fetchedFields);
          if (uid) {
            await cacheFields(uid, fetchedFields);
          }
          if (fetchedFields.length > 0 && !selectedField) {
            const firstMapped = fetchedFields.find(
              (f) => f.latitude && f.longitude && !isNaN(Number(f.latitude))
            );
            if (firstMapped) setSelectedField(firstMapped);
          }
          return;
        } catch (apiErr) {
          console.log("[farm-map] API fetch failed, falling back to cache:", apiErr.message);
        }
      }

      // Offline fallback
      const cached = await getCachedFields(uid);
      setFields(cached);
      if (cached.length > 0 && !selectedField) {
        const firstMapped = cached.find(
          (f) => f.latitude && f.longitude && !isNaN(Number(f.latitude))
        );
        if (firstMapped) setSelectedField(firstMapped);
      }
    } catch (err) {
      console.log("[farm-map] Load fields error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    loadFields();
  }, [loadFields]);

  const mappedFields = fields.filter(
    (f) =>
      f &&
      f.latitude !== null &&
      f.latitude !== undefined &&
      f.longitude !== null &&
      f.longitude !== undefined &&
      !isNaN(Number(f.latitude)) &&
      !isNaN(Number(f.longitude)) &&
      Number(f.latitude) !== 0 &&
      Number(f.longitude) !== 0
  );

  const unmappedFields = fields.filter(
    (f) =>
      !f ||
      f.latitude === null ||
      f.latitude === undefined ||
      f.longitude === null ||
      f.longitude === undefined ||
      isNaN(Number(f.latitude)) ||
      isNaN(Number(f.longitude)) ||
      Number(f.latitude) === 0 ||
      Number(f.longitude) === 0
  );

  const handleCenterUserLocation = async () => {
    try {
      setLocatingUser(true);
      const loc = await getCurrentLocation();
      if (!loc.success) {
        Alert.alert("Location", loc.error || "Unable to acquire current GPS location.");
        return;
      }
      setUserLocation(loc);
      Alert.alert(
        "Current Location",
        `GPS Latitude: ${loc.latitude}\nLongitude: ${loc.longitude}\nAccuracy: ±${loc.accuracy}m\n${loc.locationName || ""}`
      );
    } catch (err) {
      Alert.alert("Location Error", "Failed to retrieve device location.");
    } finally {
      setLocatingUser(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FarmerHeader
        title="Farm Map"
        showBack={true}
        onBackPress={() => router.back()}
        rightIcon="refresh"
        onRightPress={loadFields}
      />

      <SyncStatus status={isOnline ? "online" : "offline"} showBanner={!isOnline} />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* SUMMARY STRIP */}
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{fields.length}</Text>
            <Text style={styles.summaryLabel}>Total Fields</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: COLORS.primary }]}>{mappedFields.length}</Text>
            <Text style={styles.summaryLabel}>GPS Mapped</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: COLORS.warning || "#D97706" }]}>
              {unmappedFields.length}
            </Text>
            <Text style={styles.summaryLabel}>Unmapped</Text>
          </View>
        </View>

        {/* MAP CONTAINER */}
        <View style={styles.mapCard}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading farm fields...</Text>
            </View>
          ) : (
            <FarmMapView
              fields={mappedFields}
              selectedField={selectedField}
              onSelectField={(f) => setSelectedField(f)}
              style={styles.mapView}
            />
          )}

          <TouchableOpacity
            style={styles.gpsFab}
            onPress={handleCenterUserLocation}
            disabled={locatingUser}
            activeOpacity={0.8}
          >
            {locatingUser ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="navigate" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* SELECTED FIELD PREVIEW CARD */}
        {selectedField ? (
          <View style={styles.selectedCard}>
            <View style={styles.selectedHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedName}>{selectedField.field_name}</Text>
                <Text style={styles.selectedCoords}>
                  📍 {Number(selectedField.latitude).toFixed(4)}°, {Number(selectedField.longitude).toFixed(4)}°
                </Text>
              </View>
              <TouchableOpacity
                style={styles.viewDetailBtn}
                onPress={() => router.push(`/farmer/field-details/${selectedField.id || selectedField.local_id}`)}
              >
                <Text style={styles.viewDetailBtnText}>Details</Text>
                <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.selectedMetaRow}>
              {selectedField.area ? (
                <View style={styles.metaBadge}>
                  <Ionicons name="expand-outline" size={13} color={COLORS.textSecondary} />
                  <Text style={styles.metaBadgeText}>
                    {selectedField.area} {selectedField.area_unit || "acres"}
                  </Text>
                </View>
              ) : null}

              {selectedField.location_name ? (
                <View style={[styles.metaBadge, { flex: 1 }]}>
                  <Ionicons name="location-outline" size={13} color={COLORS.textSecondary} />
                  <Text style={styles.metaBadgeText} numberOfLines={1}>
                    {selectedField.location_name}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* UNMAPPED FIELDS SECTION */}
        {unmappedFields.length > 0 && (
          <View style={styles.unmappedSection}>
            <View style={styles.unmappedHeader}>
              <Ionicons name="alert-circle-outline" size={18} color={COLORS.warning || "#D97706"} />
              <Text style={styles.unmappedTitle}>Fields Without GPS Location ({unmappedFields.length})</Text>
            </View>
            <Text style={styles.unmappedSubtitle}>
              These fields do not have coordinates yet. Open field details to add GPS coordinates.
            </Text>

            {unmappedFields.map((fld) => (
              <TouchableOpacity
                key={fld.id || fld.local_id}
                style={styles.unmappedItem}
                onPress={() => router.push(`/farmer/field-details/${fld.id || fld.local_id}`)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.unmappedItemName}>{fld.field_name}</Text>
                  <Text style={styles.unmappedItemArea}>
                    {fld.area ? `${fld.area} ${fld.area_unit || "acres"}` : "Plot"} {fld.location_name ? `· ${fld.location_name}` : ""}
                  </Text>
                </View>
                <View style={styles.unmappedAction}>
                  <Text style={styles.unmappedActionText}>View</Text>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background || "#F9FBF7",
  },
  scrollContainer: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  summaryStrip: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  summaryNum: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  mapCard: {
    borderRadius: RADIUS.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    marginBottom: SPACING.md,
    position: "relative",
    ...SHADOWS.sm,
  },
  mapView: {
    width: "100%",
    height: 320,
  },
  loadingBox: {
    height: 320,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  gpsFab: {
    position: "absolute",
    right: 14,
    top: 14,
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.md,
  },
  selectedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  selectedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  selectedName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  selectedCoords: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
    marginTop: 3,
  },
  viewDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  viewDetailBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  selectedMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight || "#F3F4F6",
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  metaBadgeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  unmappedSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  unmappedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unmappedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  unmappedSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 10,
  },
  unmappedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight || "#F3F4F6",
  },
  unmappedItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  unmappedItemArea: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  unmappedAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  unmappedActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
});
