import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

/**
 * Reusable navigation bar for the ZyGene Breeder module.
 * Provides quick, one-tap navigation between top-level breeder workspaces:
 * Dashboard, Programs, Crosses, Trials, Analytics, Profile.
 *
 * @param {string} activeTab - The currently active tab identifier:
 *   'dashboard' | 'programs' | 'crosses' | 'trials' | 'analytics' | 'profile'
 */
export default function BreederNavigation({ activeTab = "dashboard" }) {
  const router = useRouter();

  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "grid-outline",
      activeIcon: "grid",
      route: "/breeder/dashboard",
    },
    {
      id: "programs",
      label: "Programs",
      icon: "leaf-outline",
      activeIcon: "leaf",
      route: "/breeder/programs",
    },
    {
      id: "crosses",
      label: "Crosses",
      icon: "git-merge-outline",
      activeIcon: "git-merge",
      route: "/breeder/crosses",
    },
    {
      id: "trials",
      label: "Trials",
      icon: "flask-outline",
      activeIcon: "flask",
      route: "/breeder/trials",
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: "bar-chart-outline",
      activeIcon: "bar-chart",
      route: "/breeder/analytics",
    },
    {
      id: "profile",
      label: "Profile",
      icon: "person-circle-outline",
      activeIcon: "person-circle",
      route: "/breeder/profile",
    },
  ];

  const handleNavigate = (item) => {
    if (item.id === activeTab) return;
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    router.replace(item.route);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => handleNavigate(item)}
              activeOpacity={0.75}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${item.label} tab`}
            >
              <Ionicons
                name={isActive ? item.activeIcon : item.icon}
                size={17}
                color={isActive ? "#FFFFFF" : "#2E7D32"}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2EBE2",
    elevation: 2,
    shadowColor: "#1B5E20",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F1F8F1",
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: "#2E7D32",
    elevation: 1,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  tabLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#2E7D32",
  },
  tabLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
