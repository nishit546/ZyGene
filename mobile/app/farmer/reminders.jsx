import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from "../../constants/theme";
import FarmerHeader from "../../components/ui/FarmerHeader";
import AppDatePicker from "../../components/ui/AppDatePicker";
import {
  getSavedReminders,
  scheduleFarmReminder,
  toggleReminderCompleted,
  deleteFarmReminder,
  REMINDER_CATEGORIES,
  requestNotificationPermissions,
} from "../../services/notificationService";

export default function RemindersScreen() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("irrigation");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("08:00");
  const [targetDateStr, setTargetDateStr] = useState("");
  const [saving, setSaving] = useState(false);

  const loadReminders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSavedReminders();
      setReminders(data);
    } catch (err) {
      console.log("[reminders] load error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleOpenAdd = async () => {
    await requestNotificationPermissions();
    // Default target date: tomorrow at 08:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const day = String(tomorrow.getDate()).padStart(2, "0");
    const hours = String(tomorrow.getHours()).padStart(2, "0");
    const mins = String(tomorrow.getMinutes()).padStart(2, "0");

    setReminderDate(`${year}-${month}-${day}`);
    setReminderTime(`${hours}:${mins}`);
    setTargetDateStr(`${year}-${month}-${day} ${hours}:${mins}`);
    setTitle("");
    setBody("");
    setCategory("irrigation");
    setModalVisible(true);
  };

  const handleSaveReminder = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a reminder title.");
      return;
    }

    const effectiveDateStr = reminderDate ? `${reminderDate} ${reminderTime || "08:00"}` : targetDateStr;
    let parsedDate = new Date(effectiveDateStr.replace(" ", "T"));
    if (isNaN(parsedDate.getTime())) {
      parsedDate = new Date(Date.now() + 3600 * 1000 * 24); // default 24h
    }

    try {
      setSaving(true);
      const res = await scheduleFarmReminder({
        title: title.trim(),
        body: body.trim(),
        category,
        triggerDate: parsedDate,
      });

      if (res.success) {
        Alert.alert("Reminder Scheduled", `Reminder "${title}" scheduled for ${parsedDate.toLocaleString()}.`);
        setModalVisible(false);
        await loadReminders();
      } else {
        Alert.alert("Notice", res.error || "Failed to schedule reminder.");
      }
    } catch (err) {
      Alert.alert("Error", "Could not save reminder.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id) => {
    const updated = await toggleReminderCompleted(id);
    setReminders(updated);
  };

  const handleDelete = (id, reminderTitle) => {
    Alert.alert("Delete Reminder?", `Are you sure you want to delete "${reminderTitle}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteFarmReminder(id);
          await loadReminders();
        },
      },
    ]);
  };

  const formatReminderDate = (dateStr) => {
    if (!dateStr) return "--";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getCategoryInfo = (catId) => {
    return REMINDER_CATEGORIES.find((c) => c.id === catId) || REMINDER_CATEGORIES[0];
  };

  const pendingReminders = reminders.filter((r) => !r.completed);
  const completedReminders = reminders.filter((r) => r.completed);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FarmerHeader
        title="Farm Reminders"
        showBack={true}
        onBackPress={() => router.back()}
        rightIcon="add"
        onRightPress={handleOpenAdd}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* TOP SUMMARY */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryNum}>{pendingReminders.length}</Text>
            <Text style={styles.summaryLabel}>Upcoming</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={[styles.summaryNum, { color: COLORS.primary }]}>
              {completedReminders.length}
            </Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
        </View>

        {/* UPCOMING REMINDERS */}
        <Text style={styles.sectionTitle}>Upcoming Activities</Text>
        {pendingReminders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-outline" size={36} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No upcoming reminders</Text>
            <Text style={styles.emptySubtitle}>
              Schedule irrigation, fertilizer, treatment, or harvest checks to receive alerts.
            </Text>
            <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
              <Text style={styles.addBtnText}>+ Schedule Reminder</Text>
            </TouchableOpacity>
          </View>
        ) : (
          pendingReminders.map((item) => {
            const cat = getCategoryInfo(item.category);
            return (
              <View key={item.id} style={styles.reminderCard}>
                <TouchableOpacity
                  style={styles.checkCircle}
                  onPress={() => handleToggle(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="ellipse-outline" size={24} color={COLORS.primary} />
                </TouchableOpacity>

                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.reminderTitle}>{item.title}</Text>
                    <View style={styles.categoryBadge}>
                      <Ionicons name={cat.icon} size={11} color={COLORS.primary} />
                      <Text style={styles.categoryBadgeText}>{cat.label}</Text>
                    </View>
                  </View>

                  {item.body ? <Text style={styles.reminderBody}>{item.body}</Text> : null}

                  <View style={styles.dateRow}>
                    <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
                    <Text style={styles.dateText}>{formatReminderDate(item.triggerDate)}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.title)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.textTertiary} />
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* COMPLETED SECTION */}
        {completedReminders.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Completed</Text>
            {completedReminders.map((item) => (
              <View key={item.id} style={[styles.reminderCard, styles.reminderCardDone]}>
                <TouchableOpacity
                  style={styles.checkCircle}
                  onPress={() => handleToggle(item.id)}
                >
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                </TouchableOpacity>

                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={[styles.reminderTitle, styles.reminderTitleDone]}>
                    {item.title}
                  </Text>
                  <Text style={styles.dateText}>Done · {formatReminderDate(item.triggerDate)}</Text>
                </View>

                <TouchableOpacity onPress={() => handleDelete(item.id, item.title)}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* CREATE REMINDER MODAL */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Farm Reminder</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Activity Category</Text>
              <View style={styles.catGrid}>
                {REMINDER_CATEGORIES.map((c) => {
                  const selected = category === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.catChip, selected && styles.catChipActive]}
                      onPress={() => setCategory(c.id)}
                    >
                      <Ionicons
                        name={c.icon}
                        size={14}
                        color={selected ? "#FFFFFF" : COLORS.primary}
                      />
                      <Text style={[styles.catChipText, selected && styles.catChipTextActive]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Drip Irrigation for North Plot"
                placeholderTextColor="#64748B"
                cursorColor="#1B5E20"
                value={title}
                onChangeText={setTitle}
              />

              <AppDatePicker
                label="Reminder Date"
                placeholder="Select date"
                value={reminderDate}
                onChange={setReminderDate}
                minDate={new Date()}
              />

              <Text style={styles.inputLabel}>Time (HH:MM)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="08:00"
                placeholderTextColor="#64748B"
                cursorColor="#1B5E20"
                value={reminderTime}
                onChangeText={setReminderTime}
              />

              <Text style={styles.inputLabel}>Notes / Instructions</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                placeholder="Dosage, check valves, inspect soil moisture..."
                placeholderTextColor="#64748B"
                cursorColor="#1B5E20"
                value={body}
                onChangeText={setBody}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSaveReminder}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? "Scheduling..." : "Save Reminder"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background || "#F9FBF7",
  },
  scrollContainer: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  summaryBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  summaryCol: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  summaryNum: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: "center",
    ...SHADOWS.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
    maxWidth: 280,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  reminderCardDone: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    opacity: 0.75,
  },
  checkCircle: {
    padding: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
    marginRight: 6,
  },
  reminderTitleDone: {
    textDecorationLine: "line-through",
    color: COLORS.textSecondary,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.primary,
  },
  reminderBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: 20,
    maxHeight: "85%",
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 6,
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  catChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  catChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14.5,
    fontWeight: "500",
    color: "#0F172A",
  },
  notesInput: {
    height: 70,
    textAlignVertical: "top",
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
