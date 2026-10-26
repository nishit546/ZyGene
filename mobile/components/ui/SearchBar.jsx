import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../constants/theme";

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
  onClear,
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, isFocused && styles.containerFocused]}>
      <Ionicons
        name="search-outline"
        size={18}
        color={isFocused ? COLORS.primary : COLORS.textMuted}
        style={styles.icon}
      />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel={placeholder}
      />
      {value?.length > 0 && (
        <TouchableOpacity
          onPress={onClear ? onClear : () => onChangeText("")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={styles.clearBtn}
        >
          <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md || 10,
    height: 46,
    paddingHorizontal: SPACING.md,
    ...Platform.select({
      web: {
        transition: "all 0.2s ease",
      },
      default: {
        ...SHADOWS.subtle,
      },
    }),
  },
  containerFocused: {
    borderColor: COLORS.primary,
    backgroundColor: "#ffffff",
    ...Platform.select({
      web: {
        boxShadow: "0 0 0 3px rgba(46, 125, 50, 0.12)",
      },
    }),
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: COLORS.text,
    height: "100%",
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
        outlineColor: "transparent",
      },
    }),
  },
  clearBtn: {
    marginLeft: 8,
    padding: 2,
  },
});
