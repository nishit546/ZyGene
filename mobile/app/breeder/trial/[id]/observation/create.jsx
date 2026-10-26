import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
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

export default function CreateTrialObservation() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  // Form states
  const [observationDate, setObservationDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [measurementType, setMeasurementType] = useState("");
  const [measurementValue, setMeasurementValue] = useState("");
  const [unit, setUnit] = useState("");
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Common measurement presets for quick breeder input
  const measurementPresets = [
    "Plant Height",
    "Grain Yield",
    "Disease Score",
    "Days to Flowering",
    "Chlorophyll Content",
    "Lodging Score",
  ];

  // Common unit presets
  const unitPresets = ["cm", "kg/plot", "g", "%", "score (1-9)", "days"];

  // Submit handler
  const handleSubmit = async () => {
    if (!observationDate.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter an observation date (YYYY-MM-DD)."
      );
      return;
    }

    if (!measurementType.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter or select a measurement type."
      );
      return;
    }

    // Validate numeric measurement value if provided
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

    // Validate numeric rating if provided
    let parsedRating = null;
    if (rating.trim() !== "") {
      const parsed = Number(rating.trim());
      if (isNaN(parsed)) {
        Alert.alert("Invalid Input", "Rating must be a valid number.");
        return;
      }
      parsedRating = parsed;
    }

    if (submitting) return;

    try {
      setSubmitting(true);

      const payload = {
        trial_id: Number(id),
        observation_date: observationDate.trim(),
        measurement_type: measurementType.trim(),
        measurement_value: parsedMeasurementValue,
        unit: unit.trim() || null,
        rating: parsedRating,
        notes: notes.trim() || null,
      };

      const response = await API.post("/breeder/observations", payload);

      Alert.alert(
        "Success",
        response.data?.message || "Observation added successfully",
        [
          {
            text: "OK",
            onPress: () => {
              router.replace(`/breeder/trial/${id}`);
            },
          },
        ]
      );
    } catch (error) {
      console.log(
        "CREATE OBSERVATION ERROR:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to record trial observation. Please verify the fields and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!id || isNaN(Number(id))) {
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
            <Text style={styles.title}>Add Observation</Text>
            <Text style={styles.subtitle}>Invalid Trial</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Ionicons name="alert-circle-outline" size={54} color="#C62828" />
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#263238", marginTop: 12 }}>
            Invalid Trial ID
          </Text>
          <Text style={{ fontSize: 13, color: "#78909C", textAlign: "center", marginTop: 6, marginBottom: 20 }}>
            No valid breeding trial was specified for this observation.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: "#2E7D32", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 }}
            onPress={() => router.replace("/breeder/trials")}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Back to Trials</Text>
          </TouchableOpacity>
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
              <Text style={styles.title}>Add Observation</Text>
              <Text style={styles.subtitle}>
                Record trial performance data
              </Text>
            </View>
          </View>

          {/* Trial Context Badge */}
          <View style={styles.contextContainer}>
            <View style={styles.contextCard}>
              <View style={styles.contextIconBox}>
                <Ionicons name="flask" size={16} color="#1B5E20" />
              </View>
              <View style={styles.contextTextBox}>
                <Text style={styles.contextLabel}>TARGET FIELD TRIAL</Text>
                <Text style={styles.contextValue}>Trial ID: #{id}</Text>
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

            {/* 1. Observation Date (Required) */}
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
                  editable={!submitting}
                />
              </View>
            </View>

            {/* 2. Measurement Type (Required) */}
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
                  editable={!submitting}
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
                  disabled={submitting}
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
                <Text style={styles.label}>Value</Text>
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
                    editable={!submitting}
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
                    placeholder="e.g. cm, kg"
                    placeholderTextColor="#90A4AE"
                    value={unit}
                    onChangeText={setUnit}
                    editable={!submitting}
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
                  disabled={submitting}
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
                <Text style={styles.label}>Rating / Score</Text>
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
                  editable={!submitting}
                />
              </View>
            </View>

            {/* 6. Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <View style={[styles.inputWrapper, styles.multilineWrapper]}>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="Add observation notes, environmental context, or pest observations..."
                  placeholderTextColor="#90A4AE"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!submitting}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <View style={styles.buttonInlineContent}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Saving...</Text>
                </View>
              ) : (
                <View style={styles.buttonInlineContent}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.submitButtonText}>Add Observation</Text>
                </View>
              )}
            </TouchableOpacity>
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

  /* Submit Button */
  submitButton: {
    backgroundColor: "#2E7D32",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    elevation: 3,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  buttonInlineContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
    letterSpacing: 0.3,
  },
});
