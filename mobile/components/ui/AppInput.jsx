import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, Platform } from "react-native";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from "../../constants/theme";

/**
 * Reusable enterprise Form Input with explicit focus & error states,
 * smooth ambient glow, and complete web focus ring resets.
 *
 * @param {Object} props
 * @param {string} [props.label] - Field label above input
 * @param {string} [props.placeholder] - Hint text
 * @param {string} props.value - Input value
 * @param {(val: string) => void} props.onChangeText - Change callback
 * @param {boolean} [props.isRequired=false] - Whether field is required
 * @param {string} [props.error] - Error message
 * @param {string} [props.helper] - Informative helper text
 * @param {boolean} [props.multiline=false] - For notes/descriptions
 * @param {number} [props.numberOfLines] - Number of lines if multiline
 * @param {import('react-native').KeyboardTypeOptions} [props.keyboardType] - Keyboard type
 * @param {import('react-native').StyleProp<import('react-native').ViewStyle>} [props.containerStyle] - Extra container styling
 */
export default function AppInput({
  label,
  placeholder,
  value,
  onChangeText,
  isRequired = false,
  error,
  helper,
  multiline = false,
  numberOfLines = 3,
  keyboardType = "default",
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}) {
  const [isFocused, setIsFocused] = useState(false);

  let borderColor = COLORS.border;
  if (error) {
    borderColor = COLORS.danger;
  } else if (isFocused) {
    borderColor = COLORS.primary;
  }

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label}
            {isRequired && <Text style={styles.requiredAsterisk}> *</Text>}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.inputBox,
          { borderColor },
          isFocused && styles.inputBoxFocused,
          error && styles.inputBoxError,
          multiline && styles.inputBoxMultiline,
          multiline && numberOfLines ? { minHeight: numberOfLines * 24 + 28 } : null,
        ]}
      >
        <TextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline,
          ]}
          placeholder={placeholder}
          placeholderTextColor="#64748B"
          cursorColor="#1B5E20"
          selectionColor="rgba(27, 94, 32, 0.25)"
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          textAlignVertical={multiline ? "top" : "center"}
          {...rest}
        />
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helperText}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.md,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: 0.15,
  },
  requiredAsterisk: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  inputBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderRadius: RADIUS.md || 10,
    paddingHorizontal: SPACING.md,
    minHeight: 50,
    justifyContent: "center",
    ...Platform.select({
      web: {
        transition: "all 0.2s ease-in-out",
      },
      default: {
        ...SHADOWS.subtle,
      },
    }),
  },
  inputBoxFocused: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    ...Platform.select({
      web: {
        boxShadow: "0 0 0 3.5px rgba(27, 94, 32, 0.14)",
      },
    }),
  },
  inputBoxError: {
    backgroundColor: "#fffbfa",
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    ...Platform.select({
      web: {
        boxShadow: "0 0 0 3.5px rgba(211, 47, 47, 0.12)",
      },
    }),
  },
  inputBoxMultiline: {
    minHeight: 90,
    paddingVertical: SPACING.sm + 4,
    justifyContent: "flex-start",
  },
  input: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    paddingHorizontal: 0,
    margin: 0,
    width: "100%",
    borderWidth: 0,
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
        outlineColor: "transparent",
        boxShadow: "none",
      },
    }),
  },
  inputMultiline: {
    textAlignVertical: "top",
    minHeight: 70,
  },
  helperText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 5,
    lineHeight: 16,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: "500",
    marginTop: 5,
    lineHeight: 16,
  },
});
