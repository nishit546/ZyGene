import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS } from "../constants/theme";

/**
 * Animated individual tab button with scale spring and active pill styling
 */
function AnimatedTabItem({ tab, isActive, onPress }) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const activeScale = useRef(new Animated.Value(isActive ? 1 : 0.9)).current;
  const activeOpacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(activeScale, {
        toValue: isActive ? 1 : 0.9,
        friction: 5,
        tension: 140,
        useNativeDriver: true,
      }),
      Animated.timing(activeOpacity, {
        toValue: isActive ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive]);

  const handlePressIn = () => {
    Animated.timing(pressScale, {
      toValue: 0.9,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 4,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Safe fallback if haptics fail
      }
    }
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.85}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${tab.label} Tab`}
    >
      <Animated.View
        style={[
          styles.tabContent,
          {
            transform: [{ scale: pressScale }],
          },
        ]}
      >
        {/* Animated Active Pill Background */}
        <Animated.View
          style={[
            styles.activePill,
            {
              opacity: activeOpacity,
              transform: [{ scale: activeScale }],
            },
          ]}
        />

        {/* Icon with subtle scale */}
        <Animated.View
          style={{
            transform: [{ scale: isActive ? activeScale : 1 }],
          }}
        >
          <Ionicons
            name={isActive ? tab.activeIcon : tab.icon}
            size={21}
            color={isActive ? COLORS.primary : COLORS.textMuted}
          />
        </Animated.View>

        {/* Tab Label */}
        <Text
          style={[
            styles.tabLabel,
            isActive ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>

        {/* Active Underline Dot */}
        <Animated.View
          style={[
            styles.activeDot,
            {
              opacity: activeOpacity,
              transform: [
                {
                  scaleX: activeScale.interpolate({
                    inputRange: [0.9, 1],
                    outputRange: [0.4, 1],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

/**
 * Premium 4-item animated bottom navigation for ZyGene Farmer.
 * Exactly 4 primary items: Home, Crops, Fields, More.
 * Features smooth spring micro-interactions, pill indicator, and haptic feedback.
 *
 * @param {Object} props
 * @param {'home' | 'crops' | 'fields' | 'more'} props.activeTab - Currently active tab
 */
export default function FarmerBottomTabs({ activeTab = "home" }) {
  const router = useRouter();

  const tabs = [
    {
      id: "home",
      label: "Home",
      icon: "home-outline",
      activeIcon: "home",
      route: "/farmer/dashboard",
    },
    {
      id: "crops",
      label: "Crops",
      icon: "leaf-outline",
      activeIcon: "leaf",
      route: "/farmer/crops",
    },
    {
      id: "fields",
      label: "Fields",
      icon: "map-outline",
      activeIcon: "map",
      route: "/farmer/fields",
    },
    {
      id: "more",
      label: "More",
      icon: "grid-outline",
      activeIcon: "grid",
      route: "/farmer/more",
    },
  ];

  const handleTabPress = (tab) => {
    if (tab.id === activeTab) return;
    router.replace(tab.route);
  };

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabsRow}>
        {tabs.map((tab) => (
          <AnimatedTabItem
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onPress={() => handleTabPress(tab)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 22 : 8,
    shadowColor: "#1B5E20",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 64,
  },
  activePill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(27, 94, 32, 0.12)",
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    fontWeight: "700",
    color: COLORS.primary,
  },
  tabLabelInactive: {
    fontWeight: "500",
    color: COLORS.textMuted,
  },
  activeDot: {
    width: 14,
    height: 3,
    borderRadius: 2,
    marginTop: 2,
    backgroundColor: COLORS.primary,
  },
});
