import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform } from "react-native";
import { router } from "expo-router";

/**
 * Clears JWT token and user info from AsyncStorage,
 * then navigates to /login using router.replace so the back button
 * cannot return to authenticated screens.
 */
export const logout = async () => {
  try {
    await AsyncStorage.multiRemove(["token", "user"]);
  } catch (error) {
    console.log("Error clearing auth session:", error);
  } finally {
    router.replace("/login");
  }
};

/**
 * Prompts the user with a standardized confirmation dialog before logout.
 */
export const confirmLogout = (customMessage) => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm) {
      if (window.confirm(customMessage || "Are you sure you want to logout?")) {
        logout();
      }
    } else {
      logout();
    }
    return;
  }

  Alert.alert(
    "Logout",
    customMessage || "Are you sure you want to logout?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: logout,
      },
    ]
  );
};

/**
 * Checks if a valid token exists in storage.
 * If missing, immediately redirects to /login and returns false.
 */
export const requireAuth = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return false;
    }
    return true;
  } catch {
    router.replace("/login");
    return false;
  }
};
