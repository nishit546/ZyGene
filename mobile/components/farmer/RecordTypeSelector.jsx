import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from "../../constants/theme";
import { fetchFarmerNotifications } from "../../utils/farmerNotifications";

const RECORD_TYPES = [
  { id: "lifecycle", title: "Lifecycle", desc: "Update current growth stage", icon: "leaf-outline" },
  { id: "measurement", title: "Measurement", desc: "Record plant height, weight, etc.", icon: "bar-chart-outline" },
  { id: "photo", title: "Photo", desc: "Add visual progress updates", icon: "camera-outline" },
  { id: "irrigation", title: "Irrigation", desc: "Record irrigation activity", icon: "water-outline" },
  { id: "treatment", title: "Treatment", desc: "Record fertilizer or chemical application", icon: "flask-outline" },
  { id: "disease", title: "Disease & Pest", desc: "Log disease or pest observations", icon: "warning-outline" },
  { id: "harvest", title: "Harvest", desc: "Log yield and crop grading", icon: "basket-outline" },
];

export default function RecordTypeSelector({ onSelect, cropId }) {
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFarmerNotifications()
      .then(res => {
        // Filter only ACTIVITY type and optionally by cropId if passed
        let activities = res.filter(r => r.type === "ACTIVITY");
        if (cropId) {
          activities = activities.filter(r => r.cropId === cropId);
        }
        setRecent(activities.slice(0, 2));
      })
      .catch(err => console.log(err))
      .finally(() => setLoading(false));
  }, [cropId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>What would you like to record?</Text>
      <View style={styles.list}>
        {RECORD_TYPES.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => onSelect(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Add ${item.title} record`}
          >
            <View style={styles.iconBox}>
              <Ionicons name={item.icon} size={24} color={COLORS.primary} />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDesc}>{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.borderDark} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.recentTitle}>Recent Field Work</Text>
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: SPACING.md }} />
        ) : recent.length > 0 ? (
          recent.map(r => (
            <View key={r.id} style={styles.recentCard}>
               <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
               <View style={{ flex: 1 }}>
                 <Text style={styles.recentItemTitle}>{r.title}</Text>
                 <Text style={styles.recentItemDesc}>{r.description}</Text>
               </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyRecent}>No recent activity</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  title: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.lg,
  },
  list: {
    gap: SPACING.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  textCol: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  itemDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  recentSection: {
    marginTop: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  recentCard: {
    flexDirection: "row",
    paddingVertical: SPACING.sm,
  },
  recentItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  recentItemDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyRecent: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontStyle: "italic",
  }
});
