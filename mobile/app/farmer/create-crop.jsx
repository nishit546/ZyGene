import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../../services/api";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../constants/theme";
import FarmerHeader from "../../components/ui/FarmerHeader";
import AppInput from "../../components/ui/AppInput";
import AppDatePicker from "../../components/ui/AppDatePicker";
import AppButton from "../../components/ui/AppButton";
import SyncStatus from "../../components/SyncStatus";
import useNetworkStatus from "../../hooks/useNetworkStatus";
import { enqueueOperation } from "../../services/syncService";
import { generateLocalId, cacheFields, cacheCrops, getCachedFields } from "../../services/offlineStorage";
import { getCurrentUserId } from "../../services/auth";

const POPULAR_CROPS = ["Wheat", "Rice", "Cotton", "Maize", "Soybean", "Mustard"];

export default function CreateCrop() {
  const [fields, setFields] = useState([]);
  const [fieldId, setFieldId] = useState("");
  const [cropName, setCropName] = useState("");
  const [variety, setVariety] = useState("");
  const [sowingDate, setSowingDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expectedHarvestDate, setExpectedHarvestDate] = useState("");
  const [notes, setNotes] = useState("");

  const [loadingFields, setLoadingFields] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [userId, setUserId] = useState(null);

  const { isOnline } = useNetworkStatus();

  // Modal State for Field Selector
  const [isFieldModalVisible, setFieldModalVisible] = useState(false);
  const [fieldSearch, setFieldSearch] = useState("");

  const loadFields = async () => {
    try {
      setLoadingFields(true);
      const uid = await getCurrentUserId();
      setUserId(uid);

      if (isOnline) {
        try {
          const response = await API.get("/fields");
          const fetchedFields = response.data?.fields || [];
          setFields(fetchedFields);
          await cacheFields(uid, fetchedFields);
          if (fetchedFields.length === 1) {
            setFieldId(String(fetchedFields[0].id));
          }
          return;
        } catch (apiErr) {
          console.log("[create-crop] Failed to load fields online, loading cache:", apiErr.message);
        }
      }

      // Offline or fallback: load from SQLite
      const cached = await getCachedFields(uid);
      setFields(cached);
      if (cached.length === 1) {
        setFieldId(String(cached[0].id || cached[0].local_id));
      }
    } catch (error) {
      console.log("LOAD FIELDS ERROR:", error.message);
      const cached = await getCachedFields(userId);
      setFields(cached);
    } finally {
      setLoadingFields(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, []);

  const handleCreateCrop = async () => {
    setErrors({});
    setApiError("");
    let newErrors = {};

    if (!cropName.trim()) {
      newErrors.cropName = "Crop name is required.";
    }

    if (!fieldId) {
      newErrors.fieldId = "Please select a field.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (submitting) return;

    try {
      setSubmitting(true);
      const uid = userId || (await getCurrentUserId());

      const payload = {
        field_id: Number(fieldId) || fieldId,
        crop_name: cropName.trim(),
        variety: variety.trim() || null,
        sowing_date: sowingDate.trim() || null,
        expected_harvest_date: expectedHarvestDate.trim() || null,
        notes: notes.trim() || null,
      };

      // If offline or field was created offline: save locally and queue
      if (!isOnline || String(fieldId).startsWith("loc_")) {
        const localId = generateLocalId("crp");
        await enqueueOperation({
          userId: uid,
          recordType: "crop",
          operationType: "create",
          localRecordId: localId,
          parentLocalId: String(fieldId).startsWith("loc_") ? String(fieldId) : null,
          parentServerId: !String(fieldId).startsWith("loc_") ? Number(fieldId) : null,
          endpoint: "/crops",
          httpMethod: "POST",
          payload,
        });

        Alert.alert(
          "Saved on this device",
          "Crop saved locally. It will sync automatically when you are back online."
        );

        router.replace("/farmer/crops");
        return;
      }

      // Online: send request
      try {
        const res = await API.post("/crops", payload);
        const createdCrop = res.data?.crop;
        if (createdCrop) {
          await cacheCrops(uid, [createdCrop]);
        }
        const createdId = createdCrop?.id || res.data?.id || res.data?.crop_id;
        router.replace(createdId ? `/farmer/crop-details/${createdId}` : "/farmer/crops");
      } catch (reqErr) {
        if (!reqErr.response) {
          const localId = generateLocalId("crp");
          await enqueueOperation({
            userId: uid,
            recordType: "crop",
            operationType: "create",
            localRecordId: localId,
            parentLocalId: String(fieldId).startsWith("loc_") ? String(fieldId) : null,
            parentServerId: !String(fieldId).startsWith("loc_") ? Number(fieldId) : null,
            endpoint: "/crops",
            httpMethod: "POST",
            payload,
          });

          Alert.alert(
            "Saved on this device",
            "Connection interrupted. Saved locally and queued for automatic sync."
          );

          router.replace("/farmer/crops");
        } else {
          setApiError(reqErr.response?.data?.message || "Unable to create crop. Please try again.");
        }
      }
    } catch (error) {
      console.log("CREATE CROP ERROR:", error.message);
      setApiError("Unable to create crop. Please check your information and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedField = useMemo(() => {
    return fields.find((f) => String(f.id) === String(fieldId));
  }, [fields, fieldId]);

  const filteredFields = useMemo(() => {
    if (!fieldSearch.trim()) return fields;
    const q = fieldSearch.toLowerCase().trim();
    return fields.filter(
      (f) =>
        (f.field_name || "").toLowerCase().includes(q) ||
        (f.location || "").toLowerCase().includes(q)
    );
  }, [fields, fieldSearch]);

  if (loadingFields) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading farm fields...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <FarmerHeader
        title="Create Crop"
        subtitle="Add a crop and start tracking its lifecycle."
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
            <View style={styles.apiErrorContainer}>
              <Text style={styles.apiErrorText}>{apiError}</Text>
            </View>
          ) : null}

          {/* SECTION 1: CROP INFORMATION */}
          <Text style={styles.sectionHeader}>CROP INFORMATION</Text>
          <View style={styles.sectionCard}>
            <Text style={styles.chipGroupLabel}>Popular Crops</Text>
            <View style={styles.chipRow}>
              {POPULAR_CROPS.map((name) => {
                const isSelected = cropName.toLowerCase() === name.toLowerCase();
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setCropName(name)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <AppInput
              label="Crop Name"
              placeholder="e.g. Wheat"
              value={cropName}
              onChangeText={setCropName}
              isRequired={true}
              error={errors.cropName}
            />

            <AppInput
              label="Variety"
              placeholder="e.g. HD-2967"
              value={variety}
              onChangeText={setVariety}
            />
          </View>

          {/* SECTION 2: FIELD */}
          <Text style={styles.sectionHeader}>FIELD</Text>
          <View style={[styles.sectionCard, errors.fieldId && { borderColor: COLORS.danger }]}>
            <Text style={styles.chipGroupLabel}>
              Select Field <Text style={styles.requiredAsterisk}>*</Text>
            </Text>

            {fields.length === 0 ? (
              <View style={styles.noFieldsBox}>
                <Text style={styles.noFieldsText}>No fields available</Text>
                <Text style={styles.noFieldsSub}>Create a field before adding a crop.</Text>
                <TouchableOpacity
                  style={styles.addFieldLink}
                  onPress={() => router.push("/farmer/create-field")}
                >
                  <Text style={styles.addFieldLinkText}>Create Field</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.fieldSelectorBox}
                onPress={() => setFieldModalVisible(true)}
                activeOpacity={0.7}
              >
                {selectedField ? (
                  <View style={styles.fieldSelectorContent}>
                    <View style={styles.fieldSelectorInfo}>
                      <Text style={styles.selectedFieldName}>{selectedField.field_name}</Text>
                      <Text style={styles.selectedFieldMeta}>
                        {selectedField.location || "No Location"} •{" "}
                        {selectedField.area ? `${selectedField.area} ${selectedField.area_unit || "acres"}` : "No Area"}
                      </Text>
                    </View>
                    <Text style={styles.changeFieldText}>Change</Text>
                  </View>
                ) : (
                  <View style={styles.fieldSelectorPlaceholder}>
                    <Text style={styles.fieldPlaceholderText}>Tap to select a field...</Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.textMuted} />
                  </View>
                )}
              </TouchableOpacity>
            )}
            {errors.fieldId && <Text style={styles.errorText}>{errors.fieldId}</Text>}
          </View>

          {/* SECTION 3: PLANTING */}
          <Text style={styles.sectionHeader}>PLANTING</Text>
          <View style={styles.sectionCard}>
            <AppDatePicker
              label="Sowing Date"
              placeholder="Select sowing date"
              value={sowingDate}
              onChange={setSowingDate}
              helper="Recorded sowing / seed planting date"
              maxDate={new Date()}
            />

            <AppDatePicker
              label="Expected Harvest Date"
              placeholder="Select target harvest date"
              value={expectedHarvestDate}
              onChange={setExpectedHarvestDate}
              minDate={sowingDate ? new Date(sowingDate) : new Date()}
              helper="Projected date when crop reaches maturity"
            />

            <AppInput
              label="Notes"
              placeholder="Seed lot number, soil conditions, planting depth..."
              value={notes}
              onChangeText={setNotes}
              multiline={true}
              numberOfLines={3}
            />
          </View>

          {/* ACTION BUTTONS */}
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
                title={submitting ? "Adding..." : "Add Crop"}
                variant="primary"
                onPress={handleCreateCrop}
                loading={submitting}
                disabled={submitting}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Field Selector Modal */}
      <Modal
        visible={isFieldModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFieldModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Field</Text>
              <TouchableOpacity onPress={() => setFieldModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.modalSearchIcon} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search fields..."
                placeholderTextColor={COLORS.textMuted}
                value={fieldSearch}
                onChangeText={setFieldSearch}
              />
            </View>

            <ScrollView contentContainerStyle={styles.modalList} keyboardShouldPersistTaps="handled">
              {filteredFields.length === 0 ? (
                <Text style={styles.modalNoResults}>No fields found.</Text>
              ) : (
                filteredFields.map((f) => {
                  const isSel = String(f.id) === String(fieldId);
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.modalFieldOption, isSel && styles.modalFieldOptionSelected]}
                      onPress={() => {
                        setFieldId(String(f.id));
                        setFieldModalVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.modalFieldLeft}>
                        <Ionicons
                          name={isSel ? "radio-button-on" : "radio-button-off"}
                          size={20}
                          color={isSel ? COLORS.primary : COLORS.borderDark}
                        />
                        <View style={styles.modalFieldInfo}>
                          <Text style={[styles.modalFieldName, isSel && styles.modalFieldNameSelected]}>
                            {f.field_name}
                          </Text>
                          <Text style={styles.modalFieldMeta}>
                            {f.location || "Plot"} • {f.area ? `${f.area} ${f.area_unit || "acres"}` : "No Area"}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.dangerBg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  apiErrorText: {
    color: COLORS.danger,
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
  requiredAsterisk: {
    color: COLORS.danger,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: SPACING.md,
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
  fieldSelectorBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    minHeight: 50,
    justifyContent: "center",
  },
  fieldSelectorPlaceholder: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldPlaceholderText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  fieldSelectorContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldSelectorInfo: {
    flex: 1,
  },
  selectedFieldName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  selectedFieldMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  changeFieldText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
    marginLeft: 10,
  },
  noFieldsBox: {
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  noFieldsText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  noFieldsSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  addFieldLink: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  addFieldLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  errorText: {
    ...TYPOGRAPHY.supporting,
    color: COLORS.danger,
    marginTop: 4,
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
  // Modal Styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    maxHeight: "80%",
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSubtle,
    margin: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalSearchIcon: {
    marginRight: 8,
  },
  modalSearchInput: {
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
  modalList: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  modalNoResults: {
    textAlign: "center",
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
  },
  modalFieldOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalFieldOptionSelected: {
    backgroundColor: COLORS.primaryLight,
    borderBottomColor: COLORS.primaryLight,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  modalFieldLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalFieldInfo: {
    marginLeft: 12,
  },
  modalFieldName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  modalFieldNameSelected: {
    color: COLORS.primary,
  },
  modalFieldMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});