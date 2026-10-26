import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect } from "react";
import { View, StyleSheet, StatusBar, ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, TYPOGRAPHY } from "../../constants/theme";
import API from "../../services/api";

import FarmerHeader from "../../components/ui/FarmerHeader";
import CropContextBar from "../../components/ui/CropContextBar";
import FieldSelector from "../../components/farmer/FieldSelector";
import CropSelector from "../../components/farmer/CropSelector";
import RecordTypeSelector from "../../components/farmer/RecordTypeSelector";

import {
  MeasurementForm,
  IrrigationForm,
  TreatmentForm,
  DiseaseForm,
  HarvestForm,
  LifecycleForm,
  PhotoForm
} from "../../components/farmer/forms/QuickAddForms";

export default function FieldWorkScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Wizard States
  const [fieldId, setFieldId] = useState(params.fieldId || null);
  const [cropId, setCropId] = useState(params.cropId || null);
  const [recordType, setRecordType] = useState(params.type || null);
  
  // Context states
  const [lifecycleRecordId, setLifecycleRecordId] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);

  useEffect(() => {
    // If we select a crop, fetch its latest lifecycle to get the context
    const fetchContext = async () => {
      if (!cropId) return;
      try {
        setLoadingContext(true);
        const res = await API.get(`/lifecycle/${cropId}`);
        const records = res.data?.records || [];
        if (records.length > 0) {
          setLifecycleRecordId(records[0].id);
        }
      } catch (err) {
        console.log("Error fetching lifecycle context", err);
      } finally {
        setLoadingContext(false);
      }
    };
    fetchContext();
  }, [cropId]);

  const handleSuccess = (msg) => {
    // Subtle navigation back to the workspace without blocking alert
    router.replace(`/farmer/crop-details/${cropId}`);
  };

  const handleError = (err) => {
    if (!err.response && !err.status) {
      // Network error offline
      Alert.alert(
        "No connection",
        "Your information hasn't been submitted.",
        [{ text: "Try Again" }]
      );
    } else {
      Alert.alert(
        "Couldn't save this record.",
        err.response?.data?.message || err.message || "Your information is still here.",
        [{ text: "Try Again" }]
      );
    }
  };

  const handleBack = () => {
    if (recordType) {
      Alert.alert(
        "Discard changes?",
        "Your entered information will be lost.",
        [
          { text: "Keep Editing", style: "cancel" },
          { 
            text: "Discard", 
            style: "destructive", 
            onPress: () => setRecordType(null)
          }
        ]
      );
    } else if (cropId) {
      setCropId(null);
    } else if (fieldId) {
      setFieldId(null);
    } else {
      router.back();
    }
  };

  // Progress UI
  const renderProgress = () => {
    const steps = [
      { label: "Field", active: true },
      { label: "Crop", active: !!fieldId },
      { label: "Activity", active: !!cropId },
      { label: "Record", active: !!recordType }
    ];

    return (
      <View style={styles.progressContainer}>
        {steps.map((step, index) => (
          <View key={step.label} style={styles.progressStepRow}>
            <View style={styles.progressNodeWrapper}>
              <View style={[styles.progressNode, step.active && styles.progressNodeActive]} />
              <Text style={[styles.progressLabel, step.active && styles.progressLabelActive]}>{step.label}</Text>
            </View>
            {index < steps.length - 1 && (
              <View style={[styles.progressLine, steps[index + 1].active && styles.progressLineActive]} />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderContent = () => {
    if (!fieldId) {
      return <FieldSelector onSelect={(f) => setFieldId(f.id)} />;
    }
    
    if (!cropId) {
      return <CropSelector fieldId={fieldId} onSelect={(c) => setCropId(c.id)} />;
    }
    
    if (!recordType) {
      return (
        <View style={{ flex: 1 }}>
          <CropContextBar cropId={cropId} />
          <RecordTypeSelector onSelect={setRecordType} />
        </View>
      );
    }

    if (loadingContext && recordType !== "lifecycle") {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading crop context...</Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.scrollForm} keyboardShouldPersistTaps="handled">
        <CropContextBar cropId={cropId} />
        <View style={styles.formWrapper}>
          {recordType === "lifecycle" && <LifecycleForm cropId={cropId} onSuccess={handleSuccess} onError={handleError} />}
          {recordType === "measurement" && <MeasurementForm cropId={cropId} lifecycleRecordId={lifecycleRecordId} onSuccess={handleSuccess} onError={handleError} />}
          {recordType === "irrigation" && <IrrigationForm cropId={cropId} lifecycleRecordId={lifecycleRecordId} onSuccess={handleSuccess} onError={handleError} />}
          {recordType === "treatment" && <TreatmentForm cropId={cropId} lifecycleRecordId={lifecycleRecordId} onSuccess={handleSuccess} onError={handleError} />}
          {recordType === "disease" && <DiseaseForm cropId={cropId} lifecycleRecordId={lifecycleRecordId} onSuccess={handleSuccess} onError={handleError} />}
          {recordType === "harvest" && <HarvestForm cropId={cropId} lifecycleRecordId={lifecycleRecordId} onSuccess={handleSuccess} onError={handleError} />}
          {recordType === "photo" && <PhotoForm cropId={cropId} lifecycleRecordId={lifecycleRecordId} onSuccess={handleSuccess} onError={handleError} />}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <FarmerHeader
        title="Field Work"
        showBack={true}
        onBack={handleBack}
        compact
      />
      {renderProgress()}
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {renderContent()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
  },
  scrollForm: {
    paddingBottom: SPACING.xxl,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },
  formWrapper: {
    marginTop: SPACING.md,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingHorizontal: SPACING.lg,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },
  progressStepRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressNodeWrapper: {
    alignItems: "center",
  },
  progressNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
    marginBottom: 4,
  },
  progressNodeActive: {
    backgroundColor: COLORS.primary,
  },
  progressLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  progressLabelActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  progressLine: {
    width: 30,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
    marginBottom: 14,
  },
  progressLineActive: {
    backgroundColor: COLORS.primary,
  }
});
