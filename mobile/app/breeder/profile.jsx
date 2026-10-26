import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect } from "react";
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../../services/api";
import { confirmLogout } from "../../services/auth";
import BreederNavigation from "../../components/BreederNavigation";
import ErrorState from "../../components/ErrorState";

// Helper for initials fallback (e.g. "Jane Doe" -> "JD")
const getInitials = (name) => {
  if (!name || typeof name !== "string") return "BP";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "BP";
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Safe string display helper (avoids null or undefined)
const safeText = (val, fallback = "--") => {
  if (val === null || val === undefined) return fallback;
  const str = String(val).trim();
  return str.length > 0 ? str : fallback;
};

export default function BreederProfile() {
  const router = useRouter();

  // Form input state
  const [breederName, setBreederName] = useState("");
  const [organization, setOrganization] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [location, setLocation] = useState("");

  // Persisted backend profile data
  const [savedProfile, setSavedProfile] = useState(null);

  // Status & Mode state
  const [isExisting, setIsExisting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // Validation feedback
  const [nameError, setNameError] = useState("");

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setFetchError(false);
      setNameError("");
      const response = await API.get("/breeder/profile");

      if (response.data && response.data.profile) {
        const profile = response.data.profile;
        setSavedProfile(profile);
        setBreederName(profile.breeder_name || "");
        setOrganization(profile.organization || "");
        setSpecialization(profile.specialization || "");
        setLocation(profile.location || "");
        setIsExisting(true);
        setIsEditing(false);
      } else {
        // No profile found
        setIsExisting(false);
        setIsEditing(true); // Open in create mode
      }
    } catch (error) {
      // 404 indicates no profile has been created yet
      if (error.response?.status === 404) {
        setIsExisting(false);
        setIsEditing(true); // Open in create mode immediately
      } else {
        setFetchError(true);
        console.log(
          "FETCH BREEDER PROFILE ERROR:",
          error.response?.data || error.message
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch breeder profile on load
  useEffect(() => {
    fetchProfile();
  }, []);

  // Profile completion calculation for 4 fields
  const currentName = isEditing || !isExisting ? breederName : savedProfile?.breeder_name || "";
  const currentOrg = isEditing || !isExisting ? organization : savedProfile?.organization || "";
  const currentSpec = isEditing || !isExisting ? specialization : savedProfile?.specialization || "";
  const currentLoc = isEditing || !isExisting ? location : savedProfile?.location || "";

  let completedFieldsCount = 0;
  if (currentName.trim()) completedFieldsCount++;
  if (currentOrg.trim()) completedFieldsCount++;
  if (currentSpec.trim()) completedFieldsCount++;
  if (currentLoc.trim()) completedFieldsCount++;

  const completionPercentage = completedFieldsCount * 25;

  // Handle Cancel in Edit Mode
  const handleCancelEdit = () => {
    if (savedProfile) {
      setBreederName(savedProfile.breeder_name || "");
      setOrganization(savedProfile.organization || "");
      setSpecialization(savedProfile.specialization || "");
      setLocation(savedProfile.location || "");
    }
    setNameError("");
    setIsEditing(false);
  };

  // Handle Form Submit (Create or Update)
  const handleSubmit = async () => {
    const trimmedName = breederName.trim();
    if (!trimmedName) {
      setNameError("Breeder name is required.");
      Alert.alert("Validation Error", "Breeder name is required.");
      return;
    }

    setNameError("");
    if (submitting) return;

    try {
      setSubmitting(true);

      const payload = {
        breeder_name: trimmedName,
        organization: organization.trim() || null,
        specialization: specialization.trim() || null,
        location: location.trim() || null,
      };

      if (isExisting) {
        // PUT /breeder/profile for updating existing profile
        const response = await API.put("/breeder/profile", payload);
        const updated = {
          ...savedProfile,
          ...payload,
        };
        setSavedProfile(updated);
        setIsEditing(false);

        // Sync local AsyncStorage user name for instant dashboard updates
        try {
          const storedUser = await AsyncStorage.getItem("user");
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            parsed.name = payload.breeder_name;
            await AsyncStorage.setItem("user", JSON.stringify(parsed));
          }
        } catch (e) {
          console.log("Error syncing user data to storage:", e);
        }

        Alert.alert("Success", "Profile updated successfully.");
      } else {
        // POST /breeder/profile for creating new profile
        const response = await API.post("/breeder/profile", payload);
        const created = response.data?.profile || payload;
        setSavedProfile(created);
        setIsExisting(true);
        setIsEditing(false);

        // Sync local AsyncStorage user name for instant dashboard updates
        try {
          const storedUser = await AsyncStorage.getItem("user");
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            parsed.name = payload.breeder_name;
            await AsyncStorage.setItem("user", JSON.stringify(parsed));
          }
        } catch (e) {
          console.log("Error syncing user data to storage:", e);
        }

        Alert.alert("Success", "Profile updated successfully.");
      }
    } catch (error) {
      console.log(
        "SAVE BREEDER PROFILE ERROR:",
        error.response?.data || error.message
      );
      // Keep user's entered values intact and show error
      Alert.alert(
        "Error",
        "Unable to save your profile. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Initial Loading Screen
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading breeder profile...</Text>
      </SafeAreaView>
    );
  }

  // 2. Fetch Error Screen (GET failed)
  if (fetchError && !loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Breeder Profile</Text>
            <Text style={styles.subtitle}>Breeding research profile</Text>
          </View>
        </View>

        <ErrorState
          title="Unable to load your breeder profile."
          message="Could not load your breeder profile data. Please check your network and try again."
          onRetry={fetchProfile}
        />
      </SafeAreaView>
    );
  }

  // Active values for display
  const displayName = safeText(savedProfile?.breeder_name, "Breeder Name");
  const displayOrg = safeText(savedProfile?.organization, "Organization not specified");
  const displaySpec = safeText(savedProfile?.specialization, "Specialization not specified");
  const displayLoc = safeText(savedProfile?.location, "Location not specified");
  const initials = getInitials(displayName);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Banner */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => router.back()}
                accessibilityLabel="Go back"
                accessibilityRole="button"
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutHeaderBtn}
                onPress={() => confirmLogout()}
                accessibilityLabel="Logout"
                accessibilityRole="button"
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={17} color="#FFFFFF" />
                <Text style={styles.logoutHeaderBtnText}>Logout</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Breeder Profile</Text>
              <Text style={styles.subtitle}>
                {!isExisting
                  ? "Complete Your Breeder Profile"
                  : isEditing
                  ? "Update your breeding credentials & info"
                  : "Manage your breeding research profile"}
              </Text>
            </View>
          </View>

          {/* Module Navigation (available in view mode for quick switching) */}
          {!isEditing ? (
            <View style={{ marginTop: 14 }}>
              <BreederNavigation activeTab="profile" />
            </View>
          ) : null}

          {/* Profile Completion Progress Card */}
          <View style={styles.completionCard}>
            <View style={styles.completionHeaderRow}>
              <View style={styles.completionTitleWrap}>
                <Ionicons
                  name={completionPercentage === 100 ? "checkmark-circle" : "speedometer-outline"}
                  size={20}
                  color={completionPercentage === 100 ? "#2E7D32" : "#1565C0"}
                  style={styles.completionIcon}
                />
                <Text style={styles.completionTitle}>Profile Completion</Text>
              </View>
              <Text
                style={[
                  styles.completionPercentText,
                  { color: completionPercentage === 100 ? "#2E7D32" : "#1565C0" },
                ]}
              >
                {completionPercentage}%
              </Text>
            </View>

            {/* Progress Bar Track */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${completionPercentage}%`,
                    backgroundColor: completionPercentage === 100 ? "#2E7D32" : "#1565C0",
                  },
                ]}
              />
            </View>

            <Text style={styles.completionSubtext}>
              {completionPercentage === 100
                ? "Your breeder profile is complete and verified."
                : `${completedFieldsCount} of 4 fields completed. Fill in all details for complete research records.`}
            </Text>
          </View>

          {/* VIEW MODE vs EDIT / CREATE MODE */}
          {isExisting && !isEditing ? (
            /* VIEW MODE */
            <View style={styles.viewModeContainer}>
              {/* Profile Header Card */}
              <View style={styles.profileHeaderCard}>
                {/* Initials / Avatar */}
                <View style={styles.avatarContainer}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitialsText}>{initials}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
                  </View>
                </View>

                {/* Breeder Name */}
                <Text style={styles.avatarName} numberOfLines={2}>
                  {displayName}
                </Text>

                {/* Organization */}
                <Text style={styles.avatarOrganization} numberOfLines={2}>
                  {displayOrg}
                </Text>

                {/* Chips / Pills for Specialization & Location */}
                <View style={styles.metaChipsRow}>
                  <View style={styles.metaChip}>
                    <Ionicons name="flask-outline" size={13} color="#2E7D32" style={{ marginRight: 4 }} />
                    <Text style={styles.metaChipText} numberOfLines={1}>
                      {displaySpec}
                    </Text>
                  </View>

                  <View style={styles.metaChip}>
                    <Ionicons name="location-outline" size={13} color="#2E7D32" style={{ marginRight: 4 }} />
                    <Text style={styles.metaChipText} numberOfLines={1}>
                      {displayLoc}
                    </Text>
                  </View>
                </View>

                {/* Status Pill */}
                <View style={styles.statusPill}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Active Breeder</Text>
                </View>

                {/* Edit Profile Button */}
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    setBreederName(savedProfile?.breeder_name || "");
                    setOrganization(savedProfile?.organization || "");
                    setSpecialization(savedProfile?.specialization || "");
                    setLocation(savedProfile?.location || "");
                    setNameError("");
                    setIsEditing(true);
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Edit Profile"
                >
                  <Ionicons name="create-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>

              {/* Detailed Summary Card */}
              <View style={styles.detailsCard}>
                <Text style={styles.detailsCardTitle}>Breeder Details</Text>

                <View style={styles.detailRow}>
                  <View style={[styles.detailIconBox, { backgroundColor: "#E8F5E9" }]}>
                    <Ionicons name="person-outline" size={18} color="#2E7D32" />
                  </View>
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Breeder Name</Text>
                    <Text style={styles.detailValue}>{displayName}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={[styles.detailIconBox, { backgroundColor: "#E3F2FD" }]}>
                    <Ionicons name="business-outline" size={18} color="#1565C0" />
                  </View>
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Organization</Text>
                    <Text style={styles.detailValue}>{displayOrg}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={[styles.detailIconBox, { backgroundColor: "#EDE7F6" }]}>
                    <Ionicons name="flask-outline" size={18} color="#5E35B1" />
                  </View>
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Specialization</Text>
                    <Text style={styles.detailValue}>{displaySpec}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={[styles.detailIconBox, { backgroundColor: "#FFF3E0" }]}>
                    <Ionicons name="location-outline" size={18} color="#E65100" />
                  </View>
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>{displayLoc}</Text>
                  </View>
                </View>

                {savedProfile?.email ? (
                  <View style={styles.detailRow}>
                    <View style={[styles.detailIconBox, { backgroundColor: "#ECEFF1" }]}>
                      <Ionicons name="mail-outline" size={18} color="#455A64" />
                    </View>
                    <View style={styles.detailTextWrap}>
                      <Text style={styles.detailLabel}>Account Email</Text>
                      <Text style={styles.detailValue}>{savedProfile.email}</Text>
                    </View>
                  </View>
                ) : null}
              </View>

              {/* Account Management & Logout Card */}
              <View style={styles.accountCard}>
                <TouchableOpacity
                  style={styles.logoutCardBtn}
                  onPress={() => confirmLogout()}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Log out of ZyGene"
                >
                  <Ionicons name="log-out-outline" size={18} color="#C62828" style={{ marginRight: 8 }} />
                  <Text style={styles.logoutCardBtnText}>Log Out of Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* EDIT OR CREATE MODE */
            <View style={styles.formCard}>
              <View style={styles.formCardHeaderRow}>
                <Text style={styles.formCardTitle}>
                  {!isExisting ? "Complete Your Breeder Profile" : "Edit Profile"}
                </Text>
                <Text style={styles.formCardSubtitle}>
                  {!isExisting
                    ? "Enter your research details to begin managing breeding programs."
                    : "Update your breeding research credentials below."}
                </Text>
              </View>

              {/* Breeder Name Field (Required) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Breeder Name <Text style={styles.required}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    Boolean(nameError) && styles.inputWrapperError,
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={nameError ? "#C62828" : "#2E7D32"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Dr. Jane Doe"
                    placeholderTextColor="#9E9E9E"
                    value={breederName}
                    onChangeText={(val) => {
                      setBreederName(val);
                      if (nameError && val.trim()) setNameError("");
                    }}
                    autoCapitalize="words"
                    editable={!submitting}
                  />
                </View>
                {Boolean(nameError) && (
                  <Text style={styles.fieldErrorText}>{nameError}</Text>
                )}
              </View>

              {/* Organization Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Organization</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color="#2E7D32"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. ABC Agricultural Research"
                    placeholderTextColor="#9E9E9E"
                    value={organization}
                    onChangeText={setOrganization}
                    autoCapitalize="words"
                    editable={!submitting}
                  />
                </View>
              </View>

              {/* Specialization Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Specialization</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="flask-outline"
                    size={20}
                    color="#2E7D32"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Crop Genetics, Hybrid Rice"
                    placeholderTextColor="#9E9E9E"
                    value={specialization}
                    onChangeText={setSpecialization}
                    autoCapitalize="sentences"
                    editable={!submitting}
                  />
                </View>
              </View>

              {/* Location Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Location</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color="#2E7D32"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Ahmedabad, India"
                    placeholderTextColor="#9E9E9E"
                    value={location}
                    onChangeText={setLocation}
                    autoCapitalize="words"
                    editable={!submitting}
                  />
                </View>
              </View>

              {/* Form Action Buttons */}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    submitting && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={isExisting ? "Save Changes" : "Create Profile"}
                >
                  {submitting ? (
                    <View style={styles.buttonContent}>
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.submitButtonText}>Saving...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <Ionicons
                        name={isExisting ? "checkmark-circle-outline" : "add-circle-outline"}
                        size={20}
                        color="#FFFFFF"
                        style={styles.buttonIcon}
                      />
                      <Text style={styles.submitButtonText}>
                        {isExisting ? "Save Changes" : "Create Profile"}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Cancel Button (Visible in Edit Mode when profile exists) */}
                {isExisting && isEditing ? (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelEdit}
                    disabled={submitting}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel edit"
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}

          <View style={{ height: 48 }} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F8F5",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#2E7D32",
    fontWeight: "600",
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: "#F5F8F5",
  },
  scrollContent: {
    paddingBottom: 48,
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    gap: 5,
  },
  logoutHeaderBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  headerTextContainer: {
    paddingHorizontal: 4,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  subtitle: {
    color: "#D7F0D8",
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },

  /* Profile Completion Card */
  completionCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8ECE8",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  completionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  completionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  completionIcon: {
    marginRight: 6,
  },
  completionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#263238",
  },
  completionPercentText: {
    fontSize: 15,
    fontWeight: "800",
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "#E8ECE8",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  completionSubtext: {
    fontSize: 12,
    color: "#607D8B",
    lineHeight: 16,
  },

  /* View Mode Section */
  viewModeContainer: {
    marginTop: 2,
  },

  /* Profile Header Card */
  profileHeaderCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8ECE8",
    ...Platform.select({
      ios: {
        shadowColor: "#1B5E20",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 14,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#A5D6A7",
  },
  avatarInitialsText: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1B5E20",
    letterSpacing: 1,
  },
  badge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#2E7D32",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#263238",
    textAlign: "center",
  },
  avatarOrganization: {
    fontSize: 14,
    color: "#607D8B",
    marginTop: 4,
    textAlign: "center",
    fontWeight: "500",
  },
  metaChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F8F1",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7E9D7",
    maxWidth: 240,
  },
  metaChipText: {
    fontSize: 12,
    color: "#2E7D32",
    fontWeight: "600",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2E7D32",
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2E7D32",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E7D32",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 12,
    marginTop: 18,
    elevation: 2,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  /* Details Card */
  detailsCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E8ECE8",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  detailsCardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#263238",
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F0",
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  detailTextWrap: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#78909C",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#263238",
    marginTop: 2,
  },

  /* Account & Logout Card */
  accountCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  logoutCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  logoutCardBtnText: {
    color: "#C62828",
    fontSize: 14,
    fontWeight: "700",
  },

  /* Form Card (Edit & Create) */
  formCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E8ECE8",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  formCardHeaderRow: {
    marginBottom: 18,
  },
  formCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#263238",
  },
  formCardSubtitle: {
    fontSize: 13,
    color: "#607D8B",
    marginTop: 4,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
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
  inputWrapperError: {
    borderColor: "#D32F2F",
    backgroundColor: "#FFEBEE",
  },
  fieldErrorText: {
    color: "#C62828",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: "#263238",
  },

  /* Action Buttons */
  actionButtonsContainer: {
    marginTop: 10,
  },
  submitButton: {
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
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
  cancelButton: {
    marginTop: 12,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: "#CFD8DC",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#546E7A",
    fontSize: 15,
    fontWeight: "700",
  },
});
