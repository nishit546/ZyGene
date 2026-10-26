import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useCallback } from "react";
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
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../../../services/api";

export default function BreedingProgramDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  // Program details state
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Crosses workspace state
  const [crosses, setCrosses] = useState([]);
  const [loadingCrosses, setLoadingCrosses] = useState(true);
  const [crossesError, setCrossesError] = useState(null);

  // Trials workspace state
  const [trials, setTrials] = useState([]);
  const [loadingTrials, setLoadingTrials] = useState(true);
  const [trialsError, setTrialsError] = useState(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form states for editing
  const [editProgramName, setEditProgramName] = useState("");
  const [editCropName, setEditCropName] = useState("");
  const [editObjective, setEditObjective] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editExpectedEndDate, setEditExpectedEndDate] = useState("");
  const [editStatus, setEditStatus] = useState("planned");
  const [editDescription, setEditDescription] = useState("");

  // Status configuration
  const statusOptions = [
    {
      id: "planned",
      label: "Planned",
      bg: "#E3F2FD",
      color: "#1565C0",
      border: "#90CAF9",
    },
    {
      id: "active",
      label: "Active",
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

  // Helper to extract clean date string (YYYY-MM-DD)
  const sanitizeDateForInput = (dateVal) => {
    if (!dateVal) return "";
    if (typeof dateVal === "string" && dateVal.includes("T")) {
      return dateVal.split("T")[0];
    }
    return String(dateVal);
  };

  // Helper to format date for human-readable display
  const formatDate = (dateStr) => {
    if (!dateStr) return "Not specified";
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

  // Populate edit fields from program data
  const initEditForm = useCallback((data) => {
    if (!data) return;
    setEditProgramName(data.program_name || "");
    setEditCropName(data.crop_name || "");
    setEditObjective(data.objective || "");
    setEditStartDate(sanitizeDateForInput(data.start_date));
    setEditExpectedEndDate(sanitizeDateForInput(data.expected_end_date));
    setEditStatus(data.status || "planned");
    setEditDescription(data.description || "");
  }, []);

  // Fetch all program workspace data (Program details, Crosses, Trials)
  const loadAllData = useCallback(
    async (isRefresh = false) => {
      if (!id || isNaN(Number(id))) {
        setLoading(false);
        setLoadingCrosses(false);
        setLoadingTrials(false);
        return;
      }
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setLoadingCrosses(true);
        setLoadingTrials(true);
      }

      try {
        const [programRes, crossesRes, trialsRes] = await Promise.allSettled([
          API.get(`/breeder/programs/${id}`),
          API.get("/breeder/crosses"),
          API.get("/breeder/trials"),
        ]);

        // 1. Program details
        if (programRes.status === "fulfilled") {
          const fetchedProgram = programRes.value.data?.program;
          setProgram(fetchedProgram);
          initEditForm(fetchedProgram);
        } else {
          console.log(
            "FETCH PROGRAM DETAILS ERROR:",
            programRes.reason?.response?.data || programRes.reason?.message
          );
          Alert.alert(
            "Error",
            programRes.reason?.response?.data?.message ||
              "Failed to load breeding program details. Please try again."
          );
        }

        // 2. Program Crosses (filtered by program_id)
        if (crossesRes.status === "fulfilled") {
          const allCrosses = crossesRes.value.data?.crosses || [];
          const filteredCrosses = allCrosses.filter(
            (c) => Number(c.program_id) === Number(id)
          );
          setCrosses(filteredCrosses);
          setCrossesError(null);
        } else {
          console.log(
            "FETCH PROGRAM CROSSES ERROR:",
            crossesRes.reason?.response?.data || crossesRes.reason?.message
          );
          setCrossesError("Failed to load crosses for this program.");
        }
        setLoadingCrosses(false);

        // 3. Program Trials (filtered by program_id)
        if (trialsRes.status === "fulfilled") {
          const allTrials = trialsRes.value.data?.trials || [];
          const filteredTrials = allTrials.filter(
            (t) => Number(t.program_id) === Number(id)
          );
          setTrials(filteredTrials);
          setTrialsError(null);
        } else {
          console.log(
            "FETCH PROGRAM TRIALS ERROR:",
            trialsRes.reason?.response?.data || trialsRes.reason?.message
          );
          setTrialsError("Failed to load trials for this program.");
        }
        setLoadingTrials(false);
      } catch (error) {
        console.log(
          "FETCH WORKSPACE ERROR:",
          error.response?.data || error.message
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, initEditForm]
  );

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const onRefresh = useCallback(() => {
    loadAllData(true);
  }, [loadAllData]);

  // Handle Edit button toggle
  const handleToggleEdit = () => {
    if (isEditing) {
      // Cancel edit and reset form
      initEditForm(program);
      setIsEditing(false);
    } else {
      initEditForm(program);
      setIsEditing(true);
    }
  };

  // Save changes (PUT /breeder/programs/:id)
  const handleSaveChanges = async () => {
    if (!editProgramName.trim()) {
      Alert.alert("Missing Information", "Please enter a program name.");
      return;
    }

    if (!editCropName.trim()) {
      Alert.alert("Missing Information", "Please enter a crop name.");
      return;
    }

    if (saving) return;

    try {
      setSaving(true);

      const payload = {
        program_name: editProgramName.trim(),
        crop_name: editCropName.trim(),
        objective: editObjective.trim() || null,
        start_date: editStartDate.trim() || null,
        expected_end_date: editExpectedEndDate.trim() || null,
        status: editStatus || "planned",
        description: editDescription.trim() || null,
      };

      const response = await API.put(`/breeder/programs/${id}`, payload);

      Alert.alert(
        "Success",
        response.data?.message || "Breeding program updated successfully",
        [
          {
            text: "OK",
            onPress: () => {
              setIsEditing(false);
              loadAllData();
            },
          },
        ]
      );
    } catch (error) {
      console.log(
        "UPDATE PROGRAM ERROR:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Update Failed",
        error.response?.data?.message ||
          "Could not update breeding program. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete program (DELETE /breeder/programs/:id)
  const handleDeleteProgram = () => {
    Alert.alert(
      "Delete Breeding Program?",
      "This will permanently remove this breeding program and its related records.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              const response = await API.delete(`/breeder/programs/${id}`);

              Alert.alert(
                "Success",
                response.data?.message || "Breeding program deleted successfully",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      router.replace("/breeder/programs");
                    },
                  },
                ]
              );
            } catch (error) {
              console.log(
                "DELETE PROGRAM ERROR:",
                error.response?.data || error.message
              );
              Alert.alert(
                "Delete Failed",
                error.response?.data?.message ||
                  "Could not delete this breeding program. Please try again."
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Status visual badge styling
  const getStatusBadge = (statusKey) => {
    const s = (statusKey || "").toLowerCase();
    const found = statusOptions.find((opt) => opt.id === s);
    if (found) {
      return {
        backgroundColor: found.bg,
        textColor: found.color,
        dotColor: found.color,
        label: found.label,
      };
    }
    return {
      backgroundColor: "#E3F2FD",
      textColor: "#1565C0",
      dotColor: "#1565C0",
      label: statusKey || "Planned",
    };
  };

  // Cross status badge styling
  const getCrossStatusBadge = (statusKey) => {
    const s = (statusKey || "").toLowerCase();
    switch (s) {
      case "successful":
        return {
          backgroundColor: "#E8F5E9",
          textColor: "#2E7D32",
          label: "Successful",
        };
      case "under_evaluation":
        return {
          backgroundColor: "#FFF8E1",
          textColor: "#F57F17",
          label: "Under Evaluation",
        };
      case "failed":
        return {
          backgroundColor: "#FFEBEE",
          textColor: "#C62828",
          label: "Failed",
        };
      case "planned":
      default:
        return {
          backgroundColor: "#E3F2FD",
          textColor: "#1565C0",
          label: "Planned",
        };
    }
  };

  // Trial status badge styling
  const getTrialStatusBadge = (statusKey) => {
    const s = (statusKey || "").toLowerCase();
    switch (s) {
      case "ongoing":
        return {
          backgroundColor: "#E8F5E9",
          textColor: "#2E7D32",
          label: "Ongoing",
        };
      case "completed":
        return {
          backgroundColor: "#E0F2F1",
          textColor: "#00695C",
          label: "Completed",
        };
      case "cancelled":
        return {
          backgroundColor: "#FFEBEE",
          textColor: "#C62828",
          label: "Cancelled",
        };
      case "planned":
      default:
        return {
          backgroundColor: "#E3F2FD",
          textColor: "#1565C0",
          label: "Planned",
        };
    }
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
            <Text style={styles.title}>Program Details</Text>
            <Text style={styles.subtitle}>Breeding Program</Text>
          </View>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading program details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Not Found State
  if (!program) {
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
            <Text style={styles.title}>Program Details</Text>
            <Text style={styles.subtitle}>Breeding Program</Text>
          </View>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={54} color="#C62828" />
          <Text style={styles.notFoundTitle}>Program Not Found</Text>
          <Text style={styles.notFoundText}>
            The requested breeding program could not be located or has been deleted.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.replace("/breeder/programs")}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Back to Programs</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentStatusConfig = getStatusBadge(program.status);

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2E7D32"]}
              tintColor="#2E7D32"
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              {isEditing ? (
                <View style={styles.editingTag}>
                  <Ionicons name="create-outline" size={14} color="#E8F5E9" />
                  <Text style={styles.editingTagText}>Editing Mode</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Program Details</Text>
              <Text style={styles.subtitle}>Breeding Program</Text>
            </View>
          </View>

          {/* Compact Program Summary */}
          {!isEditing ? (
            <View style={styles.topSummaryRow}>
              <View style={styles.topSummaryCard}>
                <View
                  style={[
                    styles.topSummaryIconCircle,
                    { backgroundColor: "#E3F2FD" },
                  ]}
                >
                  <Ionicons name="git-merge-outline" size={20} color="#1565C0" />
                </View>
                <View style={styles.topSummaryTextWrap}>
                  <Text style={styles.topSummaryNumber}>
                    {loadingCrosses ? "-" : crosses.length}
                  </Text>
                  <Text style={styles.topSummaryLabel}>Crosses</Text>
                </View>
              </View>

              <View style={styles.topSummaryCard}>
                <View
                  style={[
                    styles.topSummaryIconCircle,
                    { backgroundColor: "#E0F2F1" },
                  ]}
                >
                  <Ionicons name="flask-outline" size={20} color="#00695C" />
                </View>
                <View style={styles.topSummaryTextWrap}>
                  <Text style={styles.topSummaryNumber}>
                    {loadingTrials ? "-" : trials.length}
                  </Text>
                  <Text style={styles.topSummaryLabel}>Trials</Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* EDIT FORM MODE */}
          {isEditing ? (
            <View style={styles.card}>
              <View style={styles.cardHeaderWithAction}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="create-outline" size={20} color="#2E7D32" />
                  <Text style={styles.sectionHeaderTitle}>Edit Program</Text>
                </View>
                <TouchableOpacity
                  onPress={handleToggleEdit}
                  disabled={saving}
                  style={styles.cancelLink}
                >
                  <Text style={styles.cancelLinkText}>Cancel</Text>
                </TouchableOpacity>
              </View>

              {/* Program Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Program Name <Text style={styles.required}>*</Text>
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
                    placeholder="e.g., High-Yield Drought Wheat 2026"
                    placeholderTextColor="#90A4AE"
                    value={editProgramName}
                    onChangeText={setEditProgramName}
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Crop Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Crop Name <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="leaf-outline"
                    size={18}
                    color="#546E7A"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., Wheat, Maize, Rice"
                    placeholderTextColor="#90A4AE"
                    value={editCropName}
                    onChangeText={setEditCropName}
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Status Picker Chips */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Program Status</Text>
                <View style={styles.statusChipsRow}>
                  {statusOptions.map((opt) => {
                    const isSelected = editStatus === opt.id;
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
                        onPress={() => setEditStatus(opt.id)}
                        disabled={saving}
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

              {/* Objective Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Objective</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="disc-outline"
                    size={18}
                    color="#546E7A"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., Develop drought-resistant trait"
                    placeholderTextColor="#90A4AE"
                    value={editObjective}
                    onChangeText={setEditObjective}
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Dates Row */}
              <View style={styles.twoColumnRow}>
                {/* Start Date */}
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
                      value={editStartDate}
                      onChangeText={setEditStartDate}
                      editable={!saving}
                    />
                  </View>
                </View>

                {/* Expected End Date */}
                <View style={[styles.inputGroup, styles.halfColumn]}>
                  <Text style={styles.label}>Expected End</Text>
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
                      value={editExpectedEndDate}
                      onChangeText={setEditExpectedEndDate}
                      editable={!saving}
                    />
                  </View>
                </View>
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <View style={[styles.inputWrapper, styles.multilineWrapper]}>
                  <TextInput
                    style={[styles.textInput, styles.multilineInput]}
                    placeholder="Provide details about the breeding scheme, parental lineage, or traits..."
                    placeholderTextColor="#90A4AE"
                    value={editDescription}
                    onChangeText={setEditDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Form Buttons */}
              <View style={styles.editActionButtons}>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    saving && styles.disabledButton,
                  ]}
                  onPress={handleSaveChanges}
                  disabled={saving}
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
                        name="checkmark-circle-outline"
                        size={20}
                        color="#FFFFFF"
                      />
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleToggleEdit}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* VIEW DETAILS MODE: MAIN PROGRAM CARD */
            <View style={styles.card}>
              {/* Card Header: Crop Tag & Status Badge */}
              <View style={styles.cardTopRow}>
                <View style={styles.cropBadge}>
                  <Ionicons name="leaf" size={14} color="#2E7D32" />
                  <Text style={styles.cropBadgeText}>
                    {program.crop_name || "Crop"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: currentStatusConfig.backgroundColor },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: currentStatusConfig.dotColor },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: currentStatusConfig.textColor },
                    ]}
                  >
                    {currentStatusConfig.label}
                  </Text>
                </View>
              </View>

              {/* Program Name - Prominent */}
              <Text style={styles.programNameHeading}>
                {program.program_name}
              </Text>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Objective */}
              <View style={styles.infoSection}>
                <View style={styles.sectionIconTitleRow}>
                  <Ionicons
                    name="radio-button-on-outline"
                    size={17}
                    color="#2E7D32"
                  />
                  <Text style={styles.infoSectionTitle}>Objective</Text>
                </View>
                <Text style={styles.infoSectionBody}>
                  {program.objective || "No specific objective specified."}
                </Text>
              </View>

              {/* Date Details Box */}
              <View style={styles.dateCard}>
                <View style={styles.dateCardCol}>
                  <View style={styles.dateCardHeader}>
                    <Ionicons
                      name="calendar-outline"
                      size={15}
                      color="#2E7D32"
                    />
                    <Text style={styles.dateCardLabel}>Start Date</Text>
                  </View>
                  <Text style={styles.dateCardValue}>
                    {formatDate(program.start_date)}
                  </Text>
                </View>

                <View style={styles.dateDividerVertical} />

                <View style={styles.dateCardCol}>
                  <View style={styles.dateCardHeader}>
                    <Ionicons name="flag-outline" size={15} color="#2E7D32" />
                    <Text style={styles.dateCardLabel}>Expected End</Text>
                  </View>
                  <Text style={styles.dateCardValue}>
                    {formatDate(program.expected_end_date)}
                  </Text>
                </View>
              </View>

              {/* Description */}
              <View style={styles.infoSection}>
                <View style={styles.sectionIconTitleRow}>
                  <Ionicons
                    name="document-text-outline"
                    size={17}
                    color="#546E7A"
                  />
                  <Text style={styles.infoSectionTitle}>Description</Text>
                </View>
                <Text style={styles.infoSectionBody}>
                  {program.description ||
                    "No detailed description provided for this breeding program."}
                </Text>
              </View>

              {/* Created Date if available */}
              {program.created_at ? (
                <View style={styles.metaRow}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color="#78909C"
                    style={styles.metaIcon}
                  />
                  <Text style={styles.metaText}>
                    Created on {formatDate(program.created_at)}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* 1. PROGRAM CROSSES SECTION */}
          {!isEditing ? (
            <View style={styles.workspaceSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <View
                    style={[
                      styles.sectionIconBox,
                      { backgroundColor: "#E3F2FD" },
                    ]}
                  >
                    <Ionicons
                      name="git-merge-outline"
                      size={18}
                      color="#1565C0"
                    />
                  </View>
                  <View>
                    <Text style={styles.workspaceSectionTitle}>
                      Program Crosses
                    </Text>
                    <Text style={styles.workspaceSectionSubtitle}>
                      {loadingCrosses
                        ? "Loading crosses..."
                        : `${crosses.length} ${
                            crosses.length === 1 ? "cross" : "crosses"
                          } recorded`}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.createActionButton}
                  onPress={() =>
                    router.push({
                      pathname: "/breeder/create-cross",
                      params: { programId: id },
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.createActionButtonText}>
                    + Create Cross
                  </Text>
                </TouchableOpacity>
              </View>

              {loadingCrosses ? (
                <View style={styles.sectionLoader}>
                  <ActivityIndicator size="small" color="#2E7D32" />
                  <Text style={styles.sectionLoaderText}>Loading crosses...</Text>
                </View>
              ) : crossesError ? (
                <View style={styles.sectionErrorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color="#C62828"
                  />
                  <Text style={styles.sectionErrorText}>{crossesError}</Text>
                </View>
              ) : crosses.length === 0 ? (
                <View style={styles.emptyWorkspaceCard}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons
                      name="git-merge-outline"
                      size={28}
                      color="#78909C"
                    />
                  </View>
                  <Text style={styles.emptyWorkspaceTitle}>
                    No crosses created for this program yet.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyActionButton}
                    onPress={() =>
                      router.push({
                        pathname: "/breeder/create-cross",
                        params: { programId: id },
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.emptyActionButtonText}>
                      Create First Cross
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.itemsListContainer}>
                  {crosses.map((cross) => {
                    const statusConfig = getCrossStatusBadge(
                      cross.success_status
                    );
                    return (
                      <View key={cross.id} style={styles.itemCard}>
                        <View style={styles.itemCardHeader}>
                          <View style={styles.itemTitleWrap}>
                            <Text style={styles.itemCode} numberOfLines={1}>
                              {cross.cross_code || `Cross #${cross.id}`}
                            </Text>
                            {cross.generation ? (
                              <View style={styles.generationBadge}>
                                <Text style={styles.generationBadgeText}>
                                  {cross.generation}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <View
                            style={[
                              styles.miniStatusBadge,
                              {
                                backgroundColor:
                                  statusConfig.backgroundColor,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.miniStatusText,
                                { color: statusConfig.textColor },
                              ]}
                            >
                              {statusConfig.label}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.itemDataRows}>
                          <View style={styles.itemRow}>
                            <Ionicons
                              name="male-outline"
                              size={14}
                              color="#546E7A"
                              style={styles.itemRowIcon}
                            />
                            <Text style={styles.itemRowLabel}>Parent 1:</Text>
                            <Text
                              style={styles.itemRowText}
                              numberOfLines={1}
                            >
                              {cross.parent_1 || "Not specified"}
                            </Text>
                          </View>

                          <View style={styles.itemRow}>
                            <Ionicons
                              name="female-outline"
                              size={14}
                              color="#546E7A"
                              style={styles.itemRowIcon}
                            />
                            <Text style={styles.itemRowLabel}>Parent 2:</Text>
                            <Text
                              style={styles.itemRowText}
                              numberOfLines={1}
                            >
                              {cross.parent_2 || "Not specified"}
                            </Text>
                          </View>

                          <View style={styles.itemRow}>
                            <Ionicons
                              name="calendar-outline"
                              size={14}
                              color="#546E7A"
                              style={styles.itemRowIcon}
                            />
                            <Text style={styles.itemRowLabel}>
                              Cross Date:
                            </Text>
                            <Text style={styles.itemRowText}>
                              {formatDate(cross.cross_date)}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={styles.viewItemButton}
                          onPress={() =>
                            router.push(`/breeder/cross/${cross.id}`)
                          }
                          activeOpacity={0.8}
                        >
                          <Text style={styles.viewItemButtonText}>
                            View Cross
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={14}
                            color="#1565C0"
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}

          {/* 2. PROGRAM TRIALS SECTION */}
          {!isEditing ? (
            <View style={styles.workspaceSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <View
                    style={[
                      styles.sectionIconBox,
                      { backgroundColor: "#E0F2F1" },
                    ]}
                  >
                    <Ionicons
                      name="flask-outline"
                      size={18}
                      color="#00695C"
                    />
                  </View>
                  <View>
                    <Text style={styles.workspaceSectionTitle}>
                      Program Trials
                    </Text>
                    <Text style={styles.workspaceSectionSubtitle}>
                      {loadingTrials
                        ? "Loading trials..."
                        : `${trials.length} ${
                            trials.length === 1 ? "trial" : "trials"
                          } registered`}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.createActionButton,
                    { backgroundColor: "#00695C" },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/breeder/create-trial",
                      params: { programId: id },
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.createActionButtonText}>
                    + Create Trial
                  </Text>
                </TouchableOpacity>
              </View>

              {loadingTrials ? (
                <View style={styles.sectionLoader}>
                  <ActivityIndicator size="small" color="#2E7D32" />
                  <Text style={styles.sectionLoaderText}>Loading trials...</Text>
                </View>
              ) : trialsError ? (
                <View style={styles.sectionErrorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color="#C62828"
                  />
                  <Text style={styles.sectionErrorText}>{trialsError}</Text>
                </View>
              ) : trials.length === 0 ? (
                <View style={styles.emptyWorkspaceCard}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons
                      name="flask-outline"
                      size={28}
                      color="#78909C"
                    />
                  </View>
                  <Text style={styles.emptyWorkspaceTitle}>
                    No trials created for this program yet.
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.emptyActionButton,
                      { backgroundColor: "#00695C" },
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: "/breeder/create-trial",
                        params: { programId: id },
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.emptyActionButtonText}>
                      Create First Trial
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.itemsListContainer}>
                  {trials.map((trial) => {
                    const statusConfig = getTrialStatusBadge(trial.status);
                    return (
                      <View key={trial.id} style={styles.itemCard}>
                        <View style={styles.itemCardHeader}>
                          <View style={styles.itemTitleWrap}>
                            <Text style={styles.itemCode} numberOfLines={1}>
                              {trial.trial_name || `Trial #${trial.id}`}
                            </Text>
                            {trial.cross_code ? (
                              <View style={styles.crossCodeTag}>
                                <Ionicons
                                  name="git-merge-outline"
                                  size={11}
                                  color="#1565C0"
                                />
                                <Text style={styles.crossCodeTagText}>
                                  {trial.cross_code}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <View
                            style={[
                              styles.miniStatusBadge,
                              {
                                backgroundColor:
                                  statusConfig.backgroundColor,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.miniStatusText,
                                { color: statusConfig.textColor },
                              ]}
                            >
                              {statusConfig.label}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.itemDataRows}>
                          {trial.location ? (
                            <View style={styles.itemRow}>
                              <Ionicons
                                name="location-outline"
                                size={14}
                                color="#546E7A"
                                style={styles.itemRowIcon}
                              />
                              <Text style={styles.itemRowLabel}>
                                Location:
                              </Text>
                              <Text
                                style={styles.itemRowText}
                                numberOfLines={1}
                              >
                                {trial.location}
                              </Text>
                            </View>
                          ) : null}

                          {trial.season ? (
                            <View style={styles.itemRow}>
                              <Ionicons
                                name="partly-sunny-outline"
                                size={14}
                                color="#546E7A"
                                style={styles.itemRowIcon}
                              />
                              <Text style={styles.itemRowLabel}>Season:</Text>
                              <Text
                                style={styles.itemRowText}
                                numberOfLines={1}
                              >
                                {trial.season}
                              </Text>
                            </View>
                          ) : null}

                          <View style={styles.itemRow}>
                            <Ionicons
                              name="calendar-outline"
                              size={14}
                              color="#546E7A"
                              style={styles.itemRowIcon}
                            />
                            <Text style={styles.itemRowLabel}>
                              Start Date:
                            </Text>
                            <Text style={styles.itemRowText}>
                              {formatDate(trial.start_date)}
                            </Text>
                          </View>

                          <View style={styles.itemRow}>
                            <Ionicons
                              name="flag-outline"
                              size={14}
                              color="#546E7A"
                              style={styles.itemRowIcon}
                            />
                            <Text style={styles.itemRowLabel}>End Date:</Text>
                            <Text style={styles.itemRowText}>
                              {formatDate(trial.end_date)}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={styles.viewItemButton}
                          onPress={() =>
                            router.push(`/breeder/trial/${trial.id}`)
                          }
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.viewItemButtonText,
                              { color: "#00695C" },
                            ]}
                          >
                            View Trial
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={14}
                            color="#00695C"
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}

          {/* ACTIONS: EDIT & DELETE */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Program Actions</Text>
            <View style={styles.actionsCard}>
              {/* Edit Program Button */}
              <TouchableOpacity
                style={styles.editProgramButton}
                onPress={handleToggleEdit}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isEditing ? "close-circle-outline" : "create-outline"}
                  size={19}
                  color="#1B5E20"
                />
                <Text style={styles.editProgramButtonText}>
                  {isEditing ? "Cancel Editing" : "Edit Program"}
                </Text>
              </TouchableOpacity>

              {/* Delete Program Button */}
              <TouchableOpacity
                style={styles.deleteProgramButton}
                onPress={handleDeleteProgram}
                disabled={deleting}
                activeOpacity={0.8}
              >
                {deleting ? (
                  <View style={styles.buttonInlineContent}>
                    <ActivityIndicator size="small" color="#D32F2F" />
                    <Text style={styles.deleteProgramButtonText}>
                      Deleting...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.buttonInlineContent}>
                    <Ionicons name="trash-outline" size={19} color="#D32F2F" />
                    <Text style={styles.deleteProgramButtonText}>
                      Delete Program
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  editingTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  editingTagText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 5,
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
    marginTop: 3,
  },

  /* Loading & Not Found */
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    marginTop: 60,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: "#2E7D32",
    fontWeight: "500",
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#263238",
    marginTop: 16,
    marginBottom: 8,
  },
  notFoundText: {
    fontSize: 14,
    color: "#607D8B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E7D32",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },

  /* Main Card & Form Card */
  card: {
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
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardHeaderWithAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2EE",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B5E20",
    marginLeft: 8,
  },
  cancelLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelLinkText: {
    fontSize: 14,
    color: "#78909C",
    fontWeight: "600",
  },

  /* Prominent Program Name */
  programNameHeading: {
    fontSize: 23,
    fontWeight: "800",
    color: "#1B5E20",
    letterSpacing: 0.2,
    lineHeight: 30,
    marginBottom: 14,
  },

  /* Crop Badge */
  cropBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    alignSelf: "flex-start",
  },
  cropBadgeText: {
    color: "#2E7D32",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 5,
  },

  /* Status Badge */
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  divider: {
    height: 1,
    backgroundColor: "#ECEFF1",
    marginVertical: 14,
  },

  /* Info Section */
  infoSection: {
    marginBottom: 16,
  },
  sectionIconTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#455A64",
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoSectionBody: {
    fontSize: 15,
    color: "#263238",
    lineHeight: 22,
    paddingLeft: 2,
  },

  /* Dates Visual Box */
  dateCard: {
    flexDirection: "row",
    backgroundColor: "#F9FAF9",
    borderWidth: 1,
    borderColor: "#E0E7E0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    alignItems: "center",
  },
  dateCardCol: {
    flex: 1,
  },
  dateCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  dateCardLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#546E7A",
    marginLeft: 5,
  },
  dateCardValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B5E20",
  },
  dateDividerVertical: {
    width: 1,
    height: "80%",
    backgroundColor: "#CFD8DC",
    marginHorizontal: 12,
  },

  /* Meta / Created Date */
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F4F0",
  },
  metaIcon: {
    marginRight: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#78909C",
    fontStyle: "italic",
  },

  /* Section Containers */
  sectionContainer: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#37474F",
    marginBottom: 10,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* Top Program Summary */
  topSummaryRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 14,
  },
  topSummaryCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },
  topSummaryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  topSummaryTextWrap: {
    flex: 1,
  },
  topSummaryNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#263238",
  },
  topSummaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#78909C",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 1,
  },

  /* Workspace Sections: Crosses & Trials */
  workspaceSection: {
    marginHorizontal: 16,
    marginTop: 22,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  sectionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  workspaceSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B5E20",
  },
  workspaceSectionSubtitle: {
    fontSize: 12,
    color: "#78909C",
    marginTop: 1,
  },
  createActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E7D32",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    elevation: 1,
  },
  createActionButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 4,
  },

  /* Section Loading & Error */
  sectionLoader: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },
  sectionLoaderText: {
    marginTop: 8,
    fontSize: 13,
    color: "#546E7A",
    fontWeight: "500",
  },
  sectionErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  sectionErrorText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#C62828",
    flex: 1,
  },

  /* Empty States */
  emptyWorkspaceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E7E0",
    borderStyle: "dashed",
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F0F4F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyWorkspaceTitle: {
    fontSize: 14,
    color: "#546E7A",
    textAlign: "center",
    marginBottom: 14,
    fontWeight: "500",
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E7D32",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 1,
  },
  emptyActionButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },

  /* Workspace Item Cards (Crosses & Trials) */
  itemsListContainer: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },
  itemCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  itemTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginRight: 8,
  },
  itemCode: {
    fontSize: 16,
    fontWeight: "700",
    color: "#263238",
  },
  generationBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  generationBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2E7D32",
  },
  crossCodeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  crossCodeTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1565C0",
  },
  miniStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  miniStatusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  itemDataRows: {
    borderTopWidth: 1,
    borderTopColor: "#F4F6F4",
    paddingTop: 10,
    marginBottom: 12,
    gap: 6,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemRowIcon: {
    marginRight: 6,
  },
  itemRowLabel: {
    fontSize: 13,
    color: "#78909C",
    fontWeight: "600",
    marginRight: 6,
  },
  itemRowText: {
    fontSize: 13,
    color: "#37474F",
    fontWeight: "500",
    flex: 1,
  },
  viewItemButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F8F5",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E7E0",
    gap: 6,
  },
  viewItemButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1565C0",
  },

  /* Actions Card */
  actionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#EEF2EE",
    gap: 12,
  },
  editProgramButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    borderWidth: 1.2,
    borderColor: "#A5D6A7",
    paddingVertical: 14,
    borderRadius: 12,
  },
  editProgramButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B5E20",
    marginLeft: 8,
  },
  deleteProgramButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFEBEE",
    borderWidth: 1.2,
    borderColor: "#EF9A9A",
    paddingVertical: 14,
    borderRadius: 12,
  },
  deleteProgramButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#D32F2F",
    marginLeft: 8,
  },

  /* EDIT FORM STYLES */
  inputGroup: {
    marginBottom: 16,
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 12,
  },
  halfColumn: {
    flex: 1,
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
    color: "#263238",
  },
  multilineWrapper: {
    paddingVertical: 10,
    alignItems: "flex-start",
  },
  multilineInput: {
    minHeight: 88,
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

  /* Edit Form Buttons */
  editActionButtons: {
    marginTop: 8,
    gap: 10,
  },
  saveButton: {
    backgroundColor: "#2E7D32",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: "#ECEFF1",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#455A64",
    fontSize: 15,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonInlineContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
