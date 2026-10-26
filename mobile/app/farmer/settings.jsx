import { SafeAreaView } from "react-native-safe-area-context";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../constants/theme";
import FarmerHeader from "../../components/ui/FarmerHeader";

export default function FarmerSettingsScreen() {
  const renderSettingRow = (title, value, icon, isLast) => (
    <View style={[styles.settingRow, isLast && styles.settingRowNoBorder]}>
      <View style={styles.settingIconBox}>
        <Ionicons name={icon} size={20} color={COLORS.textSecondary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <FarmerHeader title="Settings" showBack={true} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>Preferences</Text>
          <View style={styles.settingsCard}>
            {renderSettingRow("Appearance", "System Default", "color-palette-outline")}
            {renderSettingRow("Language", "English (US)", "language-outline")}
            {renderSettingRow("Notifications", "Enabled in OS", "notifications-outline", true)}
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>Data & Sync</Text>
          <View style={styles.settingsCard}>
            {renderSettingRow("Offline Mode", "Unsupported", "cloud-offline-outline")}
            {renderSettingRow("Sync Status", "Up to date", "sync-outline", true)}
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
  sectionHeader: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: SPACING.sm },
  settingsCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.subtle },
  
  settingRow: { flexDirection: "row", alignItems: "center", padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  settingRowNoBorder: { borderBottomWidth: 0 },
  settingIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceSubtle, alignItems: "center", justifyContent: "center", marginRight: 12 },
  settingContent: { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  settingTitle: { fontSize: 15, fontWeight: "500", color: COLORS.text },
  settingValue: { fontSize: 13, color: COLORS.textSecondary },
});
