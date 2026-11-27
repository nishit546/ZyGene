import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from "../../constants/theme";
import FarmerHeader from "../../components/ui/FarmerHeader";

export default function FarmerProfileScreen() {
  const [user, setUser] = useState(null);
  const [avatarUri, setAvatarUri] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        const savedAvatar = await AsyncStorage.getItem("zygene_user_avatar");
        if (savedAvatar) {
          setAvatarUri(savedAvatar);
        }
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

  const handleChangeAvatar = async () => {
    Alert.alert(
      "Profile Picture",
      "Choose an option to update your profile photo:",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
              Alert.alert("Permission Required", "Camera permission is needed to take a profile picture.");
              return;
            }
            const res = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
              const newUri = res.assets[0].uri;
              setAvatarUri(newUri);
              await AsyncStorage.setItem("zygene_user_avatar", newUri);
            }
          },
        },
        {
          text: "Choose from Gallery",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
              Alert.alert("Permission Required", "Gallery permission is needed to pick a profile photo.");
              return;
            }
            const res = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
              const newUri = res.assets[0].uri;
              setAvatarUri(newUri);
              await AsyncStorage.setItem("zygene_user_avatar", newUri);
            }
          },
        },
        avatarUri
          ? {
              text: "Remove Photo",
              style: "destructive",
              onPress: async () => {
                setAvatarUri(null);
                await AsyncStorage.removeItem("zygene_user_avatar");
              },
            }
          : null,
        { text: "Cancel", style: "cancel" },
      ].filter(Boolean)
    );
  };

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
          <TouchableOpacity style={styles.avatarWrapper} onPress={handleChangeAvatar} activeOpacity={0.8}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarLargeImage} resizeMode="cover" />
            ) : (
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>{initials}</Text>
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Text style={styles.heroName}>{farmerName}</Text>
          <Text style={styles.heroEmail}>{farmerEmail}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{role.toUpperCase()}</Text>
          </View>
          <TouchableOpacity onPress={handleChangeAvatar} style={styles.changePhotoBtn}>
            <Text style={styles.changePhotoText}>Change Profile Picture</Text>
          </TouchableOpacity>
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
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: SPACING.sm,
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primary || "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.sm,
  },
  avatarLargeImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    ...SHADOWS.sm,
  },
  cameraIconBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#1F2937",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarLargeText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  changePhotoBtn: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  changePhotoText: {
    fontSize: 12,
    color: COLORS.primary || "#2E7D32",
    fontWeight: "600",
  },
  heroName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  heroEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  roleBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full || 999,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary || "#2E7D32",
    letterSpacing: 0.5,
  },
  sectionBlock: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md || 10,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.xs,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
});
