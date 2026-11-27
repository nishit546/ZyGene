import { Share, Alert, Platform } from "react-native";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import * as Contacts from "expo-contacts";

/**
 * Share text via native share sheet.
 */
export async function shareText({ title, message, url }) {
  try {
    const content = {
      title: title || "ZyGene Agricultural Report",
      message: message || "",
    };
    if (url && Platform.OS === "ios") {
      content.url = url;
    }

    const result = await Share.share(content, {
      dialogTitle: title || "Share via ZyGene",
      subject: title || "ZyGene AgriTech Report",
    });

    return { success: true, result };
  } catch (error) {
    console.log("[shareService] shareText error:", error.message);
    Alert.alert("Share Notice", "Could not open system share dialog.");
    return { success: false, error: error.message };
  }
}

/**
 * Share a local file (e.g., exported PDF or CSV report) via expo-sharing.
 */
export async function shareFile(fileUri, dialogTitle = "Share Document") {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Share Unavailable", "Sharing files is not supported on this platform.");
      return { success: false, error: "Sharing unavailable on this device" };
    }

    await Sharing.shareAsync(fileUri, {
      dialogTitle,
      UTI: fileUri.endsWith(".pdf") ? "com.adobe.pdf" : "public.comma-separated-values-text",
      mimeType: fileUri.endsWith(".pdf") ? "application/pdf" : "text/csv",
    });

    return { success: true };
  } catch (error) {
    console.log("[shareService] shareFile error:", error.message);
    Alert.alert("Share Error", "Unable to share selected file.");
    return { success: false, error: error.message };
  }
}

/**
 * Copy text to clipboard and display user-friendly feedback.
 */
export async function copyToClipboard(text, label = "Item") {
  try {
    if (!text) {
      Alert.alert("Notice", "Nothing to copy.");
      return false;
    }
    await Clipboard.setStringAsync(String(text));
    Alert.alert("Copied to Clipboard", `${label} copied to clipboard.`);
    return true;
  } catch (error) {
    console.log("[shareService] copyToClipboard error:", error.message);
    Alert.alert("Clipboard Error", "Failed to copy to clipboard.");
    return false;
  }
}

/**
 * Request contacts permission and fetch device contacts.
 * User privacy guarantee: contacts are only read on-device and never transmitted to backend.
 */
export async function getDeviceContacts() {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") {
      return {
        success: false,
        error: "Contacts permission was not granted. Please enable contacts access in your device settings.",
        contacts: [],
      };
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
      ],
      sort: Contacts.SortTypes.FirstName,
      pageSize: 100,
    });

    const formatted = (data || [])
      .filter((c) => c.name)
      .map((c) => ({
        id: c.id,
        name: c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown",
        phone: c.phoneNumbers && c.phoneNumbers.length > 0 ? c.phoneNumbers[0].number : null,
        email: c.emails && c.emails.length > 0 ? c.emails[0].email : null,
      }));

    return {
      success: true,
      contacts: formatted,
    };
  } catch (error) {
    console.log("[shareService] getDeviceContacts error:", error.message);
    return {
      success: false,
      error: error.message || "Failed to load device contacts.",
      contacts: [],
    };
  }
}

/**
 * Check existing contacts permission without prompting.
 */
export async function checkContactsPermission() {
  try {
    const { status } = await Contacts.getPermissionsAsync();
    return status;
  } catch (err) {
    return "undetermined";
  }
}
