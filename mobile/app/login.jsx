import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import API from "../services/api";
import AppInput from "../components/ui/AppInput";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../constants/theme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Clear any residual session when landing on login screen
  useEffect(() => {
    AsyncStorage.multiRemove(["token", "user"]).catch(() => {});
  }, []);

  const handleLogin = async () => {
    setErrorMsg("");

    if (!email.trim() || !password) {
      const msg = "Please enter both email and password.";
      setErrorMsg(msg);
      if (Platform.OS === "web" && typeof window !== "undefined" && window.alert) {
        window.alert(msg);
      } else {
        Alert.alert("Missing Information", msg);
      }
      return;
    }

    try {
      setLoading(true);

      const response = await API.post("/auth/login", {
        email: email.trim(),
        password: password,
      });

      const token = response.data.token;

      if (!token) {
        const msg = "Token was not returned by the server.";
        setErrorMsg(msg);
        if (Platform.OS === "web" && typeof window !== "undefined" && window.alert) {
          window.alert(msg);
        } else {
          Alert.alert("Login Error", msg);
        }
        return;
      }

      // Store credentials
      await AsyncStorage.multiRemove(["token", "user"]);
      await AsyncStorage.setItem("token", token);

      if (response.data.user) {
        await AsyncStorage.setItem("user", JSON.stringify(response.data.user));
      }

      const rawRole = response.data?.user?.role || response.data?.role;
      const role = rawRole ? String(rawRole).toLowerCase().trim() : null;

      if (role === "farmer") {
        router.replace("/farmer/dashboard");
      } else if (role === "breeder") {
        router.replace("/breeder/dashboard");
      } else if (role === "admin") {
        Alert.alert("Admin", "Admin dashboard is not available yet.");
      } else {
        Alert.alert("Warning", "Unable to determine user role.");
      }
    } catch (error) {
      console.log("LOGIN ERROR:", error.response?.data || error.message);

      let message = error.response?.data?.message;
      if (!message) {
        if (error.message === "Network Error" || error.code === "ECONNABORTED") {
          message = `Unable to reach server at ${API.defaults.baseURL}. Ensure backend is active on port 4000.`;
        } else {
          message = error.message || "Unable to login. Please check your credentials.";
        }
      }

      setErrorMsg(message);

      if (Platform.OS === "web" && typeof window !== "undefined" && window.alert) {
        window.alert(message);
      } else {
        Alert.alert("Login Failed", message);
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in with your credentials to continue</Text>
          </View>

          {/* Error Banner */}
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={COLORS.danger} style={{ marginRight: 8 }} />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Inputs */}
          <AppInput
            label="Email Address"
            placeholder="e.g. farmer@zygene.com"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (errorMsg) setErrorMsg("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            isRequired={true}
          />

          <View style={styles.passwordWrapper}>
            <AppInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(val) => {
                setPassword(val);
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
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
              </View>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/register")}>
              <Text style={styles.registerLinkText}>Register here</Text>
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
    maxWidth: 440,
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
  registerLinkText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary || "#1B5E20",
  },
});