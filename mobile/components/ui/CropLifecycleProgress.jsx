import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../constants/theme";

const STAGES = [
  "seed_sowing",
  "germination",
  "seedling",
  "vegetative",
  "flowering",
  "fruiting",
  "maturity",
  "harvest",
];

const STAGE_LABELS = {
  seed_sowing: "Seed Sowing",
  germination: "Germination",
  seedling: "Seedling",
  vegetative: "Vegetative",
  flowering: "Flowering",
  fruiting: "Fruiting",
  maturity: "Maturity",
  harvest: "Harvest",
};

export default function CropLifecycleProgress({ currentStage = "seed_sowing" }) {
  const normStage = String(currentStage).toLowerCase().trim().replace(" ", "_");
  let currentIndex = STAGES.indexOf(normStage);
  if (currentIndex === -1) currentIndex = 0; // fallback to 0 if unknown

  const totalStages = STAGES.length;
  const progressPercent = ((currentIndex + 1) / totalStages) * 100;
  const stageName = STAGE_LABELS[normStage] || currentStage;

  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progressPercent,
      duration: 600,
      useNativeDriver: false, // width doesn't support native driver
    }).start();
  }, [progressPercent]);

  return (
    <View style={styles.container}>
      <View style={styles.textRow}>
        <Text style={styles.stageName}>{stageName}</Text>
        <Text style={styles.stageCount}>
          Stage {currentIndex + 1} of {totalStages}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.sm,
  },
  textRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 6,
  },
  stageName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },
  stageCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.pill,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
  },
});

