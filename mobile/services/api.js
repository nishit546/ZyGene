import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";

const BACKEND_PORT = 4000;

/**
 * Dynamically resolves the API base URL.
 * Automatically picks up the host IP from Expo's hostUri if running on a physical device,
 * uses the browser hostname on web, or falls back to localhost.
 */
const getBaseUrl = () => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location && window.location.hostname) {
      return `http://${window.location.hostname}:${BACKEND_PORT}/api`;
    }
    return `http://localhost:${BACKEND_PORT}/api`;
  }

  // Auto-detect IP from Expo development server
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const hostIp = hostUri.split(":")[0];
    if (hostIp) {
      return `http://${hostIp}:${BACKEND_PORT}/api`;
    }
  }

  // Fallback to current local network Wi-Fi IP
  return `http://192.168.1.93:${BACKEND_PORT}/api`;
};

const BASE_URL = getBaseUrl();

console.log("[API] Configured Base URL:", BASE_URL);

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add JWT automatically to every request
API.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auto-handle 401 Unauthorized (expired or invalid token)
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || "";
      // Do not redirect if login or register itself fails with 401
      if (
        !requestUrl.includes("/auth/login") &&
        !requestUrl.includes("/auth/register")
      ) {
        try {
          await AsyncStorage.multiRemove(["token", "user"]);
        } catch (storageErr) {
          console.log("Error clearing storage on 401:", storageErr);
        }
        try {
          router.replace("/login");
        } catch (navErr) {
          console.log("Navigation error on 401:", navErr);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;