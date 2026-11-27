import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import API from "../../../../../services/api";
import SyncStatus from "../../../../../components/SyncStatus";
import useNetworkStatus from "../../../../../hooks/useNetworkStatus";
import {
  cacheActivities,
  getCachedActivities,
  generateLocalId,
} from "../../../../../services/offlineStorage";
import {
  enqueueOperation,
  subscribeSyncEvents,
} from "../../../../../services/syncService";
import { getCurrentUserId } from "../../../../../services/auth";
import { COLORS } from "../../../../../constants/theme";

const TREATMENT_TYPES = [
  { value: "fertilizer", label: "Fertilizer" },
  { value: "pesticide", label: "Pesticide" },
  { value: "fungicide", label: "Fungicide" },
  { value: "herbicide", label: "Herbicide" },
  { value: "other", label: "Other" },
];

export default function Treatments() {
  const { id, recordId } = useLocalSearchParams();

  const [treatments, setTreatments] = useState([]);
  const [treatmentType, setTreatmentType] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("");
  const [applicationMethod, setApplicationMethod] = useState("");
  const [applicationDate, setApplicationDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState(null);

  const { isOnline } = useNetworkStatus(() => {
    loadTreatments();
  });

  const loadTreatments = useCallback(async () => {
    try {
      setLoading(true);
      const uid = await getCurrentUserId();
      setUserId(uid);

      if (isOnline && !String(recordId).startsWith("loc_")) {
        try {
          const response = await API.get(`/treatments/${recordId}`);
          const fetched = response.data?.treatments || [];
          setTreatments(fetched);
          await cacheActivities(uid, recordId, "treatment", fetched);
          return;
        } catch (apiErr) {
          console.log("[treatments] API fetch failed, loading SQLite cache:", apiErr.message);
        }
      }

      // Offline or fallback: load from SQLite
      const cached = await getCachedActivities(recordId, "treatment");
      setTreatments(cached);
    } catch (error) {
      console.log("TREATMENTS ERROR:", error.message);
      const cached = await getCachedActivities(recordId, "treatment");
      setTreatments(cached);
    } finally {
      setLoading(false);
    }
  }, [recordId, isOnline]);

  useEffect(() => {
    if (recordId) {
      loadTreatments();
    }

    const unsubscribe = subscribeSyncEvents((event) => {
      if (event.type === "ITEM_SYNCED" || event.type === "SYNC_COMPLETE") {
        loadTreatments();
      }
    });
    return () => unsubscribe();
  }, [recordId, loadTreatments]);

  const handleCreateTreatment = async () => {
    if (!treatmentType) {
      Alert.alert("Missing Information", "Please select a treatment type.");
      return;
    }

    if (!applicationDate.trim()) {
      Alert.alert("Missing Information", "Please enter the application date.");
      return;
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(applicationDate.trim())) {
      Alert.alert("Invalid Date", "Please use YYYY-MM-DD format.");
      return;
    }

    if (quantity.trim() && isNaN(Number(quantity))) {
      Alert.alert("Invalid Quantity", "Quantity must be a valid number.");
      return;
    }

    const payload = {
      lifecycle_record_id: Number(recordId) || recordId,
      treatment_type: treatmentType,
      product_name: productName.trim() || null,
      quantity: quantity.trim() ? Number(quantity) : null,
      quantity_unit: quantityUnit.trim() || null,
      application_method: applicationMethod.trim() || null,
      application_date: applicationDate.trim(),
      notes: notes.trim() || null,
    };

    try {
      setCreating(true);
      const uid = userId || (await getCurrentUserId());

      // If offline or parent record is local: save offline and enqueue
      if (!isOnline || String(recordId).startsWith("loc_")) {
        const localId = generateLocalId("treat");
        await enqueueOperation({
          userId: uid,
          recordType: "treatment",
          operationType: "create",
          localRecordId: localId,
          parentLocalId: String(recordId).startsWith("loc_") ? String(recordId) : null,
          parentServerId: !String(recordId).startsWith("loc_") ? Number(recordId) : null,
          endpoint: "/treatments",
          httpMethod: "POST",
          payload,
        });

        Alert.alert(
          "Saved on this device",
          "Treatment record saved locally. It will sync automatically when you are back online."
        );

        setTreatmentType("");
        setProductName("");
        setQuantity("");
        setQuantityUnit("");
        setApplicationMethod("");
        setApplicationDate("");
        setNotes("");

        const cached = await getCachedActivities(recordId, "treatment");
        setTreatments(cached);
        return;
      }

      // Online: send request
      try {
        const response = await API.post("/treatments", payload);
        Alert.alert("Success", "Treatment record created successfully.");

        setTreatmentType("");
        setProductName("");
        setQuantity("");
        setQuantityUnit("");
        setApplicationMethod("");
        setApplicationDate("");
        setNotes("");

        if (response.data?.treatment) {
          await cacheActivities(uid, recordId, "treatment", [response.data.treatment]);
        }
        await loadTreatments();
      } catch (reqError) {
        if (!reqError.response) {
          // Connection lost: save offline
          const localId = generateLocalId("treat");
          await enqueueOperation({
            userId: uid,
            recordType: "treatment",
            operationType: "create",
            localRecordId: localId,
            parentLocalId: String(recordId).startsWith("loc_") ? String(recordId) : null,
            parentServerId: !String(recordId).startsWith("loc_") ? Number(recordId) : null,
            endpoint: "/treatments",
            httpMethod: "POST",
            payload,
          });

          Alert.alert(
            "Saved on this device",
            "Connection interrupted. Saved locally and queued for automatic sync."
          );

          setTreatmentType("");
          setProductName("");
          setQuantity("");
          setQuantityUnit("");
          setApplicationMethod("");
          setApplicationDate("");
          setNotes("");

          const cached = await getCachedActivities(recordId, "treatment");
          setTreatments(cached);
        } else {
          Alert.alert("Error", reqError.response?.data?.message || "Failed to create treatment record.");
        }
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary || "#2E7D32"} />
        <Text style={styles.loadingText}>Loading treatments...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SyncStatus status={isOnline ? "online" : "offline"} showBanner={true} />

      <Text style={[styles.title, { marginTop: 12 }]}>Treatments</Text>
      <Text style={styles.subtitle}>Crop ID: {id}</Text>
      <Text style={styles.subtitle}>Lifecycle Record: {recordId}</Text>

      {/* Existing Treatments */}
      <Text style={styles.sectionTitle}>Recorded Treatments</Text>

      {treatments.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No treatment records yet.</Text>
        </View>
      ) : (
        treatments.map((treatment) => (
          <View key={treatment.id || treatment.local_id} style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.type}>
                {TREATMENT_TYPES.find((t) => t.value === treatment.treatment_type)?.label ||
                  treatment.treatment_type}
              </Text>
              {treatment.sync_status === "pending" && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending Sync</Text>
                </View>
              )}
              {treatment.sync_status === "failed" && (
                <View style={styles.failedBadge}>
                  <Text style={styles.failedBadgeText}>Sync Failed</Text>
                </View>
              )}
            </View>

            {treatment.product_name && (
              <Text style={styles.product}>Product: {treatment.product_name}</Text>
            )}

            {treatment.quantity && (
              <Text style={styles.info}>
                Quantity: {treatment.quantity} {treatment.quantity_unit || ""}
              </Text>
            )}

            {treatment.application_method && (
              <Text style={styles.info}>Method: {treatment.application_method}</Text>
            )}

            <Text style={styles.info}>Date: {treatment.application_date}</Text>

            {treatment.notes && (
              <Text style={styles.notes}>Notes: {treatment.notes}</Text>
            )}
          </View>
        ))
      )}

      {/* Add Treatment Form */}
      <Text style={styles.sectionTitle}>Add Treatment Record</Text>

      <Text style={styles.label}>Treatment Type *</Text>
      <View style={styles.typeContainer}>
        {TREATMENT_TYPES.map((item) => {
          const selected = treatmentType === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              style={[styles.typeOption, selected && styles.selectedType]}
              onPress={() => setTreatmentType(item.value)}
            >
              <Text style={[styles.typeOptionText, selected && styles.selectedTypeText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Product Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Urea or Neem Oil"
        value={productName}
        onChangeText={setProductName}
      />

      <Text style={styles.label}>Quantity</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 50"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Quantity Unit</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. kg or liters"
        value={quantityUnit}
        onChangeText={setQuantityUnit}
      />

      <Text style={styles.label}>Application Method</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Foliar spray, soil application"
        value={applicationMethod}
        onChangeText={setApplicationMethod}
      />

      <Text style={styles.label}>Application Date *</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={applicationDate}
        onChangeText={setApplicationDate}
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="Additional treatment details..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={[styles.button, creating && styles.buttonDisabled]}
        onPress={handleCreateTreatment}
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {!isOnline ? "Save on Device" : "Add Treatment Record"}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 12,
    color: "#1F2937",
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  emptyText: {
    color: "#777",
  },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  type: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#6A1B9A",
  },
  product: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 3,
  },
  info: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 3,
  },
  notes: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },
  pendingBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E65100",
  },
  failedBadge: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  failedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D32F2F",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 12,
    marginBottom: 6,
  },
  typeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  typeOption: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  selectedType: {
    backgroundColor: "#6A1B9A",
    borderColor: "#6A1B9A",
  },
  typeOptionText: {
    fontSize: 13,
    color: "#374151",
  },
  selectedTypeText: {
    color: "#fff",
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#FFFFFF",
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: COLORS.primary || "#2E7D32",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
