import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppInput from "../../ui/AppInput";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "../../../constants/theme";
import API from "../../../services/api";

const ActionButton = ({ title, onPress, loading }) => (
  <TouchableOpacity
    style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={title}
  >
    <Text style={styles.saveBtnText}>{loading ? "Saving..." : title}</Text>
  </TouchableOpacity>
);

// ==========================
// MEASUREMENT FORM
// ==========================
export function MeasurementForm({ cropId, lifecycleRecordId, onSuccess, onError }) {
  const [type, setType] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!type.trim() || !value.trim()) {
      return Alert.alert("Validation", "Measurement type and value are required.");
    }
    if (isNaN(Number(value))) {
      return Alert.alert("Validation", "Value must be a valid number.");
    }
    if (!lifecycleRecordId) {
      return Alert.alert("Error", "No lifecycle context found. Please add a lifecycle record first.");
    }

    try {
      setLoading(true);
      const payload = {
        lifecycle_record_id: Number(lifecycleRecordId),
        measurement_type: type.trim(),
        measurement_value: Number(value),
        unit: unit.trim() || null,
        notes: notes.trim() || null,
      };
      await API.post("/measurements", payload);
      onSuccess("Measurement added");
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <AppInput label="Measurement Type" placeholder="e.g. Plant Height" value={type} onChangeText={setType} isRequired />
      <AppInput label="Value" placeholder="e.g. 95" value={value} onChangeText={setValue} keyboardType="numeric" isRequired />
      <AppInput label="Unit" placeholder="e.g. cm, kg" value={unit} onChangeText={setUnit} />
      <AppInput label="Notes" placeholder="Optional notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
      <ActionButton title="Save Measurement" onPress={handleSave} loading={loading} />
    </View>
  );
}

// ==========================
// IRRIGATION FORM
// ==========================
export function IrrigationForm({ cropId, lifecycleRecordId, onSuccess, onError }) {
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [method, setMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!quantity.trim() || !unit.trim()) {
      return Alert.alert("Validation", "Quantity and unit are required.");
    }
    if (isNaN(Number(quantity))) {
      return Alert.alert("Validation", "Quantity must be a valid number.");
    }
    if (!lifecycleRecordId) {
      return Alert.alert("Error", "No lifecycle context found. Please add a lifecycle record first.");
    }

    try {
      setLoading(true);
      const payload = {
        lifecycle_record_id: Number(lifecycleRecordId),
        water_quantity: Number(quantity),
        unit: unit.trim(),
        irrigation_method: method.trim() || null,
        notes: notes.trim() || null,
      };
      await API.post("/irrigation", payload);
      onSuccess("Irrigation added");
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <AppInput label="Amount / Quantity" placeholder="e.g. 50" value={quantity} onChangeText={setQuantity} keyboardType="numeric" isRequired />
      <AppInput label="Unit" placeholder="e.g. Liters, Gallons" value={unit} onChangeText={setUnit} isRequired />
      <AppInput label="Method" placeholder="e.g. Drip, Sprinkler" value={method} onChangeText={setMethod} />
      <AppInput label="Notes" placeholder="Optional notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
      <ActionButton title="Save Irrigation" onPress={handleSave} loading={loading} />
    </View>
  );
}

// ==========================
// TREATMENT FORM
// ==========================
export function TreatmentForm({ cropId, lifecycleRecordId, onSuccess, onError }) {
  const [treatmentType, setTreatmentType] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!treatmentType.trim() || !name.trim() || !quantity.trim() || !unit.trim()) {
      return Alert.alert("Validation", "Type, name, quantity, and unit are required.");
    }
    if (isNaN(Number(quantity))) {
      return Alert.alert("Validation", "Quantity must be a valid number.");
    }
    if (!lifecycleRecordId) {
      return Alert.alert("Error", "No lifecycle context found.");
    }

    try {
      setLoading(true);
      const payload = {
        lifecycle_record_id: Number(lifecycleRecordId),
        treatment_type: treatmentType.trim(),
        treatment_name: name.trim(),
        quantity: Number(quantity),
        unit: unit.trim(),
        notes: notes.trim() || null,
      };
      await API.post("/treatments", payload);
      onSuccess("Treatment added");
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <AppInput label="Treatment Type" placeholder="e.g. Fertilizer, Pesticide" value={treatmentType} onChangeText={setTreatmentType} isRequired />
      <AppInput label="Treatment Name" placeholder="e.g. Urea 46%" value={name} onChangeText={setName} isRequired />
      <AppInput label="Quantity" placeholder="e.g. 10" value={quantity} onChangeText={setQuantity} keyboardType="numeric" isRequired />
      <AppInput label="Unit" placeholder="e.g. kg/ha" value={unit} onChangeText={setUnit} isRequired />
      <AppInput label="Notes" placeholder="Optional notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
      <ActionButton title="Save Treatment" onPress={handleSave} loading={loading} />
    </View>
  );
}

// ==========================
// DISEASE PEST FORM
// ==========================
export function DiseaseForm({ cropId, lifecycleRecordId, onSuccess, onError }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [severity, setSeverity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !type.trim() || !severity.trim()) {
      return Alert.alert("Validation", "Name, type, and severity are required.");
    }
    if (!lifecycleRecordId) {
      return Alert.alert("Error", "No lifecycle context found.");
    }

    try {
      setLoading(true);
      const payload = {
        lifecycle_record_id: Number(lifecycleRecordId),
        name: name.trim(),
        type: type.trim(), // e.g. 'disease' or 'pest'
        severity: severity.trim(),
        notes: notes.trim() || null,
      };
      await API.post("/disease-pest", payload);
      onSuccess("Disease/Pest record added");
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <AppInput label="Observation Name" placeholder="e.g. Leaf Rust, Aphids" value={name} onChangeText={setName} isRequired />
      <AppInput label="Type (Disease or Pest)" placeholder="e.g. Disease" value={type} onChangeText={setType} isRequired />
      <AppInput label="Severity" placeholder="e.g. Low, Medium, High" value={severity} onChangeText={setSeverity} isRequired />
      <AppInput label="Notes" placeholder="Optional notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
      <ActionButton title="Save Observation" onPress={handleSave} loading={loading} />
    </View>
  );
}

// ==========================
// HARVEST FORM
// ==========================
export function HarvestForm({ cropId, lifecycleRecordId, onSuccess, onError }) {
  const [totalYield, setTotalYield] = useState("");
  const [yieldUnit, setYieldUnit] = useState("");
  const [areaHarvested, setAreaHarvested] = useState("");
  const [areaUnit, setAreaUnit] = useState("");
  const [qualityGrade, setQualityGrade] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!totalYield.trim() || !yieldUnit.trim()) {
      return Alert.alert("Validation", "Total yield and unit are required.");
    }
    if (isNaN(Number(totalYield)) || (areaHarvested && isNaN(Number(areaHarvested)))) {
      return Alert.alert("Validation", "Numeric values required for yield and area.");
    }
    if (!lifecycleRecordId) {
      return Alert.alert("Error", "No lifecycle context found.");
    }

    try {
      setLoading(true);
      const payload = {
        lifecycle_record_id: Number(lifecycleRecordId),
        total_yield: Number(totalYield),
        yield_unit: yieldUnit.trim(),
        area_harvested: areaHarvested ? Number(areaHarvested) : null,
        area_unit: areaUnit.trim() || null,
        quality_grade: qualityGrade.trim() || null,
        notes: notes.trim() || null,
      };
      await API.post("/harvest", payload);
      onSuccess("Harvest record added");
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <AppInput label="Total Yield" placeholder="e.g. 500" value={totalYield} onChangeText={setTotalYield} keyboardType="numeric" isRequired />
      <AppInput label="Yield Unit" placeholder="e.g. kg, tons" value={yieldUnit} onChangeText={setYieldUnit} isRequired />
      <AppInput label="Area Harvested" placeholder="e.g. 2.5" value={areaHarvested} onChangeText={setAreaHarvested} keyboardType="numeric" />
      <AppInput label="Area Unit" placeholder="e.g. ha, acres" value={areaUnit} onChangeText={setAreaUnit} />
      <AppInput label="Quality Grade" placeholder="e.g. Grade A, Premium" value={qualityGrade} onChangeText={setQualityGrade} />
      <AppInput label="Notes" placeholder="Optional notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
      <ActionButton title="Save Harvest" onPress={handleSave} loading={loading} />
    </View>
  );
}

// ==========================
// LIFECYCLE FORM
// ==========================
const LIFECYCLE_STAGES = [
  { value: "seed_sowing", label: "Seed Sowing" },
  { value: "germination", label: "Germination" },
  { value: "seedling", label: "Seedling" },
  { value: "vegetative", label: "Vegetative" },
  { value: "flowering", label: "Flowering" },
  { value: "fruiting", label: "Fruiting" },
  { value: "maturity", label: "Maturity" },
  { value: "harvest", label: "Harvest" },
];

export function LifecycleForm({ cropId, lifecycleRecordId, onSuccess, onError }) {
  const [stage, setStage] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!stage) {
      return Alert.alert("Validation", "Please select a lifecycle stage.");
    }
    try {
      setLoading(true);
      const payload = {
        crop_id: Number(cropId),
        stage_name: stage,
        notes: notes.trim() || null,
      };
      await API.post("/lifecycle", payload);
      onSuccess("Lifecycle updated");
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <Text style={styles.dropdownLabel}>New Stage *</Text>
      <View style={styles.pillsContainer}>
        {LIFECYCLE_STAGES.map((s) => (
          <TouchableOpacity
            key={s.value}
            style={[styles.pill, stage === s.value && styles.pillActive]}
            onPress={() => setStage(s.value)}
          >
            <Text style={[styles.pillText, stage === s.value && styles.pillTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <AppInput label="Notes" placeholder="Optional notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
      <ActionButton title="Save Lifecycle" onPress={handleSave} loading={loading} />
    </View>
  );
}

// ==========================
// PHOTO FORM (Simplified for Quick Add, typically uses device camera)
// ==========================
export function PhotoForm({ cropId, lifecycleRecordId, onSuccess, onError }) {
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!lifecycleRecordId) {
      return Alert.alert("Error", "No lifecycle context found.");
    }
    
    try {
      setLoading(true);
      const payload = {
        lifecycle_record_id: Number(lifecycleRecordId),
        image_url: "https://via.placeholder.com/400", // Using a placeholder since Camera is difficult to render here
        caption: caption.trim() || null,
        captured_at: new Date().toISOString().slice(0, 19).replace("T", " "),
      };
      await API.post("/photos", payload);
      onSuccess("Photo added");
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <View style={styles.photoPlaceholder}>
        <Ionicons name="camera-outline" size={48} color={COLORS.borderDark} />
        <Text style={styles.photoPlaceholderText}>Photo capture simulated</Text>
      </View>
      <AppInput label="Caption" placeholder="Optional caption" value={caption} onChangeText={setCaption} multiline numberOfLines={3} />
      <ActionButton title="Save Photo" onPress={handleSave} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    padding: SPACING.lg,
    paddingTop: 0,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: "700",
  },
  dropdownLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: SPACING.lg,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  pillTextActive: {
    color: COLORS.surface,
    fontWeight: "600",
  },
  photoPlaceholder: {
    height: 200,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  photoPlaceholderText: {
    marginTop: 8,
    color: COLORS.textSecondary,
  },
});
