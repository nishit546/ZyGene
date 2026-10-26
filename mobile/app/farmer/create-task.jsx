import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS } from "../../constants/theme";
import FarmerHeader from "../../components/ui/FarmerHeader";
import API from "../../services/api";

const CATEGORIES = [
  { id: "general", label: "General", icon: "checkbox-outline" },
  { id: "irrigation", label: "Irrigation", icon: "water-outline" },
  { id: "treatment", label: "Treatment", icon: "shield-checkmark-outline" },
  { id: "fertilizer", label: "Fertilizer", icon: "nutrition-outline" },
  { id: "scouting", label: "Scouting", icon: "search-outline" },
  { id: "harvest", label: "Harvest", icon: "cube-outline" },
];

const PRIORITIES = [
  { id: "low", label: "Low", color: "#64748B" },
  { id: "medium", label: "Medium", color: "#D97706" },
  { id: "high", label: "High", color: "#EA580C" },
  { id: "urgent", label: "Urgent", color: "#DC2626" },
];

export default function CreateTaskScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");

  const [fieldId, setFieldId] = useState(params.field_id ? String(params.field_id) : "");
  const [cropId, setCropId] = useState(params.crop_id ? String(params.crop_id) : "");

  const [fields, setFields] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fieldsRes, cropsRes] = await Promise.all([
          API.get("/fields"),
          API.get("/crops"),
        ]);
        if (fieldsRes.data?.fields) setFields(fieldsRes.data.fields);
        if (cropsRes.data?.crops) setCrops(cropsRes.data.crops);
      } catch (err) {
        console.log("Error loading fields/crops for task:", err);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchData();
  }, []);

  const setPresetDate = (daysFromNow) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    setDueDate(target.toISOString().split("T")[0]);
  };

  const availableCrops = fieldId
    ? crops.filter((c) => String(c.field_id) === String(fieldId))
    : crops;

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Title Required", "Please enter a title for this farm task.");
      return;
    }

    try {
      setSubmitting(true);
      await API.post("/tasks", {
        title: title.trim(),
        description: description.trim() || null,
        category,
        priority,
        due_date: dueDate || null,
        field_id: fieldId ? parseInt(fieldId, 10) : null,
        crop_id: cropId ? parseInt(cropId, 10) : null,
      });

      router.replace("/farmer/tasks");
    } catch (err) {
      console.log("Error creating task:", err);
      Alert.alert("Error", err.response?.data?.message || "Failed to create task.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <FarmerHeader
        title="Create Farm Task"
        subtitle="Schedule new activity"
        showBack={true}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loadingInitial ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : (
            <>
              {/* TASK TITLE */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Task Title <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Apply Organic Neem Spray"
                  placeholderTextColor={COLORS.textMuted}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={120}
                />
              </View>

              {/* DESCRIPTION */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description & Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Add specific instructions, target zones, or materials required..."
                  placeholderTextColor={COLORS.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* CATEGORY PICKER */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.chipGrid}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => setCategory(cat.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={cat.icon}
                          size={15}
                          color={isSelected ? COLORS.surface : COLORS.textSecondary}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* PRIORITY PICKER */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Priority Level</Text>
                <View style={styles.priorityRow}>
                  {PRIORITIES.map((p) => {
                    const isSelected = priority === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.priorityPill,
                          isSelected && { backgroundColor: p.color, borderColor: p.color },
                        ]}
                        onPress={() => setPriority(p.id)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.priorityPillText,
                            isSelected && { color: COLORS.surface, fontWeight: "700" },
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* DUE DATE */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 2026-10-30"
                  placeholderTextColor={COLORS.textMuted}
                  value={dueDate}
                  onChangeText={setDueDate}
                />
                <View style={styles.datePresetsRow}>
                  <TouchableOpacity
                    style={styles.datePresetBtn}
                    onPress={() => setPresetDate(0)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.datePresetText}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.datePresetBtn}
                    onPress={() => setPresetDate(1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.datePresetText}>Tomorrow</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.datePresetBtn}
                    onPress={() => setPresetDate(3)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.datePresetText}>In 3 Days</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.datePresetBtn}
                    onPress={() => setPresetDate(7)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.datePresetText}>In 1 Week</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* FIELD SELECTION */}
              {fields.length > 0 && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Link Field (Optional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contextScroll}>
                    <TouchableOpacity
                      style={[styles.contextChip, !fieldId && styles.contextChipActive]}
                      onPress={() => {
                        setFieldId("");
                        setCropId("");
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.contextChipText, !fieldId && styles.contextChipTextActive]}>
                        None
                      </Text>
                    </TouchableOpacity>
                    {fields.map((f) => {
                      const isSelected = String(fieldId) === String(f.id);
                      return (
                        <TouchableOpacity
                          key={f.id}
                          style={[styles.contextChip, isSelected && styles.contextChipActive]}
                          onPress={() => {
                            setFieldId(String(f.id));
                            setCropId("");
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="map-outline"
                            size={13}
                            color={isSelected ? COLORS.surface : COLORS.textSecondary}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={[styles.contextChipText, isSelected && styles.contextChipTextActive]}>
                            {f.field_name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* CROP SELECTION */}
              {availableCrops.length > 0 && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Link Crop (Optional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contextScroll}>
                    <TouchableOpacity
                      style={[styles.contextChip, !cropId && styles.contextChipActive]}
                      onPress={() => setCropId("")}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.contextChipText, !cropId && styles.contextChipTextActive]}>
                        None
                      </Text>
                    </TouchableOpacity>
                    {availableCrops.map((c) => {
                      const isSelected = String(cropId) === String(c.id);
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.contextChip, isSelected && styles.contextChipActive]}
                          onPress={() => setCropId(String(c.id))}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="leaf-outline"
                            size={13}
                            color={isSelected ? COLORS.surface : COLORS.textSecondary}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={[styles.contextChipText, isSelected && styles.contextChipTextActive]}>
                            {c.crop_name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* ACTION BUTTONS */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => router.back()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={COLORS.surface} />
                  ) : (
                    <Text style={styles.submitButtonText}>Create Task</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
  },
  required: {
    color: COLORS.danger,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 70,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.surface,
    fontWeight: "700",
  },
  priorityRow: {
    flexDirection: "row",
    gap: 8,
  },
  priorityPill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priorityPillText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  datePresetsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  datePresetBtn: {
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  datePresetText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: COLORS.primary,
  },
  contextScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  contextChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  contextChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  contextChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  contextChipTextActive: {
    color: COLORS.surface,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  submitButton: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.surface,
  },
});
