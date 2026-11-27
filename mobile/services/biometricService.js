import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";
import StorageService from "./storageService";

/**
 * Check device biometric hardware capability and enrollment.
 */
export async function checkBiometricSupport() {
  try {
    if (Platform.OS === "web") {
      return {
        hasHardware: false,
        isEnrolled: false,
        biometricType: "None",
        supported: false,
      };
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometricType = "Biometrics";
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = "Face ID";
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = "Fingerprint";
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = "Iris";
    }

    return {
      hasHardware,
      isEnrolled,
      biometricType,
      supported: hasHardware && isEnrolled,
    };
  } catch (error) {
    console.log("[biometricService] checkBiometricSupport error:", error.message);
    return {
      hasHardware: false,
      isEnrolled: false,
      biometricType: "None",
      supported: false,
    };
  }
}

/**
 * Prompt biometric authentication dialog.
 */
export async function authenticateWithBiometrics(
  reason = "Verify identity to access ZyGene Farm Management"
) {
  try {
    if (Platform.OS === "web") {
      return { success: true };
    }

    const support = await checkBiometricSupport();
    if (!support.supported) {
      return { success: false, error: "Biometric authentication is not configured on this device." };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: "Use Password",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: result.error || "Authentication cancelled or failed.",
      };
    }
  } catch (error) {
    console.log("[biometricService] authenticateWithBiometrics error:", error.message);
    return { success: false, error: error.message };
  }
}
