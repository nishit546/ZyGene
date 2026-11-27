import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configure how notifications appear when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const REMINDERS_STORAGE_KEY = "@zygene_farm_reminders";

export const REMINDER_CATEGORIES = [
  { id: "irrigation", label: "Irrigation", icon: "water-outline" },
  { id: "fertilizer", label: "Fertilizer", icon: "flask-outline" },
  { id: "treatment", label: "Treatment", icon: "medkit-outline" },
  { id: "inspection", label: "Field Inspection", icon: "search-outline" },
  { id: "harvest", label: "Harvest", icon: "basket-outline" },
];

/**
 * Request permission for notifications.
 */
export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === "granted";
  } catch (error) {
    console.log("[notificationService] Permission request error:", error.message);
    return false;
  }
}

/**
 * Check permission status without prompt.
 */
export async function checkNotificationPermission() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch (error) {
    return "undetermined";
  }
}

/**
 * Schedule a local farm reminder.
 */
export async function scheduleFarmReminder({
  id = `rem_${Date.now()}`,
  title,
  body,
  category = "irrigation",
  triggerDate,
  data = {},
}) {
  try {
    let notificationId = null;

    if (Platform.OS !== "web") {
      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        // Calculate seconds from now or trigger at date
        const now = Date.now();
        const target = new Date(triggerDate).getTime();
        const secondsFromNow = Math.max(1, Math.round((target - now) / 1000));

        notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🌾 ZyGene Reminder: ${title}`,
            body: body || "Scheduled farm activity",
            data: { ...data, category, reminderId: id },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsFromNow,
          },
        });
      }
    }

    const reminder = {
      id,
      notificationId,
      title,
      body,
      category,
      triggerDate: new Date(triggerDate).toISOString(),
      createdAt: new Date().toISOString(),
      completed: false,
      data,
    };

    // Save reminder locally
    const existing = await getSavedReminders();
    const updated = [reminder, ...existing];
    await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(updated));

    return { success: true, reminder };
  } catch (error) {
    console.log("[notificationService] scheduleFarmReminder error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve saved farm reminders.
 */
export async function getSavedReminders() {
  try {
    const json = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.log("[notificationService] getSavedReminders error:", e.message);
    return [];
  }
}

/**
 * Mark a reminder as completed.
 */
export async function toggleReminderCompleted(reminderId) {
  try {
    const existing = await getSavedReminders();
    const updated = existing.map((r) =>
      r.id === reminderId ? { ...r, completed: !r.completed } : r
    );
    await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}

/**
 * Cancel and delete a reminder.
 */
export async function deleteFarmReminder(reminderId) {
  try {
    const existing = await getSavedReminders();
    const found = existing.find((r) => r.id === reminderId);
    if (found && found.notificationId && Platform.OS !== "web") {
      await Notifications.cancelScheduledNotificationAsync(found.notificationId);
    }
    const updated = existing.filter((r) => r.id !== reminderId);
    await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (e) {
    console.log("[notificationService] deleteFarmReminder error:", e.message);
    return false;
  }
}
