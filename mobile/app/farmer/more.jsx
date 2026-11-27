import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../constants/theme";
import FarmerHeader from "../../components/ui/FarmerHeader";
import FarmerBottomTabs from "../../components/FarmerBottomTabs";
import { confirmLogout } from "../../services/auth";

export default function FarmerMoreScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          setUser(JSON.parse(userStr));
        }
      } catch {
        // ignore error
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    confirmLogout();
  };

  const farmerName = user?.farmer_name || user?.name || user?.username || "Farmer";
  const farmerEmail = user?.email || "No email provided";
  const initials = farmerName.charAt(0).toUpperCase();

  const renderSection = (title, items) => (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionHeader}>{title}</Text>
      <View style={styles.listCard}>
        {items.map((item, idx) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.listItem, idx < items.length - 1 && styles.listItemBorder]}
            onPress={() => item.action ? item.action() : router.push(item.route)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={item.title}
          >
            <Ionicons name={item.icon} size={20} color={item.danger ? COLORS.danger : COLORS.textSecondary} style={styles.listIcon} />
            <View style={styles.listTextWrap}>
              <Text style={[styles.itemTitle, item.danger && { color: COLORS.danger }]}>{item.title}</Text>
              {item.subtitle && <Text style={styles.itemSubtitle}>{item.subtitle}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.borderDark} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <FarmerHeader title="More" />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* PROFILE SUMMARY */}
        <TouchableOpacity style={styles.profileCard} activeOpacity={0.8} onPress={() => router.push("/farmer/profile")} accessibilityRole="button" accessibilityLabel="Open profile">
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{farmerName}</Text>
            <Text style={styles.profileEmail}>{farmerEmail}</Text>
          </View>
          <Text style={styles.viewProfileText}>View Profile →</Text>
        </TouchableOpacity>

        {/* CROP MANAGEMENT */}
        {renderSection("CROP MANAGEMENT", [
          { id: "lifecycle", title: "Lifecycle", icon: "git-commit-outline", route: "/farmer/crops" },
          { id: "measurements", title: "Measurements", icon: "stats-chart-outline", route: "/farmer/crops" },
          { id: "photos", title: "Photos", icon: "camera-outline", route: "/farmer/crops" },
          { id: "irrigation", title: "Irrigation", icon: "water-outline", route: "/farmer/crops" },
          { id: "treatments", title: "Treatments", icon: "shield-checkmark-outline", route: "/farmer/crops" },
          { id: "disease", title: "Disease & Pest", icon: "warning-outline", route: "/farmer/crops" },
          { id: "harvest", title: "Harvest", icon: "cube-outline", route: "/farmer/crops" },
        ])}

        {/* FARM MANAGEMENT */}
        {renderSection("FARM MANAGEMENT", [
          { id: "farm-map", title: "Farm Map", subtitle: "GPS field markers & boundaries", icon: "map-outline", route: "/farmer/farm-map" },
          { id: "reminders", title: "Farm Reminders", subtitle: "Irrigation, treatments & harvest alerts", icon: "notifications-outline", route: "/farmer/reminders" },
          { id: "tasks", title: "Farm Tasks", subtitle: "Scheduled activities & to-dos", icon: "checkbox-outline", route: "/farmer/tasks" },
          { id: "field-work", title: "Field Work", subtitle: "Direct field activity entry", icon: "document-text-outline", route: "/farmer/field-work" },
          { id: "fields", title: "Fields", icon: "grid-outline", route: "/farmer/fields" },
          { id: "crops", title: "Crops", icon: "leaf-outline", route: "/farmer/crops" },
        ])}

        {/* DATA & OFFLINE */}
        {renderSection("DATA & OFFLINE", [
          {
            id: "files",
            title: "My Exported Files",
            subtitle: "Saved PDF & CSV reports",
            icon: "document-outline",
            route: "/farmer/files",
          },
          {
            id: "sync",
            title: "Synchronization",
            subtitle: "Manage offline data & sync status",
            icon: "sync-outline",
            route: "/farmer/sync",
          },
        ])}

        {/* ACCOUNT */}
        {renderSection("ACCOUNT", [
          { id: "profile", title: "Profile", icon: "person-outline", route: "/farmer/profile" },
          { id: "settings", title: "Settings", icon: "settings-outline", route: "/farmer/settings" },
        ])}

        {/* ABOUT & LOGOUT */}
        {renderSection("ABOUT", [
          { id: "about", title: "About ZyGene", subtitle: "Version 1.0.0", icon: "information-circle-outline", route: "/farmer/about" },
        ])}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Log out">
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>

      <FarmerBottomTabs activeTab="more" />
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
  
  profileCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.xl },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginRight: SPACING.md },
  avatarText: { fontSize: 20, fontWeight: "700", color: COLORS.surface },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 2 },
  profileEmail: { fontSize: 13, color: COLORS.textSecondary },
  viewProfileText: { fontSize: 13, fontWeight: "600", color: COLORS.primary },

  sectionBlock: { marginBottom: SPACING.xl },
  sectionHeader: { fontSize: 12, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: SPACING.sm },
  listCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderLight, overflow: "hidden" },
  listItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: SPACING.md },
  listItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  listIcon: { marginRight: 12, width: 24, textAlign: "center" },
  listTextWrap: { flex: 1, justifyContent: "center" },
  itemTitle: { fontSize: 15, fontWeight: "500", color: COLORS.text },
  itemSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.danger, marginTop: SPACING.md },
  logoutText: { fontSize: 15, fontWeight: "600", color: COLORS.danger },
});
