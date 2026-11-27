import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import API from "../../services/api";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../constants/theme";
import FarmerHeader from "../../components/ui/FarmerHeader";
import AppInput from "../../components/ui/AppInput";
import AppButton from "../../components/ui/AppButton";
import SyncStatus from "../../components/SyncStatus";
import useNetworkStatus from "../../hooks/useNetworkStatus";
import { enqueueOperation } from "../../services/syncService";
import { generateLocalId, cacheFields } from "../../services/offlineStorage";
import { getCurrentUserId } from "../../services/auth";
import { getCurrentLocation } from "../../services/locationService";
import { Ionicons } from "@expo/vector-icons";

const COMMON_UNITS = ["acres", "hectares", "bigha", "sq m"];
const SOIL_TYPES = ["Loamy", "Clay", "Black Cotton", "Alluvial", "Sandy", "Red Soil"];

export default function CreateField() {
  const [fieldName, setFieldName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [area, setArea] = useState("");
  const [areaUnit, setAreaUnit] = useState("acres");
  const [soilType, setSoilType] = useState("Loamy");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [notes, setNotes] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");

  const { isOnline } = useNetworkStatus();

  const handleFetchCurrentLocation = async () => {
    try {
      setLocating(true);
      const res = await getCurrentLocation();
      if (!res.success) {
        Alert.alert("Location Notice", res.error || "Unable to acquire location.");
        return;
      }

      setLatitude(String(res.latitude));
      setLongitude(String(res.longitude));
      setLocationAccuracy(res.accuracy);

      if (!locationName.trim() && res.locationName) {
        setLocationName(res.locationName);
      }
    } catch (err) {
      Alert.alert("Location Error", "Could not acquire GPS position.");
    } finally {
      setLocating(false);
    }
  };

  const handleCreateField = async () => {
    setErrors({});
    setApiError("");
    
    let newErrors = {};

    if (!fieldName.trim()) {
      newErrors.fieldName = "Field name is required.";
    }

    if (area.trim() && isNaN(Number(area.trim()))) {
      newErrors.area = "Area must be a valid number.";
    }

    if (latitude.trim() && isNaN(Number(latitude.trim()))) {
      newErrors.latitude = "Latitude must be a valid number.";
    }

    if (longitude.trim() && isNaN(Number(longitude.trim()))) {
      newErrors.longitude = "Longitude must be a valid number.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      const uid = await getCurrentUserId();

      const combinedNotes = [
        soilType ? `Soil: ${soilType}` : null,
        notes.trim() || null,
      ]
        .filter(Boolean)
        .join(". ");

      const payload = {
        field_name: fieldName.trim(),
        location_name: locationName.trim() || null,
        area: area.trim() ? Number(area.trim()) : null,
        area_unit: areaUnit.trim() || null,
        latitude: latitude.trim() ? Number(latitude.trim()) : null,
        longitude: longitude.trim() ? Number(longitude.trim()) : null,
        notes: combinedNotes || null,
      };

      if (!isOnline) {
        const localId = generateLocalId("fld");
        await enqueueOperation({
          userId: uid,
          recordType: "field",
          operationType: "create",
          localRecordId: localId,
          endpoint: "/fields",
          httpMethod: "POST",
          payload,
        });

        setApiError("✓ Saved on this device. Will sync when back online.");
        setTimeout(() => {
          router.replace("/farmer/fields");
        }, 800);
        return;
      }

      try {
        const res = await API.post("/fields", payload);
        if (res.data?.field) {
          await cacheFields(uid, [res.data.field]);
        }
        setApiError("✓ Field plot successfully added.");
        setTimeout(() => {
          router.replace("/farmer/fields");
        }, 800);
      } catch (reqErr) {
        if (!reqErr.response) {
          const localId = generateLocalId("fld");
          await enqueueOperation({
            userId: uid,
            recordType: "field",
            operationType: "create",
            localRecordId: localId,
            endpoint: "/fields",
            httpMethod: "POST",
            payload,
          });

          setApiError("✓ Saved on this device. Queued for sync.");
          setTimeout(() => {
            router.replace("/farmer/fields");
          }, 800);
        } else {
          setApiError(reqErr.response?.data?.message || "Unable to create field. Please try again.");
        }
      }
    } catch (error) {
      console.log("CREATE FIELD ERROR:", error.message);
      setApiError("Unable to create field. Please check your information and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <FarmerHeader
        title="Create Field"
        subtitle="Add a farm area to start tracking crops."
        showBack={true}
      />

      {/* Offline Status Banner */}
      <SyncStatus status={isOnline ? "online" : "offline"} showBanner={true} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {apiError ? (
            <View style={[styles.apiErrorContainer, { backgroundColor: apiError.startsWith("✓") ? COLORS.primaryLight : COLORS.dangerBg }]}>
              <Text style={[styles.apiErrorText, { color: apiError.startsWith("✓") ? COLORS.primaryDark : COLORS.danger }]}>{apiError}</Text>
            </View>
          ) : null}

          {/* SECTION: FIELD INFORMATION */}
          <Text style={styles.sectionHeader}>FIELD INFORMATION</Text>
          <View style={styles.sectionCard}>
            <AppInput
              label="Field Name"
              placeholder="e.g. North Plot A"
              value={fieldName}
              onChangeText={setFieldName}
              isRequired={true}
              error={errors.fieldName}
            />

            <AppInput
              label="Location"
              placeholder="e.g. Sector 4, North Farm"
              value={locationName}
              onChangeText={setLocationName}
            />
          </View>

          {/* SECTION: AREA */}
          <Text style={styles.sectionHeader}>AREA</Text>
          <View style={styles.sectionCard}>
            <AppInput
              label="Area"
              placeholder="e.g. 5.5"
              value={area}
              onChangeText={setArea}
              keyboardType="decimal-pad"
              error={errors.area}
            />

            <Text style={styles.chipGroupLabel}>Area Unit</Text>
            <View style={styles.chipRow}>
              {COMMON_UNITS.map((unit) => {
                const isSelected = areaUnit === unit;
                return (
                  <TouchableOpacity
                    key={unit}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setAreaUnit(unit)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* SECTION: SOIL */}
          <Text style={styles.sectionHeader}>SOIL</Text>
          <View style={styles.sectionCard}>
            <Text style={styles.chipGroupLabel}>Soil Type</Text>
            <View style={styles.chipRow}>
              {SOIL_TYPES.map((type) => {
                const isSelected = soilType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setSoilType(type)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* SECTION: OPTIONAL COORDINATES & NOTES */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={[styles.sectionHeader, { marginBottom: 0 }]}>COORDINATES & LOCATION</Text>
            <TouchableOpacity
              style={styles.gpsButton}
              onPress={handleFetchCurrentLocation}
              disabled={locating}
              activeOpacity={0.7}
            >
              <Ionicons name="location" size={14} color="#FFFFFF" />
              <Text style={styles.gpsButtonText}>
                {locating ? "Acquiring..." : "Use Current GPS"}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sectionCard}>
            {locationAccuracy !== null && (
              <View style={styles.accuracyBanner}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
                <Text style={styles.accuracyBannerText}>
                  GPS Captured: ±{locationAccuracy}m accuracy
                </Text>
              </View>
            )}

            <View style={styles.coordsRow}>
              <View style={styles.coordCol}>
                <AppInput
                  label="Latitude"
                  placeholder="23.0225"
                  value={latitude}
                  onChangeText={setLatitude}
                  keyboardType="numeric"
                  error={errors.latitude}
                />
              </View>
              <View style={styles.coordGap} />
              <View style={styles.coordCol}>
                <AppInput
                  label="Longitude"
                  placeholder="72.5714"
                  value={longitude}
                  onChangeText={setLongitude}
                  keyboardType="numeric"
                  error={errors.longitude}
                />
              </View>
            </View>

            <AppInput
              label="Notes"
              placeholder="Irrigation access, slope, or soil amendments..."
              value={notes}
              onChangeText={setNotes}
              multiline={true}
              numberOfLines={3}
            />
          </View>

          {/* ACTION BUTTONS: Cancel + Add Field */}
          <View style={styles.buttonRow}>
            <View style={styles.buttonCol}>
              <AppButton
                title="Cancel"
                variant="secondary"
                onPress={() => router.back()}
              />
            </View>
            <View style={styles.buttonGap} />
            <View style={styles.buttonCol}>
              <AppButton
                title={loading ? "Adding..." : "Add Field"}
                variant="primary"
                onPress={handleCreateField}
                loading={loading}
                disabled={loading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: SPACING.lg, // 20px
    paddingTop: SPACING.base,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },
  apiErrorContainer: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  apiErrorText: {
    fontSize: 14,
    fontWeight: "500",
  },
  sectionHeader: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
    marginBottom: SPACING.lg,
    ...Platform.select({
      web: {
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
      },
    }),
  },
  chipGroupLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: SPACING.sm,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  coordsRow: {
    flexDirection: "row",
  },
  coordCol: {
    flex: 1,
  },
  coordGap: {
    width: SPACING.md,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: SPACING.base,
  },
  buttonCol: {
    flex: 1,
  },
  buttonGap: {
    width: SPACING.md,
  },
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full || 20,
  },
  gpsButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  accuracyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  accuracyBannerText: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: "500",
  },
});