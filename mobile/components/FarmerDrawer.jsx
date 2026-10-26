import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  BackHandler,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../constants/theme";

export default function FarmerDrawer({ visible, onClose, farmerName = "Farmer" }) {
  const router = useRouter();

  useEffect(() => {
    if (!visible) return;
    const onBackPress = () => {
      onClose();
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => backHandler.remove();
  }, [visible, onClose]);

  const handleLogout = () => {
    onClose();
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(["token", "user"]);
            } catch (err) {
              console.log("Sign out error:", err);
            } finally {
              router.replace("/login");
            }
          },
        },
      ]
    );
  };

  const navigateTo = (path) => {
    onClose();
    router.push(path);
  };

  const initials = farmerName.charAt(0).toUpperCase();

  const renderNavRow = (title, icon, path, subtitle) => (
    <TouchableOpacity
      style={styles.navRow}
      onPress={() => navigateTo(path)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Navigate to ${title}`}
    >
      <Ionicons name={icon} size={18} color={COLORS.textSecondary} style={styles.navIcon} />
      <View style={styles.navTextWrap}>
        <Text style={styles.navTitle}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.borderDark} />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />

        <SafeAreaView style={styles.drawerContent}>
          <View style={styles.drawerHeader}>
            <View>
              <Text style={styles.brandTitle}>ZYGENE</Text>
              <Text style={styles.brandSubtitle}>Farmer Workspace</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.userCard} onPress={() => navigateTo("/farmer/profile")} activeOpacity={0.8}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{initials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{farmerName}</Text>
              <Text style={styles.userRole}>View Profile →</Text>
            </View>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.drawerScroll}>
            {/* WORKSPACE */}
            <View style={styles.navGroup}>
              {renderNavRow("Home", "home-outline", "/farmer/dashboard")}
              <View style={styles.separator} />
              {renderNavRow("Crops", "leaf-outline", "/farmer/crops")}
              <View style={styles.separator} />
              {renderNavRow("Fields", "map-outline", "/farmer/fields")}
            </View>

            {/* CROP MANAGEMENT */}
            <Text style={styles.sectionHeader}>CROP MANAGEMENT</Text>
            <View style={styles.navGroup}>
              {renderNavRow("Lifecycle", "git-commit-outline", "/farmer/crops")}
              <View style={styles.separator} />
              {renderNavRow("Measurements", "stats-chart-outline", "/farmer/crops")}
              <View style={styles.separator} />
              {renderNavRow("Photos", "camera-outline", "/farmer/crops")}
              <View style={styles.separator} />
              {renderNavRow("Irrigation", "water-outline", "/farmer/crops")}
              <View style={styles.separator} />
              {renderNavRow("Treatments", "shield-checkmark-outline", "/farmer/crops")}
              <View style={styles.separator} />
              {renderNavRow("Disease & Pest", "warning-outline", "/farmer/crops")}
              <View style={styles.separator} />
              {renderNavRow("Harvest", "cube-outline", "/farmer/crops")}
            </View>

            {/* ACCOUNT */}
            <Text style={styles.sectionHeader}>ACCOUNT</Text>
            <View style={styles.navGroup}>
              {renderNavRow("Profile", "person-outline", "/farmer/profile")}
              <View style={styles.separator} />
              {renderNavRow("Settings", "settings-outline", "/farmer/settings")}
            </View>

            {/* ABOUT */}
            <Text style={styles.sectionHeader}>ABOUT</Text>
            <View style={styles.navGroup}>
              {renderNavRow("About ZyGene", "information-circle-outline", "/farmer/about")}
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={18} color={COLORS.danger} style={styles.navIcon} />
              <Text style={[styles.navTitle, { color: COLORS.danger }]}>Log Out</Text>
            </TouchableOpacity>

          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.45)", flexDirection: "row" },
  backdropTouch: { flex: 1 },
  drawerContent: { width: "82%", maxWidth: 340, backgroundColor: COLORS.surface, height: "100%" },
  drawerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  brandTitle: { fontSize: 18, fontWeight: "800", color: COLORS.primary, letterSpacing: 0.8 },
  brandSubtitle: { fontSize: 12, fontWeight: "500", color: COLORS.textSecondary, marginTop: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 6, backgroundColor: COLORS.surfaceSubtle, alignItems: "center", justifyContent: "center" },
  
  userCard: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: COLORS.surfaceSubtle, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  userAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginRight: SPACING.md },
  userAvatarText: { color: COLORS.textLight, fontWeight: "700", fontSize: 16 },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  userRole: { fontSize: 12, color: COLORS.primary, fontWeight: "600", marginTop: 2 },
  
  drawerScroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: 40 },
  sectionHeader: { fontSize: 11, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.8, marginTop: SPACING.lg, marginBottom: SPACING.sm, textTransform: "uppercase" },
  
  navGroup: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderLight },
  navRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: SPACING.md },
  navIcon: { width: 24, marginRight: 8, textAlign: "center" },
  navTextWrap: { flex: 1 },
  navTitle: { fontSize: 14, fontWeight: "500", color: COLORS.text },
  separator: { height: 1, backgroundColor: COLORS.borderLight, marginLeft: 44 },

  logoutBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: SPACING.md, marginTop: SPACING.xl, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.danger },
});
