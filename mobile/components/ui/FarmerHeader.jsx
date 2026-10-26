import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, TYPOGRAPHY } from "../../constants/theme";

import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Reusable clean header for Farmer screens.
 *
 * @param {Object} props
 * @param {string} props.title - Primary screen or entity title
 * @param {string} [props.subtitle] - Secondary contextual text
 * @param {boolean} [props.showDrawer=false] - Show hamburger drawer trigger
 * @param {() => void} [props.onOpenDrawer] - Handler for hamburger press
 * @param {boolean} [props.showBack=false] - Show back navigation arrow
 * @param {() => void} [props.onBack] - Custom back handler
 * @param {React.ReactNode} [props.rightAction] - Optional right button/icon
 * @param {boolean} [props.compact=false] - For tighter child screens
 * @param {boolean} [props.withSafeArea=false] - Include safe area top inset if not wrapped in SafeAreaView
 */
export default function FarmerHeader({
  title,
  subtitle,
  showDrawer = false,
  onOpenDrawer,
  showBack = false,
  onBack,
  rightAction,
  compact = false,
  withSafeArea = false,
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/farmer/dashboard");
    }
  };

  const paddingTop = withSafeArea
    ? Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0) + (compact ? 4 : 8)
    : (compact ? SPACING.xs : SPACING.sm + 2);

  return (
    <View style={[styles.headerContainer, { paddingTop }, compact && styles.headerCompact]}>
      <View style={styles.topRow}>
        {/* Left Action: Hamburger or Back Button */}
        <View style={styles.leftCol}>
          {showBack && (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.navIconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
          )}

          {showDrawer && (
            <TouchableOpacity
              onPress={onOpenDrawer}
              style={styles.navIconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Open navigation menu"
            >
              <Ionicons name="menu" size={24} color={COLORS.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Title Area */}
        <View style={styles.titleCol}>
          <Text
            style={[styles.titleText, compact && styles.titleCompact]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right Action */}
        <View style={styles.rightCol}>
          {rightAction ? rightAction : <View style={styles.actionPlaceholder} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: COLORS.surface,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerCompact: {
    paddingBottom: SPACING.sm + 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },
  leftCol: {
    width: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  navIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceSubtle,
  },
  titleCol: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
    justifyContent: "center",
  },
  titleText: {
    ...TYPOGRAPHY.sectionTitle,
    fontSize: 18,
    color: COLORS.text,
  },
  titleCompact: {
    fontSize: 16,
  },
  subtitleText: {
    ...TYPOGRAPHY.supporting,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  rightCol: {
    minWidth: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  actionPlaceholder: {
    width: 36,
    height: 36,
  },
});
