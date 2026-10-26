import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

/**
 * Premium 4-item fixed bottom navigation for ZyGene Farmer.
 * Exactly 4 primary items: Home, Crops, Fields, More.
 * Lightweight, safe-area aware, with clean active dot indicator.
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
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.65}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.label} Tab`}
            >
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={20}
                color={isActive ? COLORS.primary : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {tab.label}
              </Text>
              {/* Active Dot Indicator */}
              <View
                style={[
                  styles.activeDot,
                  isActive && styles.activeDotVisible,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 22 : 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.1,
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
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
    backgroundColor: "transparent",
  },
  activeDotVisible: {
    backgroundColor: COLORS.primary,
  },
});
