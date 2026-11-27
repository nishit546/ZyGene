import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform } from "react-native";
import { router } from "expo-router";
import { checkUnsyncedRecordsOnLogout } from "./syncService";

/**
 * Returns current user object from AsyncStorage.
 */
export const getCurrentUser = async () => {
  try {
    const userStr = await AsyncStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

/**
 * Returns current logged in user ID.
 */
export const getCurrentUserId = async () => {
  const user = await getCurrentUser();
  return user?.id || null;
};

/**
 * Clears JWT token and user info from AsyncStorage,
 * then navigates to /login using router.replace so the back button
 * cannot return to authenticated screens.
 * Note: Local SQLite cached records are preserved so offline records
 * are never silently wiped out.
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
 * Prompts the user with a confirmation dialog before logout.
 * Warns if unsynchronized offline records exist.
 */
export const confirmLogout = async (customMessage) => {
  const userId = await getCurrentUserId();
  let hasUnsynced = false;
  try {
    hasUnsynced = await checkUnsyncedRecordsOnLogout(userId);
  } catch (e) {
    console.warn("Could not check unsynced records before logout:", e);
  }

  const baseMsg = customMessage || "Are you sure you want to log out?";
  const warningMsg = hasUnsynced
    ? `${baseMsg}\n\n⚠️ WARNING: You have unsynchronized records waiting on this device. Logging out now will keep them stored safely on this device, but they will not reach the server until you log back in and synchronize.`
    : baseMsg;

  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm) {
      if (window.confirm(warningMsg)) {
        await logout();
      }
    } else {
      await logout();
    }
    return;
  }

  Alert.alert(
    "Log Out",
    warningMsg,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
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
