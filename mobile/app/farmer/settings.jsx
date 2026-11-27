import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from "../../constants/theme";
import FarmerHeader from "../../components/ui/FarmerHeader";
import StorageService from "../../services/storageService";
import { checkBiometricSupport, authenticateWithBiometrics } from "../../services/biometricService";
import { checkLocationPermission, getCurrentLocation } from "../../services/locationService";
import { checkContactsPermission, getDeviceContacts } from "../../services/shareService";
import { checkNotificationPermission, requestNotificationPermissions } from "../../services/notificationService";
import { getSyncStats } from "../../services/syncService";
import { getExportedFilesList } from "../../services/fileService";
import { getCurrentUserId } from "../../services/auth";

export default function FarmerSettingsScreen() {
  // Preferences State
  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("en");
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricSupport, setBiometricSupport] = useState({ supported: false, biometricType: "Biometrics" });

  // Permissions State
  const [cameraPerm, setCameraPerm] = useState("checking");
  const [locationPerm, setLocationPerm] = useState("checking");
  const [contactsPerm, setContactsPerm] = useState("checking");
  const [notificationsPerm, setNotificationsPerm] = useState("checking");

  // Storage & Sync State
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [filesCount, setFilesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadSettingsData = useCallback(async () => {
    try {
      setLoading(true);

      // Load user preferences
      const savedTheme = await StorageService.getTheme();
      const savedLang = await StorageService.getLanguage();
      const savedBio = await StorageService.isBiometricLockEnabled();
      setTheme(savedTheme || "system");
      setLanguage(savedLang || "en");
      setBiometricEnabled(savedBio);

      // Check Biometric hardware
      const bioInfo = await checkBiometricSupport();
      setBiometricSupport(bioInfo);

      // Check device permissions
      const cam = await ImagePicker.getCameraPermissionsAsync();
      setCameraPerm(cam.status);

      const loc = await checkLocationPermission();
      setLocationPerm(loc);

      const con = await checkContactsPermission();
      setContactsPerm(con);

      const notif = await checkNotificationPermission();
      setNotificationsPerm(notif);

      // Check Storage & Sync counts
      const uid = await getCurrentUserId();
      if (uid) {
        const stats = await getSyncStats(uid);
        setPendingSyncCount(stats.pending || 0);
      }
      const files = await getExportedFilesList();
      setFilesCount(files.length || 0);
    } catch (e) {
      console.log("[settings] error loading data:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettingsData();
  }, [loadSettingsData]);

  const handleToggleBiometrics = async (val) => {
    if (val) {
      if (!biometricSupport.supported) {
        Alert.alert(
          "Biometrics Unavailable",
          "Biometric authentication is not enrolled or supported on this device."
        );
        return;
      }

      // Verify before enabling
      const auth = await authenticateWithBiometrics("Verify identity to enable Biometric App Lock");
      if (auth.success) {
        await StorageService.setBiometricLockEnabled(true);
        setBiometricEnabled(true);
        Alert.alert("Biometrics Enabled", "ZyGene will now require biometric verification on launch.");
      } else {
        Alert.alert("Verification Failed", auth.error || "Could not verify identity.");
      }
    } else {
      await StorageService.setBiometricLockEnabled(false);
      setBiometricEnabled(false);
    }
  };

  const handleLanguageChange = () => {
    const next = language === "en" ? "hi" : "en";
    setLanguage(next);
    StorageService.setLanguage(next);
    Alert.alert("Language Updated", next === "en" ? "Selected: English (US)" : "Selected: Hindi (हिंदी)");
  };

  const handleThemeChange = () => {
    const next = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
    StorageService.setTheme(next);
    Alert.alert("Theme Preference", `Set to: ${next.toUpperCase()}`);
  };

  const requestPerm = async (type) => {
    if (type === "camera") {
      const res = await ImagePicker.requestCameraPermissionsAsync();
      setCameraPerm(res.status);
    } else if (type === "location") {
      const res = await getCurrentLocation();
      const st = await checkLocationPermission();
      setLocationPerm(st);
    } else if (type === "contacts") {
      const res = await getDeviceContacts();
      const st = await checkContactsPermission();
      setContactsPerm(st);
    } else if (type === "notifications") {
      const res = await requestNotificationPermissions();
      setNotificationsPerm(res ? "granted" : "denied");
    }
  };

  const renderPermissionRow = (name, status, icon, type, isLast) => {
    const isGranted = status === "granted";
    return (
      <View style={[styles.settingRow, isLast && styles.settingRowNoBorder]}>
        <View style={styles.settingIconBox}>
          <Ionicons name={icon} size={20} color={isGranted ? COLORS.primary : COLORS.textSecondary} />
        </View>
        <View style={styles.settingContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>{name}</Text>
            <Text style={styles.settingSub}>
              {isGranted ? "Permission Granted" : "Permission Denied or Pending"}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.permBadge, isGranted && styles.permBadgeActive]}
            onPress={() => requestPerm(type)}
            disabled={isGranted}
          >
            <Text style={[styles.permBadgeText, isGranted && styles.permBadgeTextActive]}>
              {isGranted ? "Active" : "Grant"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <FarmerHeader
        title="Settings"
        showBack={true}
        onBackPress={() => router.back()}
        rightIcon="refresh"
        onRightPress={loadSettingsData}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* SECTION: SECURITY & BIOMETRIC LOCK */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>Security & App Lock</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingIconBox}>
                <Ionicons
                  name={biometricSupport.biometricType?.toLowerCase().includes("face") ? "scan-outline" : "finger-print-outline"}
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.settingContent}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.settingTitle}>
                    {biometricSupport.biometricType || "Biometric"} App Lock
                  </Text>
                  <Text style={styles.settingSub}>
                    {biometricSupport.supported
                      ? "Lock app when inactive or backgrounded"
                      : "Not available on this device"}
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleToggleBiometrics}
                  disabled={!biometricSupport.supported}
                  trackColor={{ false: "#D1D5DB", true: COLORS.primaryLight }}
                  thumbColor={biometricEnabled ? COLORS.primary : "#9CA3AF"}
                />
              </View>
            </View>
          </View>
        </View>

        {/* SECTION: PREFERENCES */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>App Preferences</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingRow} onPress={handleThemeChange}>
              <View style={styles.settingIconBox}>
                <Ionicons name="color-palette-outline" size={20} color={COLORS.textSecondary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Appearance / Theme</Text>
                <Text style={styles.settingValue}>
                  {theme.charAt(0).toUpperCase() + theme.slice(1)} →
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingRow, styles.settingRowNoBorder]} onPress={handleLanguageChange}>
              <View style={styles.settingIconBox}>
                <Ionicons name="language-outline" size={20} color={COLORS.textSecondary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Display Language</Text>
                <Text style={styles.settingValue}>
                  {language === "en" ? "English (US)" : "Hindi (हिंदी)"} →
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION: DEVICE HARDWARE & PERMISSIONS */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>Device Hardware & Permissions</Text>
          <View style={styles.settingsCard}>
            {renderPermissionRow("Camera & Gallery", cameraPerm, "camera-outline", "camera")}
            {renderPermissionRow("GPS Location", locationPerm, "location-outline", "location")}
            {renderPermissionRow("Device Contacts", contactsPerm, "people-outline", "contacts")}
            {renderPermissionRow("Push & Local Alerts", notificationsPerm, "notifications-outline", "notifications", true)}
          </View>
        </View>

        {/* SECTION: STORAGE & SYNCHRONIZATION */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>Offline Storage & Sync</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => router.push("/farmer/sync")}
            >
              <View style={styles.settingIconBox}>
                <Ionicons name="sync-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.settingContent}>
                <View>
                  <Text style={styles.settingTitle}>Offline Sync Status</Text>
                  <Text style={styles.settingSub}>
                    {pendingSyncCount > 0 ? `${pendingSyncCount} operations waiting to sync` : "All local data synchronized"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.borderDark} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingRow, styles.settingRowNoBorder]}
              onPress={() => router.push("/farmer/files")}
            >
              <View style={styles.settingIconBox}>
                <Ionicons name="folder-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.settingContent}>
                <View>
                  <Text style={styles.settingTitle}>Exported Documents</Text>
                  <Text style={styles.settingSub}>{filesCount} PDF & CSV reports saved</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.borderDark} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION: APPLICATION INFO */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>About ZyGENE</Text>
          <View style={styles.settingsCard}>
            <View style={[styles.settingRow, styles.settingRowNoBorder]}>
              <View style={styles.settingIconBox}>
                <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Build Version</Text>
                <Text style={styles.settingValue}>v2.5.0 (Expo SDK 58)</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scrollContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.base,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },
  sectionBlock: { marginBottom: SPACING.xl },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  settingsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.subtle,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  settingRowNoBorder: { borderBottomWidth: 0 },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingTitle: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  settingSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  settingValue: { fontSize: 13, color: COLORS.textSecondary, fontWeight: "500" },
  permBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  permBadgeActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  permBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  permBadgeTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
});
