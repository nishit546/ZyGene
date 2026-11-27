import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect } from "react";
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
  Modal,
  FlatList,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../../services/api";
import AppDatePicker from "../../components/ui/AppDatePicker";

export default function CreateBreedingCross() {
  const router = useRouter();
  const { programId } = useLocalSearchParams();

  // Form states
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [parent1, setParent1] = useState("");
  const [parent2, setParent2] = useState("");
  const [crossCode, setCrossCode] = useState("");
  const [crossDate, setCrossDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [generation, setGeneration] = useState("F1");
  const [objective, setObjective] = useState("");
  const [successStatus, setSuccessStatus] = useState("planned");
  const [notes, setNotes] = useState("");

  // UI / Async states
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Status options
  const statusOptions = [
    {
      id: "planned",
      label: "Planned",
      bg: "#E3F2FD",
      color: "#1565C0",
      border: "#90CAF9",
    },
    {
      id: "successful",
      label: "Successful",
      bg: "#E8F5E9",
      color: "#2E7D32",
      border: "#A5D6A7",
    },
    {
      id: "under_evaluation",
      label: "Under Evaluation",
      bg: "#FFF8E1",
      color: "#F57F17",
      border: "#FFE082",
    },
    {
      id: "failed",
      label: "Failed",
      bg: "#FFEBEE",
      color: "#C62828",
      border: "#EF9A9A",
    },
  ];

  // Common generation shortcuts
  const commonGenerations = ["F1", "F2", "F3", "BC1", "BC2", "DH"];

  // Fetch breeding programs
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setLoadingPrograms(true);
        const response = await API.get("/breeder/programs");
        const list = response.data?.programs || [];
        setPrograms(list);

        // Auto-select program if programId param is passed
        if (programId) {
          const matched = list.find(
            (p) => Number(p.id) === Number(programId)
          );
          if (matched) {
            setSelectedProgram(matched);
          }
        }
      } catch (error) {
        console.log(
          "FETCH PROGRAMS ERROR:",
          error.response?.data || error.message
        );
        Alert.alert(
          "Error",
          error.response?.data?.message ||
            "Failed to load breeding programs. Please check your connection."
        );
      } finally {
        setLoadingPrograms(false);
      }
    };

    fetchPrograms();
  }, [programId]);

  // Validation & Submit
  const handleSubmit = async () => {
    if (!selectedProgram) {
      Alert.alert("Missing Information", "Please select a breeding program.");
      return;
    }

    if (!parent1.trim()) {
      Alert.alert("Missing Information", "Please enter the first parent variety.");
      return;
    }

    if (!parent2.trim()) {
      Alert.alert("Missing Information", "Please enter the second parent variety.");
      return;
    }

    if (!crossCode.trim()) {
      Alert.alert("Missing Information", "Please enter a cross code.");
      return;
    }

    if (!crossDate.trim()) {
      Alert.alert("Missing Information", "Please enter the cross date (YYYY-MM-DD).");
      return;
    }

    if (submitting) return;

    try {
      setSubmitting(true);

      const payload = {
        program_id: Number(selectedProgram.id),
        parent_1: parent1.trim(),
        parent_2: parent2.trim(),
        cross_code: crossCode.trim(),
        cross_date: crossDate.trim(),
        generation: generation.trim() || null,
        objective: objective.trim() || null,
        success_status: successStatus || "planned",
        notes: notes.trim() || null,
      };

      const response = await API.post("/breeder/crosses", payload);

      Alert.alert(
        "Success",
        response.data?.message || "Breeding cross created successfully",
        [
          {
            text: "OK",
            onPress: () => {
              router.replace("/breeder/crosses");
            },
          },
        ]
      );
    } catch (error) {
      console.log(
        "CREATE BREEDING CROSS ERROR:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Creation Failed",
        error.response?.data?.message ||
          "Could not create breeding cross. Please verify the inputs and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Select program helper
  const handleSelectProgram = (item) => {
    setSelectedProgram(item);
    setModalVisible(false);
  };

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
              <Text style={styles.title}>Create Breeding Cross</Text>
              <Text style={styles.subtitle}>Define a new parent cross</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* 1. Breeding Program Selector */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  Breeding Program <Text style={styles.required}>*</Text>
                </Text>
                {selectedProgram ? (
                  <TouchableOpacity
                    onPress={() => setModalVisible(true)}
                    activeOpacity={0.7}
                    disabled={submitting}
                    style={styles.changeButtonSmall}
                  >
                    <Text style={styles.changeButtonSmallText}>Change</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                style={[
                  styles.selectorWrapper,
                  !selectedProgram && styles.selectorWrapperPlaceholder,
                  selectedProgram && styles.selectorWrapperSelected,
                ]}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
                disabled={submitting}
              >
                <View
                  style={[
                    styles.selectorIconBox,
                    selectedProgram && styles.selectorIconBoxSelected,
                  ]}
                >
                  <Ionicons
                    name="leaf"
                    size={18}
                    color={selectedProgram ? "#1B5E20" : "#2E7D32"}
                  />
                </View>
                <View style={styles.selectorContent}>
                  {selectedProgram ? (
                    <>
                      <Text style={styles.selectedProgramName} numberOfLines={1}>
                        {selectedProgram.program_name}
                      </Text>
                      <Text style={styles.selectedCropName}>
                        Crop: {selectedProgram.crop_name || "Not specified"}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.placeholderText}>
                      {loadingPrograms
                        ? "Loading available programs..."
                        : "Select a breeding program"}
                    </Text>
                  )}
                </View>
                {loadingPrograms ? (
                  <ActivityIndicator size="small" color="#2E7D32" />
                ) : (
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={selectedProgram ? "#2E7D32" : "#78909C"}
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Parent Cross Section Header */}
            <View style={styles.parentSectionHeader}>
              <Ionicons name="git-merge-outline" size={18} color="#2E7D32" />
              <Text style={styles.sectionHeaderTitle}>Parent Varieties</Text>
            </View>

            {/* 2. Parent 1 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Parent 1 (♀ Female) <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="female-outline"
                  size={18}
                  color="#E91E63"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter first parent variety"
                  placeholderTextColor="#90A4AE"
                  value={parent1}
                  onChangeText={setParent1}
                  editable={!submitting}
                />
              </View>
            </View>

            {/* 3. Parent 2 */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Parent 2 (♂ Male) <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="male-outline"
                  size={18}
                  color="#1976D2"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter second parent variety"
                  placeholderTextColor="#90A4AE"
                  value={parent2}
                  onChangeText={setParent2}
                  editable={!submitting}
                />
              </View>
            </View>

            {/* Cross Details Section Header */}
            <View style={styles.parentSectionHeader}>
              <Ionicons name="barcode-outline" size={18} color="#2E7D32" />
              <Text style={styles.sectionHeaderTitle}>Cross Identification</Text>
            </View>

            {/* 4. Cross Code */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Cross Code <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="pricetag-outline"
                  size={18}
                  color="#546E7A"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. CROSS-001"
                  placeholderTextColor="#90A4AE"
                  value={crossCode}
                  onChangeText={setCrossCode}
                  autoCapitalize="characters"
                  editable={!submitting}
                />
              </View>
            </View>

            {/* Two Column: 5. Cross Date & 6. Generation */}
            <View style={styles.twoColumnRow}>
              {/* Cross Date */}
              <View style={[styles.halfColumn]}>
                <AppDatePicker
                  label="Cross Date"
                  placeholder="Select cross date"
                  value={crossDate}
                  onChange={setCrossDate}
                  isRequired={true}
                  maxDate={new Date()}
                />
              </View>

              {/* Generation */}
              <View style={[styles.inputGroup, styles.halfColumn]}>
                <Text style={styles.label}>Generation</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="layers-outline"
                    size={17}
                    color="#546E7A"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. F1, F2, BC1"
                    placeholderTextColor="#64748B"
                    cursorColor="#1B5E20"
                    value={generation}
                    onChangeText={setGeneration}
                    autoCapitalize="characters"
                    editable={!submitting}
                  />
                </View>
              </View>
            </View>

            {/* Generation Shortcuts */}
            <View style={styles.genChipsRow}>
              <Text style={styles.chipsLabel}>Presets:</Text>
              {commonGenerations.map((gen) => (
                <TouchableOpacity
                  key={gen}
                  style={[
                    styles.genChip,
                    generation.toUpperCase() === gen && styles.genChipSelected,
                  ]}
                  onPress={() => setGeneration(gen)}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.genChipText,
                      generation.toUpperCase() === gen &&
                        styles.genChipTextSelected,
                    ]}
                  >
                    {gen}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 8. Success Status */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Success Status</Text>
              <View style={styles.statusChipsRow}>
                {statusOptions.map((opt) => {
                  const isSelected = successStatus === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.statusChip,
                        isSelected && {
                          backgroundColor: opt.bg,
                          borderColor: opt.border,
                          borderWidth: 1.5,
                        },
                      ]}
                      onPress={() => setSuccessStatus(opt.id)}
                      disabled={submitting}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.chipDot,
                          {
                            backgroundColor: isSelected
                              ? opt.color
                              : "#B0BEC5",
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && {
                            color: opt.color,
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 7. Objective */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Objective</Text>
              <View style={[styles.inputWrapper, styles.multilineWrapper]}>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="What is the objective of this cross?"
                  placeholderTextColor="#90A4AE"
                  value={objective}
                  onChangeText={setObjective}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!submitting}
                />
              </View>
            </View>

            {/* 9. Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <View style={[styles.inputWrapper, styles.multilineWrapper]}>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="Additional notes..."
                  placeholderTextColor="#90A4AE"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
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
                  <Text style={styles.submitButtonText}>Creating...</Text>
                </View>
              ) : (
                <View style={styles.buttonInlineContent}>
                  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Create Cross</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Program Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Breeding Program</Text>
                <Text style={styles.modalSubtitle}>
                  Choose the parent program for this cross
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color="#455A64" />
              </TouchableOpacity>
            </View>

            {/* Modal Program List */}
            {programs.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Ionicons name="leaf-outline" size={48} color="#B0BEC5" />
                <Text style={styles.modalEmptyTitle}>
                  No breeding programs found
                </Text>
                <Text style={styles.modalEmptySubtitle}>
                  You need at least one breeding program before creating a cross.
                </Text>
                <TouchableOpacity
                  style={styles.modalCreateProgramButton}
                  onPress={() => {
                    setModalVisible(false);
                    router.push("/breeder/create-program");
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.modalCreateProgramText}>
                    Create Breeding Program
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={programs}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => {
                  const isSelected = selectedProgram?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.programOptionItem,
                        isSelected && styles.programOptionItemSelected,
                      ]}
                      onPress={() => handleSelectProgram(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.programOptionIconBox}>
                        <Ionicons
                          name="leaf"
                          size={18}
                          color={isSelected ? "#1B5E20" : "#2E7D32"}
                        />
                      </View>
                      <View style={styles.programOptionInfo}>
                        <Text
                          style={[
                            styles.programOptionName,
                            isSelected && styles.programOptionNameSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {item.program_name}
                        </Text>
                        <Text style={styles.programOptionCrop}>
                          Crop: {item.crop_name || "General"}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#2E7D32"
                        />
                      ) : (
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#CFD8DC"
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.modalListContent}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
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
  },

  /* Header */
  header: {
    backgroundColor: "#1B5E20",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
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
  parentSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 14,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2EE",
  },
  sectionHeaderTitle: {
    fontSize: 15,
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
    fontWeight: "500",
    color: "#0F172A",
  },
  multilineWrapper: {
    paddingVertical: 10,
    alignItems: "flex-start",
  },
  multilineInput: {
    minHeight: 76,
  },

  /* Label Row & Change Button */
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  changeButtonSmall: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  changeButtonSmallText: {
    fontSize: 12,
    color: "#1B5E20",
    fontWeight: "700",
  },

  /* Program Selector */
  selectorWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F8F1",
    borderWidth: 1.3,
    borderColor: "#A5D6A7",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectorWrapperSelected: {
    backgroundColor: "#E8F5E9",
    borderColor: "#81C784",
    borderWidth: 1.5,
  },
  selectorWrapperPlaceholder: {
    backgroundColor: "#FAFCFA",
    borderColor: "#CFD8DC",
  },
  selectorIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  selectorIconBoxSelected: {
    backgroundColor: "#C8E6C9",
  },
  selectorContent: {
    flex: 1,
  },
  selectedProgramName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B5E20",
  },
  selectedCropName: {
    fontSize: 12,
    color: "#455A64",
    marginTop: 2,
    fontWeight: "500",
  },
  placeholderText: {
    fontSize: 14,
    color: "#90A4AE",
  },

  /* Two Column */
  twoColumnRow: {
    flexDirection: "row",
    gap: 12,
  },
  halfColumn: {
    flex: 1,
  },

  /* Generation Chips */
  genChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: -8,
    marginBottom: 16,
  },
  chipsLabel: {
    fontSize: 12,
    color: "#78909C",
    fontWeight: "600",
    marginRight: 4,
  },
  genChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#ECEFF1",
    borderWidth: 1,
    borderColor: "#CFD8DC",
  },
  genChipSelected: {
    backgroundColor: "#E3F2FD",
    borderColor: "#90CAF9",
  },
  genChipText: {
    fontSize: 12,
    color: "#546E7A",
    fontWeight: "600",
  },
  genChipTextSelected: {
    color: "#1565C0",
  },

  /* Status Chips */
  statusChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECEFF1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CFD8DC",
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    color: "#546E7A",
    fontWeight: "500",
  },

  /* Submit Button */
  submitButton: {
    backgroundColor: "#2E7D32",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
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

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEFF1",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#263238",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#78909C",
    marginTop: 2,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F6F4",
    justifyContent: "center",
    alignItems: "center",
  },
  modalListContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  programOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFCFA",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E7E0",
  },
  programOptionItemSelected: {
    backgroundColor: "#E8F5E9",
    borderColor: "#A5D6A7",
    borderWidth: 1.5,
  },
  programOptionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  programOptionInfo: {
    flex: 1,
  },
  programOptionName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#263238",
  },
  programOptionNameSelected: {
    color: "#1B5E20",
    fontWeight: "700",
  },
  programOptionCrop: {
    fontSize: 12,
    color: "#78909C",
    marginTop: 2,
  },
  modalEmptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  modalEmptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#37474F",
    marginTop: 12,
  },
  modalEmptySubtitle: {
    fontSize: 13,
    color: "#78909C",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  modalCreateProgramButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E7D32",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalCreateProgramText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
});
