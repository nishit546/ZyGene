import { SafeAreaView } from "react-native-safe-area-context";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Image,
} from "react-native";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../constants/theme";
import FarmerHeader from "../../components/ui/FarmerHeader";

export default function FarmerAboutScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <FarmerHeader title="About ZyGene" showBack={true} />

      <View style={styles.container}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>Z</Text>
        </View>

        <Text style={styles.appName}>ZyGene</Text>
        <Text style={styles.appTagline}>Crop Lifecycle & Breeder Intelligence Platform</Text>
        
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>

        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionText}>
            ZyGene helps farmers organize crop, field, lifecycle, and agricultural record information in one unified workspace.
          </Text>
        </View>

        <Text style={styles.footerText}>© 2026 ZyGene AgriTech.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, alignItems: "center", paddingHorizontal: SPACING.xl, paddingTop: 60 },
  
  logoBox: { width: 80, height: 80, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginBottom: SPACING.lg, ...SHADOWS.medium },
  logoText: { fontSize: 48, fontWeight: "900", color: COLORS.surface },
  
  appName: { fontSize: 28, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
  appTagline: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", marginBottom: SPACING.lg, paddingHorizontal: 20 },
  
  versionBadge: { backgroundColor: COLORS.surfaceSubtle, paddingHorizontal: 16, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: 40 },
  versionText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
  
  descriptionCard: { backgroundColor: COLORS.surface, padding: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.subtle, width: "100%", marginBottom: 40 },
  descriptionText: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", lineHeight: 22 },
  
  footerText: { fontSize: 12, color: COLORS.textMuted },
});
