import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useMemo } from "react";
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

export default function CreateBreedingTrial() {
  const router = useRouter();
  const { programId } = useLocalSearchParams();

  // Form states
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedCross, setSelectedCross] = useState(null);
  const [trialName, setTrialName] = useState("");
  const [location, setLocation] = useState("");
  const [season, setSeason] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("planned");
  const [notes, setNotes] = useState("");

  // Data & loading states
  const [programs, setPrograms] = useState([]);
  const [allCrosses, setAllCrosses] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal selectors visibility
  const [programModalVisible, setProgramModalVisible] = useState(false);
  const [crossModalVisible, setCrossModalVisible] = useState(false);

  // Status options config
  const statusOptions = [
    {
      id: "planned",
      label: "Planned",
      bg: "#E3F2FD",
      color: "#1565C0",
      border: "#90CAF9",
    },
    {
      id: "ongoing",
      label: "Ongoing",
      bg: "#E8F5E9",
      color: "#2E7D32",
      border: "#A5D6A7",
    },
    {
      id: "completed",
      label: "Completed",
      bg: "#E0F2F1",
      color: "#00695C",
      border: "#80CBC4",
    },
    {
      id: "cancelled",
      label: "Cancelled",
      bg: "#FFEBEE",
      color: "#C62828",
      border: "#EF9A9A",
    },
  ];

  // Common season presets
  const currentYear = new Date().getFullYear();
  const seasonPresets = [
    `Kharif ${currentYear}`,
    `Rabi ${currentYear}`,
    `Zaid ${currentYear}`,
    `Summer ${currentYear}`,
  ];

  // Fetch programs and crosses on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [programsRes, crossesRes] = await Promise.all([
          API.get("/breeder/programs"),
          API.get("/breeder/crosses"),
        ]);

        const fetchedPrograms = programsRes.data?.programs || [];
        const fetchedCrosses = crossesRes.data?.crosses || [];

        setPrograms(fetchedPrograms);
        setAllCrosses(fetchedCrosses);

        // Auto-select program if programId param is passed
        if (programId) {
          const matched = fetchedPrograms.find(
            (p) => Number(p.id) === Number(programId)
          );
          if (matched) {
            setSelectedProgram(matched);
          }
        }
      } catch (error) {
        console.log(
          "FETCH INITIAL DATA ERROR:",
          error.response?.data || error.message
        );
        Alert.alert(
          "Error",
          error.response?.data?.message ||
            "Failed to load breeding programs and crosses. Please try again."
        );
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [programId]);

  // Filter crosses that belong to the selected program
  const availableCrosses = useMemo(() => {
    if (!selectedProgram) return [];
    return allCrosses.filter(
      (c) => Number(c.program_id) === Number(selectedProgram.id)
    );
  }, [allCrosses, selectedProgram]);

  // Handle program selection
  const handleSelectProgram = (prog) => {
    if (!selectedProgram || selectedProgram.id !== prog.id) {
      setSelectedProgram(prog);
      setSelectedCross(null); // Clear selected cross when program changes
    }
    setProgramModalVisible(false);
  };

  // Handle cross selection
  const handleSelectCross = (cr) => {
    setSelectedCross(cr);
    setCrossModalVisible(false);
  };

  // Submit trial creation
  const handleSubmit = async () => {
    if (!selectedProgram) {
      Alert.alert("Missing Information", "Please select a breeding program.");
      return;
    }

    if (!trialName.trim()) {
      Alert.alert("Missing Information", "Please enter a trial name.");
      return;
    }

    if (submitting) return;

    try {
      setSubmitting(true);

      const payload = {
        program_id: Number(selectedProgram.id),
        cross_id: selectedCross ? Number(selectedCross.id) : null,
        trial_name: trialName.trim(),
        location: location.trim() || null,
        season: season.trim() || null,
        start_date: startDate.trim() || null,
        end_date: endDate.trim() || null,
        status: status || "planned",
        notes: notes.trim() || null,
      };

      const response = await API.post("/breeder/trials", payload);

      Alert.alert(
        "Success",
        response.data?.message || "Breeding trial created successfully",
        [
          {
            text: "OK",
            onPress: () => {
              router.replace("/breeder/trials");
            },
          },
        ]
      );
    } catch (error) {
      console.log(
        "CREATE BREEDING TRIAL ERROR:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Creation Failed",
        error.response?.data?.message ||
          "Could not create breeding trial. Please verify the inputs and try again."
      );
    } finally {
      setSubmitting(false);
    }
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
              <Text style={styles.title}>Create Breeding Trial</Text>
              <Text style={styles.subtitle}>Set up a new field trial</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* 1. Breeding Program Selector (Required) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  Breeding Program <Text style={styles.required}>*</Text>
                </Text>
                {selectedProgram ? (
                  <TouchableOpacity
                    onPress={() => setProgramModalVisible(true)}
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
                onPress={() => setProgramModalVisible(true)}
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
                      <Text style={styles.selectedTitle} numberOfLines={1}>
                        {selectedProgram.program_name}
                      </Text>
                      <Text style={styles.selectedSubtitle}>
                        Crop: {selectedProgram.crop_name || "General"}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.placeholderText}>
                      {loadingData
                        ? "Loading available programs..."
                        : "Select a breeding program"}
                    </Text>
                  )}
                </View>
                {loadingData ? (
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

            {/* 2. Breeding Cross Selector (Optional) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Associated Cross</Text>
                <Text style={styles.optionalTag}>(Optional)</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.selectorWrapper,
                  styles.crossSelectorWrapper,
                  !selectedCross && styles.selectorWrapperPlaceholder,
                  !selectedProgram && styles.selectorWrapperDisabled,
                ]}
                onPress={() => {
                  if (!selectedProgram) {
                    Alert.alert(
                      "Select Program First",
                      "Please choose a breeding program before selecting an associated cross."
                    );
                    return;
                  }
                  setCrossModalVisible(true);
                }}
                activeOpacity={0.8}
                disabled={submitting || !selectedProgram}
              >
                <View style={[styles.selectorIconBox, styles.crossIconBox]}>
                  <Ionicons name="git-merge" size={17} color="#1565C0" />
                </View>
                <View style={styles.selectorContent}>
                  {selectedCross ? (
                    <>
                      <Text style={styles.selectedTitle} numberOfLines={1}>
                        {selectedCross.cross_code}
                      </Text>
                      <Text style={styles.selectedSubtitle}>
                        {selectedCross.parent_1} × {selectedCross.parent_2}
                        {selectedCross.generation
                          ? ` (${selectedCross.generation})`
                          : ""}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.placeholderText}>
                      {!selectedProgram
                        ? "Select a program first"
                        : availableCrosses.length === 0
                        ? "No crosses available for this program"
                        : "Select a cross (or leave empty)"}
                    </Text>
                  )}
                </View>

                {selectedCross ? (
                  <TouchableOpacity
                    onPress={() => setSelectedCross(null)}
                    style={styles.clearSelectionIcon}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={19} color="#78909C" />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-down" size={20} color="#78909C" />
                )}
              </TouchableOpacity>
            </View>

            {/* Trial Information Section Header */}
            <View style={styles.sectionHeader}>
              <Ionicons name="flask-outline" size={18} color="#2E7D32" />
              <Text style={styles.sectionHeaderTitle}>Trial Specification</Text>
            </View>

            {/* 3. Trial Name (Required) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Trial Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="bookmark-outline"
                  size={18}
                  color="#546E7A"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter trial name"
                  placeholderTextColor="#90A4AE"
                  value={trialName}
                  onChangeText={setTrialName}
                  editable={!submitting}
                />
              </View>
            </View>

            {/* 4. Location */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="location-outline"
                  size={18}
                  color="#546E7A"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Research Farm, Gujarat"
                  placeholderTextColor="#90A4AE"
                  value={location}
                  onChangeText={setLocation}
                  editable={!submitting}
                />
              </View>
            </View>

            {/* 5. Season */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Season</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="partly-sunny-outline"
                  size={18}
                  color="#546E7A"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Kharif 2026"
                  placeholderTextColor="#90A4AE"
                  value={season}
                  onChangeText={setSeason}
                  editable={!submitting}
                />
              </View>
            </View>

            {/* Season Presets */}
            <View style={styles.presetsRow}>
              <Text style={styles.presetsLabel}>Suggestions:</Text>
              {seasonPresets.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.presetChip,
                    season === s && styles.presetChipSelected,
                  ]}
                  onPress={() => setSeason(s)}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      season === s && styles.presetChipTextSelected,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 6. Start Date & 7. End Date */}
            <View style={styles.twoColumnRow}>
              <View style={[styles.inputGroup, styles.halfColumn]}>
                <Text style={styles.label}>Start Date</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="calendar-outline"
                    size={17}
                    color="#546E7A"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#90A4AE"
                    value={startDate}
                    onChangeText={setStartDate}
                    editable={!submitting}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, styles.halfColumn]}>
                <Text style={styles.label}>End Date</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="flag-outline"
                    size={17}
                    color="#546E7A"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#90A4AE"
                    value={endDate}
                    onChangeText={setEndDate}
                    editable={!submitting}
                  />
                </View>
              </View>
            </View>

            {/* 8. Status */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Trial Status</Text>
              <View style={styles.statusChipsRow}>
                {statusOptions.map((opt) => {
                  const isSelected = status === opt.id;
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
                      onPress={() => setStatus(opt.id)}
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

            {/* 9. Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <View style={[styles.inputWrapper, styles.multilineWrapper]}>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="Add trial notes, plot layout details, environmental conditions..."
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
                  <Text style={styles.submitButtonText}>Create Trial</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Program Selection Modal */}
      <Modal
        visible={programModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setProgramModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Breeding Program</Text>
                <Text style={styles.modalSubtitle}>
                  Choose the parent program for this trial
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setProgramModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color="#455A64" />
              </TouchableOpacity>
            </View>

            {/* Programs List */}
            {programs.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Ionicons name="leaf-outline" size={48} color="#B0BEC5" />
                <Text style={styles.modalEmptyTitle}>
                  No breeding programs found
                </Text>
                <Text style={styles.modalEmptySubtitle}>
                  You need to create a breeding program first before creating a trial.
                </Text>
                <TouchableOpacity
                  style={styles.modalActionButton}
                  onPress={() => {
                    setProgramModalVisible(false);
                    router.push("/breeder/create-program");
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.modalActionButtonText}>
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
                        styles.optionItem,
                        isSelected && styles.optionItemSelected,
                      ]}
                      onPress={() => handleSelectProgram(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionIconBox}>
                        <Ionicons
                          name="leaf"
                          size={18}
                          color={isSelected ? "#1B5E20" : "#2E7D32"}
                        />
                      </View>
                      <View style={styles.optionInfo}>
                        <Text
                          style={[
                            styles.optionName,
                            isSelected && styles.optionNameSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {item.program_name}
                        </Text>
                        <Text style={styles.optionDetail}>
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

      {/* Cross Selection Modal */}
      <Modal
        visible={crossModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCrossModalVisible(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Associated Cross</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedProgram
                    ? `Crosses from "${selectedProgram.program_name}"`
                    : "Choose a cross for this trial"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setCrossModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color="#455A64" />
              </TouchableOpacity>
            </View>

            {/* Clear / None Option */}
            <TouchableOpacity
              style={[
                styles.optionItem,
                styles.noneOptionItem,
                !selectedCross && styles.optionItemSelected,
              ]}
              onPress={() => {
                setSelectedCross(null);
                setCrossModalVisible(false);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIconBox, styles.noneIconBox]}>
                <Ionicons name="close-circle-outline" size={18} color="#78909C" />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionName}>None (No cross assigned)</Text>
                <Text style={styles.optionDetail}>
                  Proceed without linking a specific parent cross
                </Text>
              </View>
              {!selectedCross ? (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color="#2E7D32"
                />
              ) : null}
            </TouchableOpacity>

            {/* Crosses List */}
            {availableCrosses.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Ionicons name="git-merge-outline" size={48} color="#B0BEC5" />
                <Text style={styles.modalEmptyTitle}>
                  No crosses available for this program
                </Text>
                <Text style={styles.modalEmptySubtitle}>
                  There are no parent crosses registered under this program yet.
                  You can still create a trial without a cross!
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableCrosses}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => {
                  const isSelected = selectedCross?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.optionItem,
                        isSelected && styles.optionItemSelected,
                      ]}
                      onPress={() => handleSelectCross(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.optionIconBox, styles.crossIconBox]}>
                        <Ionicons
                          name="git-merge"
                          size={18}
                          color={isSelected ? "#0D47A1" : "#1565C0"}
                        />
                      </View>
                      <View style={styles.optionInfo}>
                        <View style={styles.crossCodeRow}>
                          <Text
                            style={[
                              styles.optionName,
                              isSelected && styles.optionNameSelected,
                            ]}
                          >
                            {item.cross_code}
                          </Text>
                          {item.generation ? (
                            <View style={styles.genBadge}>
                              <Text style={styles.genBadgeText}>
                                {item.generation}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.optionDetail}>
                          {item.parent_1} × {item.parent_2}
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
  sectionHeader: {
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
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#37474F",
    marginBottom: 7,
  },
  optionalTag: {
    fontSize: 12,
    color: "#78909C",
    fontWeight: "500",
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
    color: "#263238",
  },
  multilineWrapper: {
    paddingVertical: 10,
    alignItems: "flex-start",
  },
  multilineInput: {
    minHeight: 76,
  },

  /* Change Button */
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

  /* Selectors */
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
  crossSelectorWrapper: {
    backgroundColor: "#F2F7FD",
    borderColor: "#90CAF9",
  },
  selectorWrapperPlaceholder: {
    backgroundColor: "#FAFCFA",
    borderColor: "#CFD8DC",
  },
  selectorWrapperDisabled: {
    opacity: 0.6,
    backgroundColor: "#F5F5F5",
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
  crossIconBox: {
    backgroundColor: "#E3F2FD",
  },
  selectorContent: {
    flex: 1,
  },
  selectedTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B5E20",
  },
  selectedSubtitle: {
    fontSize: 12,
    color: "#455A64",
    marginTop: 2,
    fontWeight: "500",
  },
  placeholderText: {
    fontSize: 14,
    color: "#90A4AE",
  },
  clearSelectionIcon: {
    padding: 4,
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
    fontSize: 12,
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
    maxHeight: "78%",
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
  noneOptionItem: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "#F7F9F7",
  },
  noneIconBox: {
    backgroundColor: "#ECEFF1",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFCFA",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E7E0",
  },
  optionItemSelected: {
    backgroundColor: "#E8F5E9",
    borderColor: "#A5D6A7",
    borderWidth: 1.5,
  },
  optionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionInfo: {
    flex: 1,
  },
  crossCodeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  genBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  genBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1565C0",
  },
  optionName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#263238",
  },
  optionNameSelected: {
    color: "#1B5E20",
    fontWeight: "700",
  },
  optionDetail: {
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
    marginBottom: 16,
    lineHeight: 18,
  },
  modalActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E7D32",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalActionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
});
