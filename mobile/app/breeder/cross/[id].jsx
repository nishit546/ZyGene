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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../../../services/api";
import { copyToClipboard, shareText } from "../../../services/shareService";

export default function BreedingCrossDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  // Cross data state
  const [cross, setCross] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleCopyCross = () => {
    const text = cross?.cross_code || `Cross #${id}`;
    copyToClipboard(text, "Cross Code");
  };

  const handleShareCross = async () => {
    const text = [
      `🧬 *ZyGene Breeding Cross: ${cross?.cross_code || `Cross #${id}`}*`,
      `• Female Parent (♀): ${cross?.parent1_name || "N/A"}`,
      `• Male Parent (♂): ${cross?.parent2_name || "N/A"}`,
      `• Status: ${cross?.success_status || "Planned"}`,
      cross?.generation ? `• Generation: ${cross.generation}` : null,
      cross?.cross_date ? `• Cross Date: ${cross.cross_date}` : null,
      cross?.objective ? `• Objective: ${cross.objective}` : null,
      `• Cross ID: ${id}`,
      `Shared from ZyGene AgriTech Platform.`,
    ]
      .filter(Boolean)
      .join("\n");

    await shareText({
      title: `Cross Summary: ${cross?.cross_code || "Cross"}`,
      message: text,
    });
  };

  // Form states for editing
  const [editParent1, setEditParent1] = useState("");
  const [editParent2, setEditParent2] = useState("");
  const [editCrossCode, setEditCrossCode] = useState("");
  const [editCrossDate, setEditCrossDate] = useState("");
  const [editGeneration, setEditGeneration] = useState("");
  const [editObjective, setEditObjective] = useState("");
  const [editSuccessStatus, setEditSuccessStatus] = useState("planned");
  const [editNotes, setEditNotes] = useState("");

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

  // Common generation shortcuts for edit form
  const commonGenerations = ["F1", "F2", "F3", "BC1", "BC2", "DH"];

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

  // Populate edit fields from cross data
  const initEditForm = useCallback((data) => {
    if (!data) return;
    setEditParent1(data.parent_1 || "");
    setEditParent2(data.parent_2 || "");
    setEditCrossCode(data.cross_code || "");
    setEditCrossDate(sanitizeDateForInput(data.cross_date));
    setEditGeneration(data.generation || "F1");
    setEditObjective(data.objective || "");
    setEditSuccessStatus(data.success_status || "planned");
    setEditNotes(data.notes || "");
  }, []);

  // Fetch single cross details
  const fetchCrossDetails = useCallback(async () => {
    if (!id || isNaN(Number(id))) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await API.get(`/breeder/crosses/${id}`);
      const fetchedCross = response.data?.cross;
      setCross(fetchedCross);
      initEditForm(fetchedCross);
    } catch (error) {
      console.log(
        "FETCH CROSS DETAILS ERROR:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to load breeding cross details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [id, initEditForm]);

  useEffect(() => {
    fetchCrossDetails();
  }, [fetchCrossDetails]);

  // Toggle edit mode
  const handleToggleEdit = () => {
    if (isEditing) {
      initEditForm(cross);
      setIsEditing(false);
    } else {
      initEditForm(cross);
      setIsEditing(true);
    }
  };

  // Save changes (PUT /breeder/crosses/:id)
  const handleSaveChanges = async () => {
    if (!editParent1.trim()) {
      Alert.alert("Missing Information", "Please enter the first parent variety.");
      return;
    }

    if (!editParent2.trim()) {
      Alert.alert("Missing Information", "Please enter the second parent variety.");
      return;
    }

    if (!editCrossCode.trim()) {
      Alert.alert("Missing Information", "Please enter a cross code.");
      return;
    }

    if (!editCrossDate.trim()) {
      Alert.alert("Missing Information", "Please enter the cross date (YYYY-MM-DD).");
      return;
    }

    if (saving) return;

    try {
      setSaving(true);

      const payload = {
        parent_1: editParent1.trim(),
        parent_2: editParent2.trim(),
        cross_code: editCrossCode.trim(),
        cross_date: editCrossDate.trim(),
        generation: editGeneration.trim() || null,
        objective: editObjective.trim() || null,
        success_status: editSuccessStatus || "planned",
        notes: editNotes.trim() || null,
      };

      const response = await API.put(`/breeder/crosses/${id}`, payload);

      Alert.alert(
        "Success",
        response.data?.message || "Breeding cross updated successfully",
        [
          {
            text: "OK",
            onPress: () => {
              setIsEditing(false);
              fetchCrossDetails();
            },
          },
        ]
      );
    } catch (error) {
      console.log(
        "UPDATE CROSS ERROR:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Update Failed",
        error.response?.data?.message ||
          "Could not update breeding cross. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete cross (DELETE /breeder/crosses/:id)
  const handleDeleteCross = () => {
    Alert.alert(
      "Delete Breeding Cross?",
      "This will permanently remove this breeding cross and its related records.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              const response = await API.delete(`/breeder/crosses/${id}`);

              Alert.alert(
                "Success",
                response.data?.message || "Breeding cross deleted successfully",
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
                "DELETE CROSS ERROR:",
                error.response?.data || error.message
              );
              Alert.alert(
                "Delete Failed",
                error.response?.data?.message ||
                  "Could not delete this breeding cross. Please try again."
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
            <Text style={styles.title}>Cross Details</Text>
            <Text style={styles.subtitle}>Breeding Cross</Text>
          </View>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading cross details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Not Found State
  if (!cross) {
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
            <Text style={styles.title}>Cross Details</Text>
            <Text style={styles.subtitle}>Breeding Cross</Text>
          </View>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={54} color="#C62828" />
          <Text style={styles.notFoundTitle}>Cross Not Found</Text>
          <Text style={styles.notFoundText}>
            The requested breeding cross could not be located or has been deleted.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.replace("/breeder/crosses")}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Back to Crosses</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentStatusConfig = getStatusBadge(cross.success_status);

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
              <Text style={styles.title}>Cross Details</Text>
              <Text style={styles.subtitle}>Breeding Cross</Text>
            </View>
          </View>

          {/* EDIT FORM MODE */}
          {isEditing ? (
            <View style={styles.card}>
              <View style={styles.cardHeaderWithAction}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="create-outline" size={20} color="#2E7D32" />
                  <Text style={styles.sectionHeaderTitle}>Edit Cross</Text>
                </View>
                <TouchableOpacity
                  onPress={handleToggleEdit}
                  disabled={saving}
                  style={styles.cancelLink}
                >
                  <Text style={styles.cancelLinkText}>Cancel</Text>
                </TouchableOpacity>
              </View>

              {/* Read-Only Program Notice */}
              <View style={styles.readOnlyProgramCard}>
                <Ionicons name="lock-closed" size={15} color="#546E7A" />
                <View style={styles.readOnlyProgramContent}>
                  <Text style={styles.readOnlyProgramLabel}>
                    Breeding Program (Locked)
                  </Text>
                  <Text style={styles.readOnlyProgramValue}>
                    {cross.program_name || `Program #${cross.program_id}`}
                  </Text>
                </View>
              </View>

              {/* Parent 1 */}
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
                    value={editParent1}
                    onChangeText={setEditParent1}
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Parent 2 */}
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
                    value={editParent2}
                    onChangeText={setEditParent2}
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Cross Code */}
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
                    value={editCrossCode}
                    onChangeText={setEditCrossCode}
                    autoCapitalize="characters"
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Two Column: Cross Date & Generation */}
              <View style={styles.twoColumnRow}>
                <View style={[styles.inputGroup, styles.halfColumn]}>
                  <Text style={styles.label}>
                    Cross Date <Text style={styles.required}>*</Text>
                  </Text>
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
                      value={editCrossDate}
                      onChangeText={setEditCrossDate}
                      editable={!saving}
                    />
                  </View>
                </View>

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
                      placeholder="e.g. F1, F2"
                      placeholderTextColor="#90A4AE"
                      value={editGeneration}
                      onChangeText={setEditGeneration}
                      autoCapitalize="characters"
                      editable={!saving}
                    />
                  </View>
                </View>
              </View>

              {/* Generation Quick Presets */}
              <View style={styles.genChipsRow}>
                <Text style={styles.chipsLabel}>Presets:</Text>
                {commonGenerations.map((gen) => (
                  <TouchableOpacity
                    key={gen}
                    style={[
                      styles.genChip,
                      editGeneration.toUpperCase() === gen && styles.genChipSelected,
                    ]}
                    onPress={() => setEditGeneration(gen)}
                    disabled={saving}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.genChipText,
                        editGeneration.toUpperCase() === gen &&
                          styles.genChipTextSelected,
                      ]}
                    >
                      {gen}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Success Status Chips */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Success Status</Text>
                <View style={styles.statusChipsRow}>
                  {statusOptions.map((opt) => {
                    const isSelected = editSuccessStatus === opt.id;
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
                        onPress={() => setEditSuccessStatus(opt.id)}
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

              {/* Objective */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Objective</Text>
                <View style={[styles.inputWrapper, styles.multilineWrapper]}>
                  <TextInput
                    style={[styles.textInput, styles.multilineInput]}
                    placeholder="What is the objective of this cross?"
                    placeholderTextColor="#90A4AE"
                    value={editObjective}
                    onChangeText={setEditObjective}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <View style={[styles.inputWrapper, styles.multilineWrapper]}>
                  <TextInput
                    style={[styles.textInput, styles.multilineInput]}
                    placeholder="Additional notes..."
                    placeholderTextColor="#90A4AE"
                    value={editNotes}
                    onChangeText={setEditNotes}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Form Action Buttons */}
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
            /* VIEW DETAILS MODE: MAIN CARD */
            <>
              {/* Native Actions: Copy, Share */}
              <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 20, marginTop: 14, marginBottom: -6 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#C8E6C9",
                    paddingVertical: 10,
                    borderRadius: 10,
                  }}
                  onPress={handleCopyCross}
                >
                  <Ionicons name="copy-outline" size={15} color="#2E7D32" />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#2E7D32" }}>
                    Copy Code
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#C8E6C9",
                    paddingVertical: 10,
                    borderRadius: 10,
                  }}
                  onPress={handleShareCross}
                >
                  <Ionicons name="share-social-outline" size={15} color="#2E7D32" />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#2E7D32" }}>
                    Share Cross
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
              {/* Top Row: Cross Code & Status Badge */}
              <View style={styles.cardTopRow}>
                <View style={styles.codeContainer}>
                  <Ionicons name="git-merge" size={16} color="#1B5E20" />
                  <Text style={styles.crossCodeHeading}>
                    {cross.cross_code || "CROSS"}
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

              {/* Visual "Parent Cross" Section */}
              <View style={styles.parentCrossSection}>
                <Text style={styles.parentSectionSuperTitle}>
                  PARENTAL LINEAGES
                </Text>

                <View style={styles.parentDisplayRow}>
                  {/* Parent 1 (Female) */}
                  <View style={[styles.parentDisplayBox, styles.femaleParentBox]}>
                    <View style={styles.parentGenderBadge}>
                      <Ionicons name="female" size={13} color="#E91E63" />
                      <Text style={styles.parentGenderLabel}>Parent 1 (♀)</Text>
                    </View>
                    <Text style={styles.parentDisplayName} numberOfLines={2}>
                      {cross.parent_1 || "Unknown"}
                    </Text>
                  </View>

                  {/* × Crossing Symbol */}
                  <View style={styles.centerCrossingBadge}>
                    <Text style={styles.centerCrossingSymbol}>×</Text>
                    <Text style={styles.centerCrossingText}>CROSS</Text>
                  </View>

                  {/* Parent 2 (Male) */}
                  <View style={[styles.parentDisplayBox, styles.maleParentBox]}>
                    <View style={styles.parentGenderBadge}>
                      <Ionicons name="male" size={13} color="#1976D2" />
                      <Text style={styles.parentGenderLabel}>Parent 2 (♂)</Text>
                    </View>
                    <Text style={styles.parentDisplayName} numberOfLines={2}>
                      {cross.parent_2 || "Unknown"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Breeding Program Information */}
              <View style={styles.infoRowBlock}>
                <View style={styles.infoIconBox}>
                  <Ionicons name="leaf-outline" size={17} color="#2E7D32" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Breeding Program</Text>
                  <Text style={styles.infoMainValue}>
                    {cross.program_name || `Program #${cross.program_id}`}
                  </Text>
                  <Text style={styles.infoSubValue}>
                    Program ID: {cross.program_id}
                    {cross.crop_name ? ` • Crop: ${cross.crop_name}` : ""}
                  </Text>
                </View>
                {cross.program_id ? (
                  <TouchableOpacity
                    style={styles.viewProgramLinkBtn}
                    onPress={() =>
                      router.push(`/breeder/program-details/${cross.program_id}`)
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewProgramLinkText}>View</Text>
                    <Ionicons name="chevron-forward" size={14} color="#2E7D32" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Date & Generation Box */}
              <View style={styles.dateCard}>
                <View style={styles.dateCardCol}>
                  <View style={styles.dateCardHeader}>
                    <Ionicons
                      name="calendar-outline"
                      size={15}
                      color="#2E7D32"
                    />
                    <Text style={styles.dateCardLabel}>Cross Date</Text>
                  </View>
                  <Text style={styles.dateCardValue}>
                    {formatDate(cross.cross_date)}
                  </Text>
                </View>

                <View style={styles.dateDividerVertical} />

                <View style={styles.dateCardCol}>
                  <View style={styles.dateCardHeader}>
                    <Ionicons name="layers-outline" size={15} color="#1565C0" />
                    <Text style={styles.dateCardLabel}>Generation</Text>
                  </View>
                  <Text style={[styles.dateCardValue, { color: "#1565C0" }]}>
                    {cross.generation || "F1"}
                  </Text>
                </View>
              </View>

              {/* Objective */}
              <View style={styles.infoSection}>
                <View style={styles.sectionIconTitleRow}>
                  <Ionicons
                    name="disc-outline"
                    size={17}
                    color="#D84315"
                  />
                  <Text style={styles.infoSectionTitle}>Objective</Text>
                </View>
                <Text style={styles.infoSectionBody}>
                  {cross.objective ||
                    "No specific objective documented for this cross."}
                </Text>
              </View>

              {/* Notes */}
              <View style={styles.infoSection}>
                <View style={styles.sectionIconTitleRow}>
                  <Ionicons
                    name="document-text-outline"
                    size={17}
                    color="#546E7A"
                  />
                  <Text style={styles.infoSectionTitle}>Notes</Text>
                </View>
                <Text style={styles.infoSectionBody}>
                  {cross.notes || "No additional notes available."}
                </Text>
              </View>

              {/* Created Date */}
              {cross.created_at ? (
                <View style={styles.metaRow}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color="#78909C"
                    style={styles.metaIcon}
                  />
                  <Text style={styles.metaText}>
                    Created on {formatDate(cross.created_at)}
                  </Text>
                </View>
              ) : null}
            </View>
            </>
          )}

          {/* ACTIONS: EDIT & DELETE */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Cross Actions</Text>
            <View style={styles.actionsCard}>
              {/* Edit Cross Button */}
              <TouchableOpacity
                style={styles.editCrossButton}
                onPress={handleToggleEdit}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isEditing ? "close-circle-outline" : "create-outline"}
                  size={19}
                  color="#1B5E20"
                />
                <Text style={styles.editCrossButtonText}>
                  {isEditing ? "Cancel Editing" : "Edit Cross"}
                </Text>
              </TouchableOpacity>

              {/* Delete Cross Button */}
              <TouchableOpacity
                style={styles.deleteCrossButton}
                onPress={handleDeleteCross}
                disabled={deleting}
                activeOpacity={0.8}
              >
                {deleting ? (
                  <View style={styles.buttonInlineContent}>
                    <ActivityIndicator size="small" color="#D32F2F" />
                    <Text style={styles.deleteCrossButtonText}>
                      Deleting...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.buttonInlineContent}>
                    <Ionicons name="trash-outline" size={19} color="#D32F2F" />
                    <Text style={styles.deleteCrossButtonText}>
                      Delete Cross
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

  /* Main Card */
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
    marginBottom: 16,
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F8F1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  crossCodeHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1B5E20",
    letterSpacing: 0.4,
    marginLeft: 6,
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

  /* Visual Parent Cross Section */
  parentCrossSection: {
    backgroundColor: "#FAFDFB",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.2,
    borderColor: "#E2EFE2",
    marginBottom: 16,
  },
  parentSectionSuperTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#78909C",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10,
    textAlign: "center",
  },
  parentDisplayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  parentDisplayBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    minHeight: 74,
    justifyContent: "center",
  },
  femaleParentBox: {
    borderColor: "#F8BBD0",
  },
  maleParentBox: {
    borderColor: "#BBDEFB",
  },
  parentGenderBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  parentGenderLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#546E7A",
    marginLeft: 4,
    textTransform: "uppercase",
  },
  parentDisplayName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#263238",
    lineHeight: 18,
  },
  centerCrossingBadge: {
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  centerCrossingSymbol: {
    fontSize: 22,
    fontWeight: "900",
    color: "#2E7D32",
    lineHeight: 24,
  },
  centerCrossingText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#388E3C",
    letterSpacing: 0.5,
  },

  divider: {
    height: 1,
    backgroundColor: "#ECEFF1",
    marginVertical: 14,
  },

  /* Info Row Block (Program) */
  infoRowBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F1F8F1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#78909C",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoMainValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#263238",
    marginTop: 1,
  },
  infoSubValue: {
    fontSize: 12,
    color: "#546E7A",
    marginTop: 2,
  },
  viewProgramLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    alignSelf: "center",
    marginLeft: 8,
  },
  viewProgramLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2E7D32",
    marginRight: 2,
  },

  /* Date & Gen Card */
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

  /* Sections */
  infoSection: {
    marginBottom: 14,
  },
  sectionIconTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#455A64",
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoSectionBody: {
    fontSize: 14.5,
    color: "#263238",
    lineHeight: 21,
    paddingLeft: 2,
  },

  /* Meta Row */
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
  editCrossButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    borderWidth: 1.2,
    borderColor: "#A5D6A7",
    paddingVertical: 14,
    borderRadius: 12,
  },
  editCrossButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B5E20",
    marginLeft: 8,
  },
  deleteCrossButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFEBEE",
    borderWidth: 1.2,
    borderColor: "#EF9A9A",
    paddingVertical: 14,
    borderRadius: 12,
  },
  deleteCrossButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#D32F2F",
    marginLeft: 8,
  },

  /* EDIT FORM STYLES */
  cardHeaderWithAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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

  readOnlyProgramCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECEFF1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  readOnlyProgramContent: {
    marginLeft: 8,
    flex: 1,
  },
  readOnlyProgramLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#546E7A",
    textTransform: "uppercase",
  },
  readOnlyProgramValue: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#263238",
    marginTop: 1,
  },

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

  /* Generation Quick Presets */
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
