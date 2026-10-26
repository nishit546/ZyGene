import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../constants/theme";

/**
 * Reusable compact record row for listing items like measurements, irrigation, etc.
 */
export default function RecordRow({
  title,
  value,
  date,
  subtitle,
  icon = "document-text-outline",
  onPress,
  isLast = false,
}) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.touchable}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={20} color={COLORS.textSecondary} />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {value && <Text style={styles.value}>{value}</Text>}
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.date}>{date}</Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {onPress && (
          <Ionicons name="chevron-forward" size={16} color={COLORS.borderDark} style={styles.chevron} />
        )}
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
  },
  touchable: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.base,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
    textAlign: "right",
    marginLeft: 8,
  },
  chevron: {
    marginLeft: SPACING.sm,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginLeft: 52 + SPACING.base, // Align with text content
  },
});
