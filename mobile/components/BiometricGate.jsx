import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AppState,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOWS } from "../constants/theme";
import StorageService from "../services/storageService";
import { authenticateWithBiometrics, checkBiometricSupport } from "../services/biometricService";

export default function BiometricGate({ children }) {
  const [isLocked, setIsLocked] = useState(false);
  const [biometricType, setBiometricType] = useState("Biometrics");
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkLockRequirement();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkLockRequirement();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkLockRequirement = async () => {
    if (Platform.OS === "web") return;

    const enabled = await StorageService.isBiometricLockEnabled();
    if (!enabled) {
      setIsLocked(false);
      return;
    }

    const support = await checkBiometricSupport();
    if (support.supported) {
      setBiometricType(support.biometricType || "Biometrics");
      setIsLocked(true);
      performAuth();
    }
  };

  const performAuth = async () => {
    setAuthError(null);
    const result = await authenticateWithBiometrics(
      `Unlock ZyGene with ${biometricType}`
    );
    if (result.success) {
      setIsLocked(false);
    } else {
      setAuthError(result.error || "Authentication required");
    }
  };

  if (!isLocked) {
    return children;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons
            name={biometricType.toLowerCase().includes("face") ? "scan-outline" : "finger-print-outline"}
            size={48}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.title}>ZyGENE Locked</Text>
        <Text style={styles.subtitle}>
          Biometric App Lock is active. Verify your identity with {biometricType} to access your farm records.
        </Text>

        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        <TouchableOpacity style={styles.unlockBtn} onPress={performAuth}>
          <Ionicons
            name={biometricType.toLowerCase().includes("face") ? "scan" : "finger-print"}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.unlockBtnText}>Unlock with {biometricType}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background || "#F9FBF7",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 99999,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.lg,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginBottom: 16,
    textAlign: "center",
  },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    width: "100%",
    justifyContent: "center",
  },
  unlockBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
