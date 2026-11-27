import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  THEME_PREFERENCE: "zygene_theme_preference",
  LANGUAGE_PREFERENCE: "zygene_language_preference",
  BIOMETRIC_LOCK_ENABLED: "zygene_biometric_lock_enabled",
  ONBOARDING_COMPLETED: "zygene_onboarding_completed",
  LAST_SELECTED_FIELD: "zygene_last_selected_field",
  LAST_SELECTED_CROP: "zygene_last_selected_crop",
  DASHBOARD_FILTERS: "zygene_dashboard_filters",
  EXPORTED_FILES_INDEX: "zygene_exported_files_index",
};

/**
 * Storage service for persistent application settings and non-sensitive UI state.
 */
export const StorageService = {
  // Theme (light | dark | system)
  getThemePreference: async () => {
    try {
      return (await AsyncStorage.getItem(STORAGE_KEYS.THEME_PREFERENCE)) || "light";
    } catch {
      return "light";
    }
  },
  setThemePreference: async (theme) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME_PREFERENCE, theme);
    } catch (e) {
      console.warn("StorageService.setThemePreference error:", e);
    }
  },

  // Language (en | hi | gu | mr | te | ta)
  getLanguagePreference: async () => {
    try {
      return (await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE_PREFERENCE)) || "en";
    } catch {
      return "en";
    }
  },
  setLanguagePreference: async (lang) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE_PREFERENCE, lang);
    } catch (e) {
      console.warn("StorageService.setLanguagePreference error:", e);
    }
  },

  // Biometric Lock Enabled
  isBiometricLockEnabled: async () => {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_LOCK_ENABLED);
      return val === "true";
    } catch {
      return false;
    }
  },
  setBiometricLockEnabled: async (enabled) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_LOCK_ENABLED, enabled ? "true" : "false");
    } catch (e) {
      console.warn("StorageService.setBiometricLockEnabled error:", e);
    }
  },

  // Last Selected Field / Crop
  getLastSelectedField: async () => {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SELECTED_FIELD);
    } catch {
      return null;
    }
  },
  setLastSelectedField: async (fieldId) => {
    try {
      if (fieldId) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_SELECTED_FIELD, String(fieldId));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.LAST_SELECTED_FIELD);
      }
    } catch (e) {
      console.warn("StorageService.setLastSelectedField error:", e);
    }
  },

  getLastSelectedCrop: async () => {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SELECTED_CROP);
    } catch {
      return null;
    }
  },
  setLastSelectedCrop: async (cropId) => {
    try {
      if (cropId) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_SELECTED_CROP, String(cropId));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.LAST_SELECTED_CROP);
      }
    } catch (e) {
      console.warn("StorageService.setLastSelectedCrop error:", e);
    }
  },

  // Dashboard Filters
  getDashboardFilters: async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.DASHBOARD_FILTERS);
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  },
  setDashboardFilters: async (filters) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DASHBOARD_FILTERS, JSON.stringify(filters));
    } catch (e) {
      console.warn("StorageService.setDashboardFilters error:", e);
    }
  },

  // Exported Files Metadata Registry
  getExportedFiles: async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.EXPORTED_FILES_INDEX);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  },
  saveExportedFileRecord: async (fileRecord) => {
    try {
      const existing = await StorageService.getExportedFiles();
      const updated = [fileRecord, ...existing.filter((f) => f.path !== fileRecord.path)];
      await AsyncStorage.setItem(STORAGE_KEYS.EXPORTED_FILES_INDEX, JSON.stringify(updated));
    } catch (e) {
      console.warn("StorageService.saveExportedFileRecord error:", e);
    }
  },
  removeExportedFileRecord: async (filePath) => {
    try {
      const existing = await StorageService.getExportedFiles();
      const updated = existing.filter((f) => f.path !== filePath);
      await AsyncStorage.setItem(STORAGE_KEYS.EXPORTED_FILES_INDEX, JSON.stringify(updated));
    } catch (e) {
      console.warn("StorageService.removeExportedFileRecord error:", e);
    }
  },
};

export default StorageService;
