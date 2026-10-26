import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from "../../constants/theme";
import StatusBadge from "./StatusBadge";
import API from "../../services/api";

export default function CropContextBar({ cropId, currentStage }) {
  const [crop, setCrop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!cropId) return;
    API.get(`/crops/${cropId}`)
      .then((res) => {
        if (isMounted) {
          setCrop(res.data?.crop || null);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.log("Failed to load crop context", err);
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [cropId]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  if (!crop) return null;

  const isHarvested = (crop.crop_status || "").toLowerCase() === "harvested";

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.cropTitle}>
          {crop.crop_name} {crop.variety ? `• ${crop.variety}` : ""}
        </Text>
        <Text style={styles.fieldSubtitle}>{crop.field_name || "Unknown Field"}</Text>
      </View>
      <View style={styles.right}>
        <StatusBadge status={isHarvested ? "Harvested" : "Active"} size="sm" />
        {currentStage && (
          <View style={styles.stageBadge}>
            <Text style={styles.stageText}>
              {String(currentStage).replace(/_/g, " ").toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    justifyContent: "space-between",
    alignItems: "center",
  },
  center: {
    justifyContent: "center",
  },
  left: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  cropTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  fieldSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  right: {
    alignItems: "flex-end",
  },
  stageBadge: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  stageText: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
});
