import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import API from "../services/api";
import AppInput from "../components/ui/AppInput";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../constants/theme";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("farmer"); // "farmer" or "breeder"

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRegister = async () => {
    setErrorMsg("");

    if (!name.trim()) {
      const msg = "Please enter your full name.";
      setErrorMsg(msg);
      if (Platform.OS === "web" && typeof window !== "undefined" && window.alert) {
        window.alert(msg);
      } else {
        Alert.alert("Missing Information", msg);
      }
      return;
    }

    if (!email.trim()) {
      const msg = "Please enter your email address.";
      setErrorMsg(msg);
      if (Platform.OS === "web" && typeof window !== "undefined" && window.alert) {
        window.alert(msg);
      } else {
        Alert.alert("Missing Information", msg);
      }
      return;
    }

    if (!password) {
      const msg = "Please enter a password.";
      setErrorMsg(msg);
      if (Platform.OS === "web" && typeof window !== "undefined" && window.alert) {
        window.alert(msg);
      } else {
        Alert.alert("Missing Information", msg);
      }
      return;
    }

    if (password.length < 6) {
      const msg = "Password must be at least 6 characters long.";
      setErrorMsg(msg);
      if (Platform.OS === "web" && typeof window !== "undefined" && window.alert) {
        window.alert(msg);
      } else {
        Alert.alert("Weak Password", msg);
      }
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        phone: phone.trim() || null,
      };

      const response = await API.post("/auth/register", payload);

      console.log("REGISTER SUCCESS:", response.data);

      const successMsg =
        response.data?.message ||
        "Account created successfully. Please login to continue.";

      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.alert) {
          window.alert(successMsg);
        }
        router.replace("/login");
      } else {
        Alert.alert("Registration Successful", successMsg, [
          {
            text: "OK",
            onPress: () => router.replace("/login"),
          },
        ]);
      }
    } catch (error) {
      console.log("REGISTER ERROR:", error.response?.data || error.message);

      let message = error.response?.data?.message;
      if (!message) {
        if (error.message === "Network Error" || error.code === "ECONNABORTED") {
          message = `Unable to reach the server at ${API.defaults.baseURL}. Please ensure the backend server is running on port 4000.`;
        } else {
          message = error.message || "Failed to register. Please try again.";
        }
      }

      setErrorMsg(message);

      if (Platform.OS === "web" && typeof window !== "undefined" && window.alert) {
        window.alert(message);
      } else {
        Alert.alert("Registration Failed", message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background || "#F8FAF8" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Logo Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Ionicons name="leaf" size={28} color="#ffffff" />
            </View>
            <Text style={styles.brandTitle}>ZyGENE</Text>
            <Text style={styles.brandTagline}>Agritech Platform & Intelligence</Text>
          </View>

          {/* Form Header */}
          <View style={styles.formHeader}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join ZyGene to track crops and breeding trials</Text>
          </View>

          {/* Error Banner */}
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={COLORS.danger} style={{ marginRight: 8 }} />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Role Selection */}
          <Text style={styles.sectionLabel}>Select Your Role</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[
                styles.roleCard,
                role === "farmer" && styles.roleCardActive,
              ]}
              onPress={() => setRole("farmer")}
              activeOpacity={0.8}
            >
              <View style={[styles.roleIconCircle, role === "farmer" && styles.roleIconCircleActive]}>
                <Ionicons
                  name="leaf-outline"
                  size={20}
                  color={role === "farmer" ? COLORS.primary : COLORS.textSecondary}
                />
              </View>
              <Text style={[styles.roleCardTitle, role === "farmer" && styles.roleCardTitleActive]}>
                Farmer
              </Text>
              <Text style={styles.roleCardDesc}>
                Manage fields, crops & lifecycle logs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleCard,
                role === "breeder" && styles.roleCardActive,
              ]}
              onPress={() => setRole("breeder")}
              activeOpacity={0.8}
            >
              <View style={[styles.roleIconCircle, role === "breeder" && styles.roleIconCircleActive]}>
                <Ionicons
                  name="flask-outline"
                  size={20}
                  color={role === "breeder" ? COLORS.primary : COLORS.textSecondary}
                />
              </View>
              <Text style={[styles.roleCardTitle, role === "breeder" && styles.roleCardTitleActive]}>
                Breeder
              </Text>
              <Text style={styles.roleCardDesc}>
                Trials, crosses & genetics analytics
              </Text>
            </TouchableOpacity>
          </View>

          {/* Full Name */}
          <AppInput
            label="Full Name"
            placeholder="e.g. Ramesh Patel"
            value={name}
            onChangeText={(v) => {
              setName(v);
              if (errorMsg) setErrorMsg("");
            }}
            autoCapitalize="words"
            isRequired={true}
          />

          {/* Email */}
          <AppInput
            label="Email Address"
            placeholder="e.g. name@zygene.com"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (errorMsg) setErrorMsg("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            isRequired={true}
          />

          {/* Phone */}
          <AppInput
            label="Phone Number"
            placeholder="e.g. +91 9876543210 (Optional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            isRequired={false}
          />

          {/* Password */}
          <View style={styles.passwordWrapper}>
            <AppInput
              label="Password"
              placeholder="Minimum 6 characters"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (errorMsg) setErrorMsg("");
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              isRequired={true}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((prev) => !prev)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Create Account</Text>
                <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
              </View>
            )}
          </TouchableOpacity>

          {/* Switch to Login */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text style={styles.loginLinkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: COLORS.background || "#F8FAF8",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: COLORS.surface || "#FFFFFF",
    borderRadius: RADIUS.lg || 16,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight || "#EEF2EE",
    ...Platform.select({
      web: {
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)",
      },
      default: {
        ...SHADOWS.medium,
      },
    }),
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.primary || "#1B5E20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
    ...SHADOWS.subtle,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.primary || "#1B5E20",
    letterSpacing: 1.2,
  },
  brandTagline: {
    fontSize: 12.5,
    color: COLORS.textMuted || "#8C9B93",
    fontWeight: "500",
    marginTop: 2,
  },
  formHeader: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text || "#1C2526",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary || "#5A6B63",
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.dangerBg || "#FFEBEE",
    borderWidth: 1,
    borderColor: "#FFCDD2",
    borderRadius: RADIUS.md || 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    marginBottom: SPACING.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.danger || "#C62828",
    fontWeight: "500",
  },
  sectionLabel: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: SPACING.lg,
  },
  roleCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight || "#EEF2EE",
    backgroundColor: COLORS.surfaceSubtle || "#F4F6F4",
    borderRadius: RADIUS.md || 10,
    padding: SPACING.md,
    alignItems: "center",
    ...Platform.select({
      web: {
        cursor: "pointer",
        transition: "all 0.2s ease",
      },
    }),
  },
  roleCardActive: {
    borderColor: COLORS.primary || "#1B5E20",
    backgroundColor: "#F1F8F1",
    ...Platform.select({
      web: {
        boxShadow: "0 0 0 3px rgba(27, 94, 32, 0.12)",
      },
    }),
  },
  roleIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.borderLight || "#EEF2EE",
  },
  roleIconCircleActive: {
    borderColor: COLORS.primary || "#1B5E20",
    backgroundColor: "#E8F5E9",
  },
  roleCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text || "#1C2526",
    marginBottom: 2,
  },
  roleCardTitleActive: {
    color: COLORS.primary || "#1B5E20",
  },
  roleCardDesc: {
    fontSize: 11,
    color: COLORS.textSecondary || "#5A6B63",
    textAlign: "center",
    lineHeight: 14,
  },
  passwordWrapper: {
    position: "relative",
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    top: 40,
    padding: 6,
    zIndex: 10,
  },
  button: {
    backgroundColor: COLORS.primary || "#1B5E20",
    height: 50,
    borderRadius: RADIUS.md || 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.sm,
    ...Platform.select({
      web: {
        cursor: "pointer",
        transition: "background-color 0.2s ease",
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.xl,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary || "#5A6B63",
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary || "#1B5E20",
  },
});