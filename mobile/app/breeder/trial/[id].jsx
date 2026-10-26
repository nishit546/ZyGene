import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  RefreshControl,
  Platform,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../../../services/api";

export default function BreedingTrialDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  // Trial data states
  const [trial, setTrial] = useState(null);
  const [cross, setCross] = useState(null);
  const [observations, setObservations] = useState([]);
  const [loadingTrial, setLoadingTrial] = useState(true);
  const [loadingCross, setLoadingCross] = useState(false);
  const [crossError, setCrossError] = useState(null);
  const [loadingObservations, setLoadingObservations] = useState(false);
  const [observationsError, setObservationsError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Edit trial mode states
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingTrial, setDeletingTrial] = useState(false);
  const [deletingObsId, setDeletingObsId] = useState(null);

  // Edit form states
  const [editTrialName, setEditTrialName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editSeason, setEditSeason] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editStatus, setEditStatus] = useState("planned");
  const [editNotes, setEditNotes] = useState("");

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
    if (!dateStr) return "N/A";
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
          label: statusKey || "Planned",
        };
    }
  };

  // Populate edit fields from trial data
  const initEditForm = useCallback((data) => {
    if (!data) return;
    setEditTrialName(data.trial_name || "");
    setEditLocation(data.location || "");
    setEditSeason(data.season || "");
    setEditStartDate(sanitizeDateForInput(data.start_date));
    setEditEndDate(sanitizeDateForInput(data.end_date));
    setEditStatus(data.status || "planned");
    setEditNotes(data.notes || "");
  }, []);

  // Fetch parent cross details if cross_id exists
  const fetchCrossDetails = useCallback(async (crossId) => {
    if (!crossId) {
      setCross(null);
      setLoadingCross(false);
      return;
    }
    try {
      setLoadingCross(true);
      setCrossError(null);
      const response = await API.get(`/breeder/crosses/${crossId}`);
      setCross(response.data?.cross || null);
    } catch (error) {
      console.log(
        "FETCH CROSS ERROR:",
        error.response?.data || error.message
      );
      setCrossError("Failed to load parent cross details.");
    } finally {
      setLoadingCross(false);
    }
  }, []);

  // Fetch trial details
  const fetchTrialDetails = useCallback(async () => {
    if (!id || isNaN(Number(id))) {
      setLoadingTrial(false);
      return;
    }
    try {
      setLoadingTrial(true);
      const response = await API.get(`/breeder/trials/${id}`);
      const fetchedTrial = response.data?.trial;
      setTrial(fetchedTrial);
      initEditForm(fetchedTrial);

      if (fetchedTrial?.cross_id) {
        fetchCrossDetails(fetchedTrial.cross_id);
      } else {
        setCross(null);
      }
    } catch (error) {
      console.log(
        "FETCH TRIAL ERROR:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to load trial details. Please try again."
      );
    } finally {
      setLoadingTrial(false);
    }
  }, [id, initEditForm, fetchCrossDetails]);

  // Fetch observations
  const fetchObservations = useCallback(async () => {
    if (!id || isNaN(Number(id))) {
      setLoadingObservations(false);
      return;
    }
    try {
      setLoadingObservations(true);
      setObservationsError(null);
      const response = await API.get(`/breeder/observations/${id}`);
      setObservations(response.data?.observations || []);
    } catch (error) {
      console.log(
        "FETCH OBSERVATIONS ERROR:",
        error.response?.data || error.message
      );
      setObservationsError("Failed to load observations.");
    } finally {
      setLoadingObservations(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTrialDetails();
    fetchObservations();
  }, [fetchTrialDetails, fetchObservations]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [trialRes, obsRes] = await Promise.allSettled([
        API.get(`/breeder/trials/${id}`),
        API.get(`/breeder/observations/${id}`),
      ]);

      if (trialRes.status === "fulfilled") {
        const fetchedTrial = trialRes.value.data?.trial;
        setTrial(fetchedTrial);
        initEditForm(fetchedTrial);

        if (fetchedTrial?.cross_id) {
          fetchCrossDetails(fetchedTrial.cross_id);
        } else {
          setCross(null);
        }
      } else {
        console.log(
          "REFRESH TRIAL ERROR:",
          trialRes.reason?.response?.data || trialRes.reason?.message
        );
      }

      if (obsRes.status === "fulfilled") {
        setObservations(obsRes.value.data?.observations || []);
        setObservationsError(null);
      } else {
        console.log(
          "REFRESH OBS ERROR:",
          obsRes.reason?.response?.data || obsRes.reason?.message
        );
        setObservationsError("Failed to refresh observations.");
      }
    } catch (error) {
      console.log("REFRESH ERROR:", error.response?.data || error.message);
    } finally {
      setRefreshing(false);
    }
  }, [id, initEditForm, fetchCrossDetails]);

  // Sort observations newest first
  const sortedObservations = useMemo(() => {
    return [...observations].sort((a, b) => {
      const dateA = new Date(
        a.observation_date || a.created_at || 0
      ).getTime();
      const dateB = new Date(
        b.observation_date || b.created_at || 0
      ).getTime();
      return dateB - dateA;
    });
  }, [observations]);

  // Observation summary metrics
  const observationSummary = useMemo(() => {
    const total = observations.length;
    const rated = observations.filter(
      (o) =>
        o.rating !== null &&
        o.rating !== undefined &&
        !isNaN(Number(o.rating))
    );
    let avgRating = "N/A";
    if (rated.length > 0) {
      const sum = rated.reduce((acc, curr) => acc + Number(curr.rating), 0);
      avgRating = (sum / rated.length).toFixed(1);
    }
    return { total, avgRating };
  }, [observations]);

  // Toggle edit form
  const handleToggleEdit = () => {
    if (isEditing) {
      initEditForm(trial);
      setIsEditing(false);
    } else {
      initEditForm(trial);
      setIsEditing(true);
    }
  };

  // Save trial changes (PUT /breeder/trials/:id)
  const handleSaveChanges = async () => {
    if (!editTrialName.trim()) {
      Alert.alert("Missing Information", "Please enter a trial name.");
      return;
    }

    if (saving) return;

    try {
      setSaving(true);

      const payload = {
        trial_name: editTrialName.trim(),
        location: editLocation.trim() || null,
        season: editSeason.trim() || null,
        start_date: editStartDate.trim() || null,
        end_date: editEndDate.trim() || null,
        status: editStatus || "planned",
        notes: editNotes.trim() || null,
      };

      const response = await API.put(`/breeder/trials/${id}`, payload);

      Alert.alert(
        "Success",
        response.data?.message || "Breeding trial updated successfully",
        [
          {
            text: "OK",
            onPress: () => {
              setIsEditing(false);
              fetchTrialDetails();
            },
          },
        ]
      );
    } catch (error) {
      console.log(
        "UPDATE TRIAL ERROR:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Update Failed",
        error.response?.data?.message ||
          "Could not update breeding trial. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete trial (DELETE /breeder/trials/:id)
  const handleDeleteTrial = () => {
    Alert.alert(
      "Delete Breeding Trial?",
      "This will permanently remove this breeding trial and its related records.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingTrial(true);
              const response = await API.delete(`/breeder/trials/${id}`);

              Alert.alert(
                "Success",
                response.data?.message || "Breeding trial deleted successfully",
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
                "DELETE TRIAL ERROR:",
                error.response?.data || error.message
              );
              Alert.alert(
                "Delete Failed",
                error.response?.data?.message ||
                  "Could not delete this breeding trial. Please try again."
              );
            } finally {
              setDeletingTrial(false);
            }
          },
        },
      ]
    );
  };

  // Delete observation
  const handleDeleteObservation = (obsId) => {
    Alert.alert(
      "Delete Observation",
      "Are you sure you want to delete this observation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingObsId(obsId);
              const response = await API.delete(`/breeder/observations/${obsId}`);
              Alert.alert(
                "Success",
                response.data?.message || "Observation deleted successfully."
              );
              fetchObservations();
            } catch (error) {
              console.log(
                "DELETE OBSERVATION ERROR:",
                error.response?.data || error.message
              );
              Alert.alert(
                "Delete Failed",
                error.response?.data?.message ||
                  "Could not delete this observation. Please try again."
              );
            } finally {
              setDeletingObsId(null);
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

  // Loading screen
  if (loadingTrial && !refreshing) {
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
            <Text style={styles.title}>Trial Details</Text>
            <Text style={styles.subtitle}>Breeding Field Trial</Text>
          </View>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading trial details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Not found screen
  if (!trial) {
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
            <Text style={styles.title}>Trial Details</Text>
            <Text style={styles.subtitle}>Breeding Field Trial</Text>
          </View>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={54} color="#C62828" />
          <Text style={styles.notFoundTitle}>Trial Not Found</Text>
          <Text style={styles.notFoundText}>
            The requested breeding trial could not be located or has been removed.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.replace("/breeder/trials")}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Back to Trials</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentStatusConfig = getStatusBadge(trial.status);

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
              <Text style={styles.title}>Trial Details</Text>
              <Text style={styles.subtitle}>Breeding Field Trial</Text>
            </View>
          </View>

          {/* EDIT FORM MODE */}
          {isEditing ? (
            <View style={styles.card}>
              <View style={styles.cardHeaderWithAction}>
                <View style={styles.cardHeaderLeft}>
                  <Ionicons name="create-outline" size={20} color="#2E7D32" />
                  <Text style={styles.sectionHeaderTitle}>Edit Trial</Text>
                </View>
                <TouchableOpacity
                  onPress={handleToggleEdit}
                  disabled={saving}
                  style={styles.cancelLink}
                >
                  <Text style={styles.cancelLinkText}>Cancel</Text>
                </TouchableOpacity>
              </View>

              {/* Read-Only Program & Cross notice */}
              <View style={styles.readOnlyBlock}>
                <Ionicons name="lock-closed" size={15} color="#546E7A" />
                <View style={styles.readOnlyContent}>
                  <Text style={styles.readOnlyLabel}>
                    Linked Program & Cross (Locked)
                  </Text>
                  <Text style={styles.readOnlyValue}>
                    {trial.program_name || `Program #${trial.program_id}`}
                    {trial.cross_code ? ` • Cross: ${trial.cross_code}` : ""}
                  </Text>
                </View>
              </View>

              {/* Trial Name */}
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
                    value={editTrialName}
                    onChangeText={setEditTrialName}
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Location */}
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
                    value={editLocation}
                    onChangeText={setEditLocation}
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Season */}
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
                    value={editSeason}
                    onChangeText={setEditSeason}
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Two Column: Start Date & End Date */}
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
                      value={editStartDate}
                      onChangeText={setEditStartDate}
                      editable={!saving}
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
                      value={editEndDate}
                      onChangeText={setEditEndDate}
                      editable={!saving}
                    />
                  </View>
                </View>
              </View>

              {/* Status Picker Chips */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Trial Status</Text>
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

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <View style={[styles.inputWrapper, styles.multilineWrapper]}>
                  <TextInput
                    style={[styles.textInput, styles.multilineInput]}
                    placeholder="Add trial notes..."
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
            <>
              {/* 1. BREEDING PROGRAM SECTION */}
              <View style={styles.card}>
                <View style={styles.cardHeaderWithAction}>
                  <View style={styles.cardHeaderLeft}>
                    <View
                      style={[
                        styles.sectionIconBox,
                        { backgroundColor: "#E8F5E9" },
                      ]}
                    >
                      <Ionicons name="leaf" size={17} color="#2E7D32" />
                    </View>
                    <View>
                      <Text style={styles.sectionHeaderTitle}>
                        Breeding Program
                      </Text>
                      <Text style={styles.sectionHeaderSubtitle}>
                        Parent program
                      </Text>
                    </View>
                  </View>

                  {trial.program_id ? (
                    <TouchableOpacity
                      style={styles.viewLinkButton}
                      onPress={() =>
                        router.push(
                          `/breeder/program-details/${trial.program_id}`
                        )
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={styles.viewLinkText}>View Program</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={13}
                        color="#2E7D32"
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.programContentBox}>
                  <Text style={styles.programNameText}>
                    {trial.program_name ||
                      (trial.program_id
                        ? `Program #${trial.program_id}`
                        : "N/A")}
                  </Text>
                  {trial.crop_name ? (
                    <View style={styles.cropBadge}>
                      <Ionicons name="leaf-outline" size={12} color="#2E7D32" />
                      <Text style={styles.cropBadgeText}>{trial.crop_name}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* 2. PARENT CROSS SECTION */}
              <View style={styles.card}>
                <View style={styles.cardHeaderWithAction}>
                  <View style={styles.cardHeaderLeft}>
                    <View
                      style={[
                        styles.sectionIconBox,
                        { backgroundColor: "#E3F2FD" },
                      ]}
                    >
                      <Ionicons name="git-merge" size={17} color="#1565C0" />
                    </View>
                    <View>
                      <Text style={styles.sectionHeaderTitle}>Parent Cross</Text>
                      <Text style={styles.sectionHeaderSubtitle}>
                        Genetic lineage
                      </Text>
                    </View>
                  </View>

                  {trial.cross_id ? (
                    <TouchableOpacity
                      style={[
                        styles.viewLinkButton,
                        { backgroundColor: "#E3F2FD" },
                      ]}
                      onPress={() =>
                        router.push(`/breeder/cross/${trial.cross_id}`)
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.viewLinkText, { color: "#1565C0" }]}>
                        View Cross
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={13}
                        color="#1565C0"
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {loadingCross ? (
                  <View style={styles.sectionLoaderBox}>
                    <ActivityIndicator size="small" color="#1565C0" />
                    <Text style={styles.sectionLoaderText}>Loading cross...</Text>
                  </View>
                ) : crossError ? (
                  <View style={styles.sectionErrorBox}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={16}
                      color="#C62828"
                    />
                    <Text style={styles.sectionErrorText}>{crossError}</Text>
                  </View>
                ) : trial.cross_id ? (
                  <View style={styles.crossDataBox}>
                    <View style={styles.crossTopRow}>
                      <Text style={styles.crossCodeHeading}>
                        {cross?.cross_code ||
                          trial.cross_code ||
                          `Cross #${trial.cross_id}`}
                      </Text>
                      {cross?.generation ? (
                        <View style={styles.generationBadge}>
                          <Text style={styles.generationBadgeText}>
                            {cross.generation}
                          </Text>
                        </View>
                      ) : null}
                      {cross?.success_status ? (
                        <View
                          style={[
                            styles.miniStatusBadge,
                            {
                              backgroundColor: getCrossStatusBadge(
                                cross.success_status
                              ).backgroundColor,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.miniStatusText,
                              {
                                color: getCrossStatusBadge(
                                  cross.success_status
                                ).textColor,
                              },
                            ]}
                          >
                            {getCrossStatusBadge(cross.success_status).label}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.crossDetailsGrid}>
                      <View style={styles.crossDetailRow}>
                        <Ionicons
                          name="male-outline"
                          size={14}
                          color="#546E7A"
                        />
                        <Text style={styles.crossDetailLabel}>Parent 1:</Text>
                        <Text style={styles.crossDetailValue} numberOfLines={1}>
                          {cross?.parent_1 || "N/A"}
                        </Text>
                      </View>

                      <View style={styles.crossDetailRow}>
                        <Ionicons
                          name="female-outline"
                          size={14}
                          color="#546E7A"
                        />
                        <Text style={styles.crossDetailLabel}>Parent 2:</Text>
                        <Text style={styles.crossDetailValue} numberOfLines={1}>
                          {cross?.parent_2 || "N/A"}
                        </Text>
                      </View>

                      <View style={styles.crossDetailRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={14}
                          color="#546E7A"
                        />
                        <Text style={styles.crossDetailLabel}>Cross Date:</Text>
                        <Text style={styles.crossDetailValue}>
                          {cross?.cross_date
                            ? formatDate(cross.cross_date)
                            : "N/A"}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noCrossBox}>
                    <Ionicons
                      name="git-merge-outline"
                      size={20}
                      color="#90A4AE"
                    />
                    <Text style={styles.noCrossText}>
                      No parent cross linked to this trial.
                    </Text>
                  </View>
                )}
              </View>

              {/* 3. FIELD TRIAL INFORMATION CARD */}
              <View style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.tagsGroup}>
                    {trial.program_name ? (
                      <View style={styles.programTag}>
                        <Ionicons name="leaf" size={13} color="#2E7D32" />
                        <Text style={styles.programTagText} numberOfLines={1}>
                          {trial.program_name}
                        </Text>
                      </View>
                    ) : null}

                    {trial.cross_code ? (
                      <View style={styles.crossTag}>
                        <Ionicons name="git-merge" size={12} color="#1565C0" />
                        <Text style={styles.crossTagText}>
                          {trial.cross_code}
                        </Text>
                      </View>
                    ) : null}
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

                {/* Trial Name */}
                <Text style={styles.trialNameHeading}>
                  {trial.trial_name || "N/A"}
                </Text>

                <View style={styles.divider} />

                <View style={styles.cardHeaderSimple}>
                  <Ionicons name="flask-outline" size={18} color="#1B5E20" />
                  <Text style={styles.sectionHeaderTitle}>
                    Trial Information
                  </Text>
                </View>

                {/* Location & Season */}
                <View style={styles.infoTwoCol}>
                  <View style={styles.infoColBox}>
                    <View style={styles.infoColHeader}>
                      <Ionicons
                        name="location-outline"
                        size={15}
                        color="#E65100"
                      />
                      <Text style={styles.infoColLabel}>Location</Text>
                    </View>
                    <Text style={styles.infoColValue}>
                      {trial.location || "N/A"}
                    </Text>
                  </View>

                  <View style={styles.infoColDivider} />

                  <View style={styles.infoColBox}>
                    <View style={styles.infoColHeader}>
                      <Ionicons
                        name="partly-sunny-outline"
                        size={15}
                        color="#F57F17"
                      />
                      <Text style={styles.infoColLabel}>Season</Text>
                    </View>
                    <Text style={styles.infoColValue}>
                      {trial.season || "N/A"}
                    </Text>
                  </View>
                </View>

                {/* Start & End Dates */}
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
                      {trial.start_date ? formatDate(trial.start_date) : "N/A"}
                    </Text>
                  </View>

                  <View style={styles.dateDividerVertical} />

                  <View style={styles.dateCardCol}>
                    <View style={styles.dateCardHeader}>
                      <Ionicons name="flag-outline" size={15} color="#2E7D32" />
                      <Text style={styles.dateCardLabel}>End Date</Text>
                    </View>
                    <Text style={styles.dateCardValue}>
                      {trial.end_date ? formatDate(trial.end_date) : "N/A"}
                    </Text>
                  </View>
                </View>

                {/* Notes */}
                <View style={styles.notesSection}>
                  <View style={styles.notesSectionHeader}>
                    <Ionicons
                      name="document-text-outline"
                      size={15}
                      color="#546E7A"
                    />
                    <Text style={styles.notesSectionLabel}>Notes</Text>
                  </View>
                  <Text style={styles.notesSectionBody}>
                    {trial.notes || "N/A"}
                  </Text>
                </View>

                {/* Created Date */}
                {trial.created_at ? (
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={14} color="#78909C" />
                    <Text style={styles.metaText}>
                      Created on {formatDate(trial.created_at)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* 4. OBSERVATIONS SECTION */}
              <View style={styles.observationsContainer}>
                {/* Observation Summary Metrics */}
                <View style={styles.summaryRow}>
                  <View style={styles.summaryMetricCard}>
                    <View
                      style={[
                        styles.summaryMetricIcon,
                        { backgroundColor: "#E8F5E9" },
                      ]}
                    >
                      <Ionicons
                        name="clipboard-outline"
                        size={18}
                        color="#2E7D32"
                      />
                    </View>
                    <View style={styles.summaryMetricTextWrap}>
                      <Text style={styles.summaryMetricValue}>
                        {observationSummary.total}
                      </Text>
                      <Text style={styles.summaryMetricLabel}>
                        Total Observations
                      </Text>
                    </View>
                  </View>

                  <View style={styles.summaryMetricCard}>
                    <View
                      style={[
                        styles.summaryMetricIcon,
                        { backgroundColor: "#FFF8E1" },
                      ]}
                    >
                      <Ionicons name="star" size={18} color="#F57F17" />
                    </View>
                    <View style={styles.summaryMetricTextWrap}>
                      <Text style={styles.summaryMetricValue}>
                        {observationSummary.avgRating}
                      </Text>
                      <Text style={styles.summaryMetricLabel}>
                        Average Rating
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Section Header & Add button */}
                <View style={styles.observationsHeaderRow}>
                  <View style={styles.observationsTitleBox}>
                    <Ionicons
                      name="analytics-outline"
                      size={20}
                      color="#1B5E20"
                    />
                    <Text style={styles.observationsTitle}>
                      Trial Observations
                    </Text>
                    <View style={styles.obsCountBadge}>
                      <Text style={styles.obsCountBadgeText}>
                        {observations.length}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.headerAddObsBtn}
                    onPress={() =>
                      router.push(`/breeder/trial/${id}/observation/create`)
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.headerAddObsBtnText}>
                      + Add Observation
                    </Text>
                  </TouchableOpacity>
                </View>

                {loadingObservations ? (
                  <View style={styles.obsLoaderBox}>
                    <ActivityIndicator size="small" color="#2E7D32" />
                    <Text style={styles.obsLoaderText}>
                      Loading observations...
                    </Text>
                  </View>
                ) : observationsError ? (
                  <View style={styles.sectionErrorBox}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={16}
                      color="#C62828"
                    />
                    <Text style={styles.sectionErrorText}>
                      {observationsError}
                    </Text>
                  </View>
                ) : sortedObservations.length === 0 ? (
                  <View style={styles.emptyObsCard}>
                    <Ionicons
                      name="analytics-outline"
                      size={44}
                      color="#B0BEC5"
                    />
                    <Text style={styles.emptyObsTitle}>
                      No observations recorded yet.
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyAddObsButton}
                      onPress={() =>
                        router.push(`/breeder/trial/${id}/observation/create`)
                      }
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={18} color="#FFFFFF" />
                      <Text style={styles.emptyAddObsButtonText}>
                        Add First Observation
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  sortedObservations.map((obs) => {
                    const isDeletingThis = deletingObsId === obs.id;
                    return (
                      <View key={obs.id} style={styles.observationCard}>
                        {/* Observation Header: Measurement Type & Date */}
                        <View style={styles.obsCardHeader}>
                          <View style={styles.obsTypeContainer}>
                            <Ionicons
                              name="pulse-outline"
                              size={16}
                              color="#1B5E20"
                            />
                            <Text style={styles.obsMeasurementType}>
                              {obs.measurement_type || "Measurement"}
                            </Text>
                          </View>
                          <Text style={styles.obsDateText}>
                            {formatDate(obs.observation_date)}
                          </Text>
                        </View>

                        {/* Value & Rating Highlight Box */}
                        <View style={styles.obsValueRatingRow}>
                          <View style={styles.obsValueBox}>
                            <Text style={styles.obsValueLabel}>
                              Measurement Value
                            </Text>
                            <Text style={styles.obsValueMain}>
                              {obs.measurement_value ?? "—"}{" "}
                              {obs.unit ? (
                                <Text style={styles.obsUnitText}>
                                  {obs.unit}
                                </Text>
                              ) : null}
                            </Text>
                          </View>

                          {obs.rating !== null && obs.rating !== undefined ? (
                            <View style={styles.obsRatingBox}>
                              <Text style={styles.obsRatingLabel}>Rating</Text>
                              <View style={styles.obsRatingBadge}>
                                <Ionicons
                                  name="star"
                                  size={12}
                                  color="#F57F17"
                                />
                                <Text style={styles.obsRatingText}>
                                  {obs.rating}
                                </Text>
                              </View>
                            </View>
                          ) : null}
                        </View>

                        {/* Notes */}
                        {obs.notes ? (
                          <View style={styles.obsNotesBox}>
                            <Text style={styles.obsNotesText}>{obs.notes}</Text>
                          </View>
                        ) : null}

                        {/* Observation Card Actions */}
                        <View style={styles.obsActionsRow}>
                          <TouchableOpacity
                            style={styles.obsEditBtn}
                            onPress={() =>
                              router.push(
                                `/breeder/trial/${id}/observation/${obs.id}`
                              )
                            }
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name="create-outline"
                              size={15}
                              color="#1B5E20"
                            />
                            <Text style={styles.obsEditBtnText}>Edit</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.obsDeleteBtn}
                            onPress={() => handleDeleteObservation(obs.id)}
                            disabled={isDeletingThis}
                            activeOpacity={0.7}
                          >
                            {isDeletingThis ? (
                              <ActivityIndicator size="small" color="#D32F2F" />
                            ) : (
                              <>
                                <Ionicons
                                  name="trash-outline"
                                  size={15}
                                  color="#D32F2F"
                                />
                                <Text style={styles.obsDeleteBtnText}>
                                  Delete
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              {/* 5. TRIAL ACTIONS (EDIT & DELETE) */}
              <View style={styles.actionsCard}>
                <TouchableOpacity
                  style={styles.editTrialButton}
                  onPress={handleToggleEdit}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={19} color="#1B5E20" />
                  <Text style={styles.editTrialButtonText}>Edit Trial</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteTrialButton}
                  onPress={handleDeleteTrial}
                  disabled={deletingTrial}
                  activeOpacity={0.8}
                >
                  {deletingTrial ? (
                    <View style={styles.buttonInlineContent}>
                      <ActivityIndicator size="small" color="#D32F2F" />
                      <Text style={styles.deleteTrialButtonText}>
                        Deleting...
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.buttonInlineContent}>
                      <Ionicons name="trash-outline" size={19} color="#D32F2F" />
                      <Text style={styles.deleteTrialButtonText}>
                        Delete Trial
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
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
    marginBottom: 12,
  },
  tagsGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  programTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 10,
  },
  programTagText: {
    color: "#2E7D32",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 5,
  },
  crossTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 10,
  },
  crossTagText: {
    color: "#1565C0",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
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
  trialNameHeading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1B5E20",
    letterSpacing: 0.2,
    lineHeight: 28,
  },

  /* Card Header Simple */
  cardHeaderSimple: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2EE",
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1B5E20",
    marginLeft: 8,
  },

  /* Information Grid */
  infoTwoCol: {
    flexDirection: "row",
    backgroundColor: "#F9FAF9",
    borderWidth: 1,
    borderColor: "#E0E7E0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  infoColBox: {
    flex: 1,
  },
  infoColHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  infoColLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#546E7A",
    marginLeft: 5,
    textTransform: "uppercase",
  },
  infoColValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#263238",
  },
  infoColDivider: {
    width: 1,
    backgroundColor: "#CFD8DC",
    marginHorizontal: 12,
  },

  /* Date Card */
  dateCard: {
    flexDirection: "row",
    backgroundColor: "#F9FAF9",
    borderWidth: 1,
    borderColor: "#E0E7E0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
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

  /* ID Row Box */
  idRowBox: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  idItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  idLabel: {
    fontSize: 12,
    color: "#78909C",
    marginRight: 4,
  },
  idValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#455A64",
  },

  /* Notes Section */
  notesSection: {
    backgroundColor: "#FAFCFA",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },
  notesSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  notesSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#546E7A",
    marginLeft: 5,
    textTransform: "uppercase",
  },
  notesSectionBody: {
    fontSize: 13.5,
    color: "#37474F",
    lineHeight: 19,
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
  metaText: {
    fontSize: 12,
    color: "#78909C",
    fontStyle: "italic",
    marginLeft: 6,
  },

  /* Actions Card */
  actionsCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
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
  editTrialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    borderWidth: 1.2,
    borderColor: "#A5D6A7",
    paddingVertical: 14,
    borderRadius: 12,
  },
  editTrialButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B5E20",
    marginLeft: 8,
  },
  deleteTrialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFEBEE",
    borderWidth: 1.2,
    borderColor: "#EF9A9A",
    paddingVertical: 14,
    borderRadius: 12,
  },
  deleteTrialButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#D32F2F",
    marginLeft: 8,
  },

  /* OBSERVATIONS SECTION */
  observationsContainer: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  observationsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  observationsTitleBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  observationsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1B5E20",
    marginLeft: 7,
  },
  obsCountBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  obsCountBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2E7D32",
  },
  addObsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2E7D32",
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addObsButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 6,
  },

  /* Empty Observations */
  emptyObsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },
  emptyObsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#37474F",
    marginTop: 10,
  },
  emptyObsSubtitle: {
    fontSize: 13,
    color: "#78909C",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  emptyAddObsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#E8F5E9",
  },
  emptyAddObsButtonText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#2E7D32",
    marginLeft: 4,
  },

  /* Observation Card */
  observationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },
  obsCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  obsTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  obsMeasurementType: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B5E20",
    marginLeft: 6,
  },
  obsDateText: {
    fontSize: 12,
    color: "#78909C",
    fontWeight: "500",
  },
  obsValueRatingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAF9",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E8EFE8",
    marginBottom: 8,
  },
  obsValueBox: {
    flex: 1,
  },
  obsValueLabel: {
    fontSize: 10.5,
    color: "#78909C",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  obsValueMain: {
    fontSize: 17,
    fontWeight: "800",
    color: "#263238",
    marginTop: 2,
  },
  obsUnitText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#546E7A",
  },
  obsRatingBox: {
    alignItems: "flex-end",
  },
  obsRatingLabel: {
    fontSize: 10.5,
    color: "#78909C",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  obsRatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
    borderWidth: 1,
    borderColor: "#FFE082",
  },
  obsRatingText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#F57F17",
    marginLeft: 4,
  },
  obsNotesBox: {
    backgroundColor: "#FAFCFA",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  obsNotesText: {
    fontSize: 12.5,
    color: "#546E7A",
    lineHeight: 17,
  },
  obsActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F4F0",
    paddingTop: 8,
  },
  obsEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  obsEditBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B5E20",
    marginLeft: 4,
  },
  obsDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  obsDeleteBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D32F2F",
    marginLeft: 4,
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
  cancelLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelLinkText: {
    fontSize: 14,
    color: "#78909C",
    fontWeight: "600",
  },
  readOnlyBlock: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECEFF1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  readOnlyContent: {
    marginLeft: 8,
    flex: 1,
  },
  readOnlyLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#546E7A",
    textTransform: "uppercase",
  },
  readOnlyValue: {
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
    color: "#263238",
  },
  multilineWrapper: {
    paddingVertical: 10,
    alignItems: "flex-start",
  },
  multilineInput: {
    minHeight: 76,
  },
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
