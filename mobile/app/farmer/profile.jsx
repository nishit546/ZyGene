import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from "../../constants/theme";
import FarmerHeader from "../../components/ui/FarmerHeader";

export default function FarmerProfileScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          setUser(JSON.parse(userStr));
        }
      } catch {
        // ignore error
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <FarmerHeader title="Profile" showBack={true} />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const farmerName = user?.farmer_name || user?.name || user?.username || "Unknown Farmer";
  const farmerEmail = user?.email || "--";
  const farmerPhone = user?.phone || "--";
  const role = user?.role || "Farmer";
  const initials = farmerName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <FarmerHeader title="Profile" showBack={true} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* AVATAR HERO */}
        <View style={styles.heroSection}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{initials}</Text>
          </View>
          <Text style={styles.heroName}>{farmerName}</Text>
          <Text style={styles.heroEmail}>{farmerEmail}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{role.toUpperCase()}</Text>
          </View>
        </View>

        {/* PROFILE INFO */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeader}>Profile Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{farmerName}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{farmerEmail}</Text>
            </View>
            <View style={styles.divider} />
            <View style={[styles.infoRow, { paddingBottom: 0 }]}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{farmerPhone}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  centerLoading: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },
  
  heroSection: { alignItems: "center", marginBottom: SPACING.xxl },
  avatarLarge: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginBottom: SPACING.md, ...SHADOWS.subtle },
  avatarLargeText: { fontSize: 36, fontWeight: "700", color: COLORS.surface },
  heroName: { fontSize: 24, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
  heroEmail: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 12 },
  roleBadge: { backgroundColor: COLORS.surfaceSubtle, paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.borderLight },
  roleBadgeText: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.5 },

  sectionBlock: { marginBottom: SPACING.xl },
  sectionHeader: { fontSize: 13, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: SPACING.sm },
  infoCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderLight, padding: SPACING.md, ...SHADOWS.subtle },
  infoRow: { paddingVertical: 8 },
  infoLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 8 },
});
