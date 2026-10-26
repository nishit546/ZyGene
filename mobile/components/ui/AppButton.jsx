import React from "react";
import { Text, StyleSheet, ActivityIndicator, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";

/**
 * Reusable action-oriented Button component with subtle press feedback.
 *
 * @param {Object} props
 * @param {string} props.title - Action label
 * @param {() => void} props.onPress - Press handler
 * @param {'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'} [props.variant='primary'] - Button style variant
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - Height size
 * @param {boolean} [props.loading=false] - Show loading indicator
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {keyof typeof Ionicons.glyphMap} [props.icon] - Optional Ionicons name
 * @param {'left' | 'right'} [props.iconPosition='left'] - Icon placement
 * @param {import('react-native').StyleProp<import('react-native').ViewStyle>} [props.style] - Custom style
 */
export default function AppButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  iconPosition = "left",
  style,
}) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isOutline = variant === "outline";
  const isDanger = variant === "danger";
  const isGhost = variant === "ghost";

  let containerStyles = [styles.buttonBase];
  let textStyles = [styles.textBase];
  let iconColor = COLORS.textLight;

  if (isPrimary) {
    containerStyles.push(styles.btnPrimary);
    textStyles.push(styles.textPrimary);
    iconColor = COLORS.textLight;
  } else if (isSecondary) {
    containerStyles.push(styles.btnSecondary);
    textStyles.push(styles.textSecondary);
    iconColor = COLORS.text;
  } else if (isOutline) {
    containerStyles.push(styles.btnOutline);
    textStyles.push(styles.textOutline);
    iconColor = COLORS.primary;
  } else if (isDanger) {
    containerStyles.push(styles.btnDanger);
    textStyles.push(styles.textDanger);
    iconColor = COLORS.textLight;
  } else if (isGhost) {
    containerStyles.push(styles.btnGhost);
    textStyles.push(styles.textGhost);
    iconColor = COLORS.textSecondary;
  }

  if (size === "sm") {
    containerStyles.push(styles.btnSm);
    textStyles.push(styles.textSm);
  } else if (size === "lg") {
    containerStyles.push(styles.btnLg);
    textStyles.push(styles.textLg);
  } else {
    containerStyles.push(styles.btnMd);
  }

  if (disabled) {
    containerStyles.push(styles.btnDisabled);
    textStyles.push(styles.textDisabled);
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        containerStyles,
        pressed && !disabled && styles.btnPressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary || isDanger ? COLORS.textLight : COLORS.primary}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === "left" && (
            <Ionicons
              name={icon}
              size={size === "sm" ? 14 : 16}
              color={iconColor}
              style={styles.iconLeft}
            />
          )}
          <Text style={textStyles}>{title}</Text>
          {icon && iconPosition === "right" && (
            <Ionicons
              name={icon}
              size={size === "sm" ? 14 : 16}
              color={iconColor}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  buttonBase: {
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  textBase: {
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  btnSm: {
    height: 36,
    paddingHorizontal: SPACING.md,
  },
  btnMd: {
    height: 46,
    paddingHorizontal: SPACING.lg,
  },
  btnLg: {
    height: 50,
    paddingHorizontal: SPACING.xl,
  },
  textSm: {
    fontSize: 13,
  },
  textLg: {
    fontSize: 15,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
  },
  textPrimary: {
    color: COLORS.textLight,
  },
  btnSecondary: {
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textSecondary: {
    color: COLORS.text,
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  textOutline: {
    color: COLORS.primary,
  },
  btnDanger: {
    backgroundColor: COLORS.danger,
  },
  textDanger: {
    color: COLORS.textLight,
  },
  btnGhost: {
    backgroundColor: "transparent",
  },
  textGhost: {
    color: COLORS.textSecondary,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  textDisabled: {
    color: COLORS.textMuted,
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  iconLeft: {
    marginRight: 6,
  },
  iconRight: {
    marginLeft: 6,
  },
});
