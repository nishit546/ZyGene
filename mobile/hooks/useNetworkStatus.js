import { useState, useEffect, useCallback, useRef } from "react";
import { Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";

/**
 * Hook to monitor network connectivity status.
 * Compatible with iOS, Android, and Web.
 */
export default function useNetworkStatus(onOnlineCallback) {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const previousOnlineRef = useRef(true);

  // Consider online if connected and internet is reachable (or null during initial check)
  const isOnline = Boolean(isConnected && (isInternetReachable !== false));

  const handleConnectivityChange = useCallback((state) => {
    const connected = Boolean(state.isConnected);
    const reachable = state.isInternetReachable !== false; // null means undetermined, treat as possible
    const online = connected && reachable;

    setIsConnected(connected);
    setIsInternetReachable(state.isInternetReachable);

    // If transitioned from offline to online, invoke callback
    if (!previousOnlineRef.current && online) {
      if (typeof onOnlineCallback === "function") {
        onOnlineCallback();
      }
    }

    previousOnlineRef.current = online;
  }, [onOnlineCallback]);

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then(handleConnectivityChange).catch(() => {});

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(handleConnectivityChange);

    // Web listeners fallback
    let onWebOnline = null;
    let onWebOffline = null;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      onWebOnline = () => handleConnectivityChange({ isConnected: true, isInternetReachable: true });
      onWebOffline = () => handleConnectivityChange({ isConnected: false, isInternetReachable: false });

      window.addEventListener("online", onWebOnline);
      window.addEventListener("offline", onWebOffline);
    }

    return () => {
      unsubscribe();
      if (Platform.OS === "web" && typeof window !== "undefined") {
        if (onWebOnline) window.removeEventListener("online", onWebOnline);
        if (onWebOffline) window.removeEventListener("offline", onWebOffline);
      }
    };
  }, [handleConnectivityChange]);

  const checkStatusNow = async () => {
    try {
      const state = await NetInfo.fetch();
      handleConnectivityChange(state);
      return Boolean(state.isConnected && state.isInternetReachable !== false);
    } catch {
      return false;
    }
  };

  return {
    isOnline,
    isConnected,
    isInternetReachable,
    checkStatusNow,
  };
}
