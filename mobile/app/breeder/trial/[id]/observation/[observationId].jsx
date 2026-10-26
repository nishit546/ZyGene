import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../../../../../services/api";

export default function EditTrialObservation() {
  const router = useRouter();
  const { id, observationId } = useLocalSearchParams();

  // Screen state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Form states
  const [observationDate, setObservationDate] = useState("");
  const [measurementType, setMeasurementType] = useState("");
  const [measurementValue, setMeasurementValue] = useState("");
  const [unit, setUnit] = useState("");
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");

  // Preset chips for fast data entry
  const measurementPresets = [
    "Plant Height",
    "Grain Yield",
    "Disease Score",
    "Days to Flowering",
    "Chlorophyll Content",
    "Lodging Score",
  ];

  const unitPresets = ["cm", "kg/plot", "g", "%", "score", "days"];

  // Fetch observations and populate current record
  const fetchObservation = useCallback(async () => {
    if (!id || isNaN(Number(id)) || !observationId || isNaN(Number(observationId))) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setNotFound(false);

      const response = await API.get(`/breeder/observations/${id}`);
      const obsList = Array.isArray(response.data)
        ? response.data
        : response.data?.observations || response.data?.data || [];

      const found = obsList.find(
        (item) => Number(item.id) === Number(observationId)
      );

      if (found) {
        // Date formatting: extract YYYY-MM-DD
        let formattedDate = "";
        if (found.observation_date) {
          formattedDate = String(found.observation_date).split("T")[0];
        }
        setObservationDate(formattedDate);
        setMeasurementType(found.measurement_type ? String(found.measurement_type) : "");
        setMeasurementValue(
          found.measurement_value !== null && found.measurement_value !== undefined
            ? String(found.measurement_value)
            : ""
        );
        setUnit(found.unit ? String(found.unit) : "");
        setRating(
          found.rating !== null && found.rating !== undefined
            ? String(found.rating)
            : ""
        );
        setNotes(found.notes ? String(found.notes) : "");
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to load observation data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [id, observationId]);

  useEffect(() => {
    if (id && observationId) {
      fetchObservation();
    }
  }, [fetchObservation, id, observationId]);

  // Update observation handler
  const handleSave = async () => {
    if (!observationDate.trim()) {
      Alert.alert(
        "Required Field",
        "Please enter an observation date (YYYY-MM-DD)."
      );
      return;
    }

    if (!measurementType.trim()) {
      Alert.alert(
        "Required Field",
        "Please enter a measurement type."
      );
      return;
    }

    // Validate numeric measurement value
    let parsedMeasurementValue = null;
    if (measurementValue.trim() !== "") {
      const parsed = Number(measurementValue.trim());
      if (isNaN(parsed)) {
        Alert.alert(
          "Invalid Input",
          "Measurement value must be a valid number."
        );
        return;
      }
      parsedMeasurementValue = parsed;
    }

    // Validate numeric rating
    let parsedRating = null;
    if (rating.trim() !== "") {
      const parsed = Number(rating.trim());
      if (isNaN(parsed)) {
        Alert.alert("Invalid Input", "Rating must be a valid number.");
        return;
      }
      parsedRating = parsed;
    }

    if (saving || deleting) return;

    try {
      setSaving(true);

      const payload = {
        observation_date: observationDate.trim(),
        measurement_type: measurementType.trim(),
        measurement_value: parsedMeasurementValue,
        unit: unit.trim() || null,
        rating: parsedRating,
        notes: notes.trim() || null,
      };

      await API.put(`/breeder/observations/${observationId}`, payload);

      Alert.alert("Success", "Observation updated successfully", [
        {
          text: "OK",
          onPress: () => {
            router.replace(`/breeder/trial/${id}`);
          },
        },
      ]);
    } catch (error) {
      console.log(error.response?.data || error.message);
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to update observation. Please check the fields and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete observation handler
  const handleDelete = () => {
    if (saving || deleting) return;

    Alert.alert(
      "Delete Observation",
      "Are you sure you want to delete this observation?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await API.delete(`/breeder/observations/${observationId}`);

              Alert.alert("Success", "Observation deleted successfully", [
                {
                  text: "OK",
                  onPress: () => {
                    router.replace(`/breeder/trial/${id}`);
                  },
                },
              ]);
            } catch (error) {
              console.log(error.response?.data || error.message);
              Alert.alert(
                "Error",
                error.response?.data?.message ||
                  "Failed to delete observation. Please try again."
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Loading Screen
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Edit Observation</Text>
            <Text style={styles.subtitle}>Update trial performance data</Text>
          </View>
        </View>

        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading observation data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Not Found Screen
  if (notFound) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Edit Observation</Text>
            <Text style={styles.subtitle}>Update trial performance data</Text>
          </View>
        </View>

        <View style={styles.centerContainer}>
          <View style={styles.notFoundCard}>
            <Ionicons name="alert-circle-outline" size={56} color="#D32F2F" />
            <Text style={styles.notFoundTitle}>Observation Not Found</Text>
            <Text style={styles.notFoundMessage}>
              The observation record (#{observationId}) could not be located in
              trial #{id}. It may have already been removed.
            </Text>
            <TouchableOpacity
              style={styles.notFoundButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
              <Text style={styles.notFoundButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Edit Observation</Text>
              <Text style={styles.subtitle}>
                Update trial performance data
              </Text>
            </View>
          </View>

          {/* Context Badge */}
          <View style={styles.contextContainer}>
            <View style={styles.contextCard}>
              <View style={styles.contextIconBox}>
                <Ionicons name="flask" size={16} color="#1B5E20" />
              </View>
              <View style={styles.contextTextBox}>
                <Text style={styles.contextLabel}>TRIAL & OBSERVATION</Text>
                <Text style={styles.contextValue}>
                  Trial #{id} • Observation #{observationId}
                </Text>
              </View>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <Ionicons name="create-outline" size={18} color="#2E7D32" />
              <Text style={styles.sectionHeaderTitle}>Observation Details</Text>
            </View>

            {/* 1. Observation Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Observation Date <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color="#546E7A"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#90A4AE"
                  value={observationDate}
                  onChangeText={setObservationDate}
                  editable={!saving && !deleting}
                />
              </View>
            </View>

            {/* 2. Measurement Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Measurement Type <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="pulse-outline"
                  size={18}
                  color="#546E7A"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Plant Height, Yield, Disease Score"
                  placeholderTextColor="#90A4AE"
                  value={measurementType}
                  onChangeText={setMeasurementType}
                  editable={!saving && !deleting}
                />
              </View>
            </View>

            {/* Measurement Presets */}
            <View style={styles.presetsRow}>
              <Text style={styles.presetsLabel}>Common:</Text>
              {measurementPresets.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.presetChip,
                    measurementType === type && styles.presetChipSelected,
                  ]}
                  onPress={() => setMeasurementType(type)}
                  disabled={saving || deleting}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      measurementType === type && styles.presetChipTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Two Column: 3. Measurement Value & 4. Unit */}
            <View style={styles.twoColumnRow}>
              {/* Measurement Value */}
              <View style={[styles.inputGroup, styles.halfColumn]}>
                <Text style={styles.label}>Measurement Value</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="speedometer-outline"
                    size={17}
                    color="#546E7A"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter measurement value"
                    placeholderTextColor="#90A4AE"
                    value={measurementValue}
                    onChangeText={setMeasurementValue}
                    keyboardType="numeric"
                    editable={!saving && !deleting}
                  />
                </View>
              </View>

              {/* Unit */}
              <View style={[styles.inputGroup, styles.halfColumn]}>
                <Text style={styles.label}>Unit</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="options-outline"
                    size={17}
                    color="#546E7A"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. cm, kg, %, score"
                    placeholderTextColor="#90A4AE"
                    value={unit}
                    onChangeText={setUnit}
                    editable={!saving && !deleting}
                  />
                </View>
              </View>
            </View>

            {/* Unit Presets */}
            <View style={styles.presetsRow}>
              <Text style={styles.presetsLabel}>Units:</Text>
              {unitPresets.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.presetChip,
                    unit === u && styles.presetChipSelected,
                  ]}
                  onPress={() => setUnit(u)}
                  disabled={saving || deleting}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      unit === u && styles.presetChipTextSelected,
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 5. Rating */}
            <View style={styles.inputGroup}>
              <View style={styles.labelWithBadge}>
                <Text style={styles.label}>Rating</Text>
                <View style={styles.optionalTag}>
                  <Text style={styles.optionalTagText}>Optional</Text>
                </View>
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="star-outline"
                  size={18}
                  color="#F57F17"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 8.5"
                  placeholderTextColor="#90A4AE"
                  value={rating}
                  onChangeText={setRating}
                  keyboardType="numeric"
                  editable={!saving && !deleting}
                />
              </View>
            </View>

            {/* 6. Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <View style={[styles.inputWrapper, styles.multilineWrapper]}>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="Add observation notes..."
                  placeholderTextColor="#90A4AE"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!saving && !deleting}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              {/* Save Button */}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (saving || deleting) && styles.buttonDisabled,
                ]}
                onPress={handleSave}
                disabled={saving || deleting}
                activeOpacity={0.8}
              >
                {saving ? (
                  <View style={styles.buttonInlineContent}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Saving...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonInlineContent}>
                    <Ionicons
                      name="save-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Delete Button */}
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  (saving || deleting) && styles.buttonDisabled,
                ]}
                onPress={handleDelete}
                disabled={saving || deleting}
                activeOpacity={0.8}
              >
                {deleting ? (
                  <View style={styles.buttonInlineContent}>
                    <ActivityIndicator size="small" color="#D32F2F" />
                    <Text style={styles.deleteButtonText}>Deleting...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonInlineContent}>
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color="#D32F2F"
                    />
                    <Text style={styles.deleteButtonText}>
                      Delete Observation
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
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
    backgroundColor: "#1B5E20",
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  headerTextContainer: {
    paddingHorizontal: 2,
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
    lineHeight: 19,
  },

  /* Context Badge */
  contextContainer: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  contextCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  contextIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#C8E6C9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  contextTextBox: {
    flex: 1,
  },
  contextLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2E7D32",
    letterSpacing: 0.5,
  },
  contextValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1B5E20",
    marginTop: 1,
  },

  /* Form Card */
  formCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    padding: 20,
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2EE",
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B5E20",
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* Inputs */
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#37474F",
    marginBottom: 7,
  },
  labelWithBadge: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  optionalTag: {
    backgroundColor: "#ECEFF1",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  optionalTagText: {
    fontSize: 11,
    color: "#546E7A",
    fontWeight: "600",
  },
  required: {
    color: "#D32F2F",
    fontWeight: "bold",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFCFA",
    borderWidth: 1.2,
    borderColor: "#CFD8DC",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 15,
    color: "#263238",
  },
  multilineWrapper: {
    paddingVertical: 10,
    alignItems: "flex-start",
  },
  multilineInput: {
    minHeight: 80,
  },

  /* Two Column */
  twoColumnRow: {
    flexDirection: "row",
    gap: 12,
  },
  halfColumn: {
    flex: 1,
  },

  /* Presets */
  presetsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: -8,
    marginBottom: 16,
  },
  presetsLabel: {
    fontSize: 11.5,
    color: "#78909C",
    fontWeight: "600",
    marginRight: 4,
  },
  presetChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#ECEFF1",
    borderWidth: 1,
    borderColor: "#CFD8DC",
  },
  presetChipSelected: {
    backgroundColor: "#E8F5E9",
    borderColor: "#A5D6A7",
  },
  presetChipText: {
    fontSize: 12,
    color: "#546E7A",
    fontWeight: "600",
  },
  presetChipTextSelected: {
    color: "#2E7D32",
  },

  /* Action Buttons */
  actionsContainer: {
    marginTop: 8,
    gap: 12,
  },
  saveButton: {
    backgroundColor: "#2E7D32",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  deleteButton: {
    backgroundColor: "#FFEBEE",
    borderWidth: 1.2,
    borderColor: "#FFCDD2",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonInlineContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  deleteButtonText: {
    color: "#D32F2F",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 6,
  },

  /* Center Loading & Not Found */
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#546E7A",
    fontWeight: "500",
  },
  notFoundCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#EEF2EE",
    width: "100%",
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#263238",
    marginTop: 16,
  },
  notFoundMessage: {
    fontSize: 14,
    color: "#546E7A",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 20,
  },
  notFoundButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E7D32",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  notFoundButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 6,
  },
});
