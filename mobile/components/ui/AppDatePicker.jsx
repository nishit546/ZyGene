import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../constants/theme";

// Try importing native datetimepicker conditionally
let RNDateTimePicker = null;
try {
  RNDateTimePicker = require("@react-native-community/datetimepicker").default;
} catch (e) {
  // Fall back to built-in calendar modal
}

/**
 * Format Date or YYYY-MM-DD string into readable "DD Mon YYYY"
 */
export function formatReadableDate(dateInput) {
  if (!dateInput) return "";
  try {
    let d;
    if (typeof dateInput === "string") {
      const parts = dateInput.split("-");
      if (parts.length === 3) {
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        d = new Date(dateInput);
      }
    } else {
      d = new Date(dateInput);
    }
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, "0");
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Format Date to ISO string YYYY-MM-DD
 */
export function toIsoDate(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Universal Native & Web Calendar DatePicker for ZyGENE
 */
export default function AppDatePicker({
  label,
  value,
  onChange,
  placeholder = "Select date",
  isRequired = false,
  error,
  helper,
  minDate,
  maxDate,
  containerStyle,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [showNativePicker, setShowNativePicker] = useState(false);

  // Parse current value into a Date object
  const currentDate = useMemo(() => {
    if (!value) return new Date();
    if (typeof value === "string") {
      const parts = value.split("-");
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [value]);

  // Calendar modal state (viewing month/year)
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth()); // 0-11

  // Min / Max Date objects
  const minDateObj = useMemo(() => {
    if (!minDate) return null;
    return typeof minDate === "string" ? new Date(minDate) : minDate;
  }, [minDate]);

  const maxDateObj = useMemo(() => {
    if (!maxDate) return null;
    return typeof maxDate === "string" ? new Date(maxDate) : maxDate;
  }, [maxDate]);

  const handleOpen = () => {
    setViewYear(currentDate.getFullYear());
    setViewMonth(currentDate.getMonth());

    if (Platform.OS !== "web" && RNDateTimePicker) {
      setShowNativePicker(true);
    } else {
      setModalVisible(true);
    }
  };

  const handleNativeChange = (event, selectedDate) => {
    setShowNativePicker(false);
    if (event.type === "set" && selectedDate) {
      const iso = toIsoDate(selectedDate);
      if (onChange) onChange(iso);
    }
  };

  const handleSelectDay = (day) => {
    const selected = new Date(viewYear, viewMonth, day);
    const iso = toIsoDate(selected);
    if (onChange) onChange(iso);
    setModalVisible(false);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleQuickSelectToday = () => {
    const today = new Date();
    const iso = toIsoDate(today);
    if (onChange) onChange(iso);
    setModalVisible(false);
  };

  const handleClear = () => {
    if (onChange) onChange("");
    setModalVisible(false);
  };

  // Calendar Grid calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days = [];

    // Empty cells before the first day of month (Monday start preferred in agriculture)
    // Adjust: 0(Sun)->6, 1(Mon)->0, 2(Tue)->1, etc.
    const offset = (firstDayIndex + 6) % 7;
    for (let i = 0; i < offset; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [viewYear, viewMonth]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const readableValue = formatReadableDate(value);

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

      {/* Main Clickable Trigger Field */}
      <TouchableOpacity
        style={[
          styles.inputBox,
          error && styles.inputBoxError,
          Boolean(value) && styles.inputBoxFilled,
        ]}
        onPress={handleOpen}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${label || "Date"}: ${readableValue || placeholder}`}
      >
        <View style={styles.iconBox}>
          <Ionicons name="calendar" size={18} color={COLORS.primary || "#1B5E20"} />
        </View>

        <Text
          style={[
            styles.valueText,
            !value && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {readableValue || placeholder}
        </Text>

        {value ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={(e) => {
              e.stopPropagation();
              if (onChange) onChange("");
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Clear date"
          >
            <Ionicons name="close-circle" size={17} color="#94A3B8" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={16} color="#94A3B8" />
        )}
      </TouchableOpacity>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helperText}>{helper}</Text>
      ) : null}

      {/* Native DateTimePicker for Android / iOS */}
      {showNativePicker && RNDateTimePicker && (
        <RNDateTimePicker
          value={currentDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleNativeChange}
          minimumDate={minDateObj || undefined}
          maximumDate={maxDateObj || undefined}
        />
      )}

      {/* Clean Interactive Modal Calendar (Web & In-App) */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.calendarCard} onStartShouldSetResponder={() => true}>
            {/* Header: Month & Year with Navigation */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.navArrow}
                onPress={handlePrevMonth}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-back" size={20} color="#0F172A" />
              </TouchableOpacity>

              <Text style={styles.monthYearTitle}>
                {months[viewMonth]} {viewYear}
              </Text>

              <TouchableOpacity
                style={styles.navArrow}
                onPress={handleNextMonth}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-forward" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Weekday Labels (Mon - Sun) */}
            <View style={styles.weekdayRow}>
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((dayName, idx) => (
                <Text key={idx} style={styles.weekdayLabel}>
                  {dayName}
                </Text>
              ))}
            </View>

            {/* Calendar Days Grid */}
            <View style={styles.daysGrid}>
              {calendarDays.map((day, idx) => {
                if (!day) {
                  return <View key={`empty-${idx}`} style={styles.dayCellEmpty} />;
                }

                const dayDate = new Date(viewYear, viewMonth, day);
                const isSelected =
                  value &&
                  currentDate.getFullYear() === viewYear &&
                  currentDate.getMonth() === viewMonth &&
                  currentDate.getDate() === day;

                const today = new Date();
                const isToday =
                  today.getFullYear() === viewYear &&
                  today.getMonth() === viewMonth &&
                  today.getDate() === day;

                const isDisabled =
                  (minDateObj && dayDate < new Date(minDateObj.setHours(0, 0, 0, 0))) ||
                  (maxDateObj && dayDate > new Date(maxDateObj.setHours(23, 59, 59, 999)));

                return (
                  <TouchableOpacity
                    key={`day-${day}`}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      isToday && !isSelected && styles.dayCellToday,
                      isDisabled && styles.dayCellDisabled,
                    ]}
                    disabled={isDisabled}
                    onPress={() => handleSelectDay(day)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isToday && !isSelected && styles.dayTextToday,
                        isDisabled && styles.dayTextDisabled,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Action Footer */}
            <View style={styles.calendarFooter}>
              <TouchableOpacity
                style={styles.footerActionBtn}
                onPress={handleQuickSelectToday}
              >
                <Text style={styles.todayBtnText}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.footerActionBtn}
                onPress={handleClear}
              >
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.footerActionBtn, styles.doneBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.doneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    color: COLORS.danger || "#DC2626",
    fontSize: 14,
    fontWeight: "700",
  },
  inputBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: COLORS.border || "#E2E8E2",
    borderRadius: RADIUS.md || 10,
    paddingHorizontal: SPACING.md,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    ...Platform.select({
      web: {
        transition: "all 0.2s ease-in-out",
        cursor: "pointer",
      },
      default: {
        ...SHADOWS.subtle,
      },
    }),
  },
  inputBoxFilled: {
    borderColor: COLORS.primaryLight ? "#A5D6A7" : "#CBD5CB",
  },
  inputBoxError: {
    borderColor: COLORS.danger || "#DC2626",
    backgroundColor: "#FFF8F8",
  },
  iconBox: {
    width: 28,
    alignItems: "flex-start",
  },
  valueText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  placeholderText: {
    color: "#64748B",
    fontWeight: "400",
  },
  clearBtn: {
    padding: 4,
    marginRight: 2,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger || "#DC2626",
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },

  /* Calendar Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  calendarCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      },
    }),
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  navArrow: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  monthYearTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 6,
  },
  weekdayLabel: {
    width: 38,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 3,
  },
  dayCellEmpty: {
    width: 38,
    height: 38,
    marginVertical: 3,
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary || "#1B5E20",
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: COLORS.primary || "#1B5E20",
  },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dayTextToday: {
    color: COLORS.primary || "#1B5E20",
    fontWeight: "700",
  },
  dayTextDisabled: {
    color: "#94A3B8",
  },
  calendarFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  footerActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  todayBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary || "#1B5E20",
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  doneBtn: {
    backgroundColor: "#F1F5F9",
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
});
