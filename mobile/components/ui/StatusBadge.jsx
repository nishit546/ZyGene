import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";

/**
 * Reusable subtle status badge for Farmer UI.
 * Restrained colors, no neon backgrounds, clean typography.
 *
 * @param {Object} props
 * @param {string} props.status - The status label (e.g. 'Active', 'Harvested', 'Growing', 'High', 'Planned')
 * @param {'sm' | 'md'} [props.size='sm'] - Badge size
 * @param {string} [props.customLabel] - Optional custom display label
 */
export default function StatusBadge({ status = "Active", size = "sm", customLabel }) {
  const norm = String(status || "").toLowerCase().trim();

  let bg = COLORS.neutralBg;
  let text = COLORS.neutral;

  if (norm.includes("active") || norm.includes("grow") || norm.includes("healthy") || norm.includes("low")) {
    bg = COLORS.activeBg;
    text = COLORS.active;
  } else if (norm.includes("harvest") || norm.includes("complete") || norm.includes("done")) {
    bg = COLORS.harvestedBg;
    text = COLORS.harvested;
  } else if (norm.includes("plan") || norm.includes("sow")) {
    bg = COLORS.plannedBg;
    text = COLORS.planned;
  } else if (norm.includes("moderate") || norm.includes("medium") || norm.includes("warn")) {
    bg = COLORS.warningBg;
    text = COLORS.warning;
  } else if (norm.includes("severe") || norm.includes("high") || norm.includes("fail") || norm.includes("danger")) {
    bg = COLORS.dangerBg;
    text = COLORS.danger;
  }

  const label = customLabel || status.toUpperCase();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, size === "md" && styles.badgeMd]}>
      <Text style={[styles.badgeText, { color: text }, size === "md" && styles.badgeTextMd]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  badgeTextMd: {
    fontSize: 12,
  },
});
