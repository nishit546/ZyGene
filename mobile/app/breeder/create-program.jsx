import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../../services/api";
import AppDatePicker from "../../components/ui/AppDatePicker";

export default function CreateBreedingProgram() {
  const router = useRouter();

  // Form states
  const [programName, setProgramName] = useState("");
  const [cropName, setCropName] = useState("");
  const [objective, setObjective] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [status, setStatus] = useState("planned");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);

  // Status options config
  const statusOptions = [
    {
      id: "planned",
      label: "Planned",
      activeBg: "#E3F2FD",
      activeColor: "#1565C0",
      activeBorder: "#90CAF9",
    },
    {
      id: "active",
      label: "Active",
      activeBg: "#E8F5E9",
      activeColor: "#2E7D32",
      activeBorder: "#A5D6A7",
    },
    {
      id: "completed",
      label: "Completed",
      activeBg: "#E0F2F1",
      activeColor: "#00695C",
      activeBorder: "#80CBC4",
    },
    {
      id: "cancelled",
      label: "Cancelled",
      activeBg: "#FFEBEE",
      activeColor: "#C62828",
      activeBorder: "#EF9A9A",
    },
  ];

  const handleSubmit = async () => {
    // Validate required fields
    if (!programName.trim()) {
      Alert.alert("Missing Information", "Please enter a program name.");
      return;
    }

    if (!cropName.trim()) {
      Alert.alert("Missing Information", "Please enter a crop name.");
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      const payload = {
        program_name: programName.trim(),
        crop_name: cropName.trim(),
        objective: objective.trim() || null,
        start_date: startDate.trim() || null,
        expected_end_date: expectedEndDate.trim() || null,
        status: status || "planned",
        description: description.trim() || null,
      };

      const response = await API.post("/breeder/programs", payload);

      Alert.alert(
        "Success",
        response.data?.message || "Breeding program created successfully",
        [
          {
            text: "OK",
            onPress: () => router.replace("/breeder/programs"),
          },
        ]
      );
    } catch (error) {
      console.log(
        "CREATE BREEDING PROGRAM ERROR:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to create breeding program. Please check your data and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Banner */}
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
              <Text style={styles.title}>Create Breeding Program</Text>
              <Text style={styles.subtitle}>
                Start a new crop breeding program
              </Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Program Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Program Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="bookmark-outline"
                  size={20}
                  color="#2E7D32"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter program name"
                  placeholderTextColor="#9E9E9E"
                  value={programName}
                  onChangeText={setProgramName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Crop Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Crop Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="leaf-outline"
                  size={20}
                  color="#2E7D32"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Wheat, Rice, Tomato"
                  placeholderTextColor="#9E9E9E"
                  value={cropName}
                  onChangeText={setCropName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Objective */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Objective</Text>
              <View style={[styles.inputWrapper, styles.multilineWrapper]}>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="What is the main objective of this program?"
                  placeholderTextColor="#9E9E9E"
                  value={objective}
                  onChangeText={setObjective}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Dates: Start Date & Expected End Date */}
            <View style={styles.row}>
              <View style={[styles.halfColumn]}>
                <AppDatePicker
                  label="Start Date"
                  placeholder="Select start date"
                  value={startDate}
                  onChange={setStartDate}
                />
              </View>

              <View style={[styles.halfColumn]}>
                <AppDatePicker
                  label="Expected End Date"
                  placeholder="Select end date"
                  value={expectedEndDate}
                  onChange={setExpectedEndDate}
                  minDate={startDate ? new Date(startDate) : undefined}
                />
              </View>
            </View>

            {/* Status Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Program Status</Text>
              <View style={styles.statusGrid}>
                {statusOptions.map((opt) => {
                  const isSelected = status === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.statusOption,
                        isSelected && {
                          backgroundColor: opt.activeBg,
                          borderColor: opt.activeBorder,
                        },
                      ]}
                      onPress={() => setStatus(opt.id)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: isSelected
                              ? opt.activeColor
                              : "#B0BEC5",
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusOptionText,
                          isSelected && {
                            color: opt.activeColor,
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color={opt.activeColor}
                          style={styles.checkIcon}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <View style={[styles.inputWrapper, styles.multilineWrapper]}>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Describe the breeding program..."
                  placeholderTextColor="#9E9E9E"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Creating...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color="#FFFFFF"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.submitButtonText}>Create Program</Text>
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
    paddingBottom: 36,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },

  /* Header */
  header: {
    backgroundColor: "#1B5E20",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
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

  /* Form Card */
  formCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#37474F",
    marginBottom: 7,
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
  multilineWrapper: {
    paddingVertical: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    fontWeight: "500",
    color: "#0F172A",
    borderWidth: 0,
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
        boxShadow: "none",
      },
    }),
  },
  multilineInput: {
    height: 80,
  },

  /* Row & Columns */
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfColumn: {
    width: "48%",
  },

  /* Status Grid */
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statusOption: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F7FAF7",
    borderWidth: 1.2,
    borderColor: "#E0E6E0",
    marginBottom: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusOptionText: {
    fontSize: 13,
    color: "#546E7A",
    fontWeight: "500",
    flex: 1,
  },
  checkIcon: {
    marginLeft: 4,
  },

  /* Submit Button */
  submitButton: {
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    elevation: 3,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  submitButtonDisabled: {
    backgroundColor: "#81C784",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
