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

export default function Measurements() {
  const { id, recordId } = useLocalSearchParams();

  const [measurements, setMeasurements] = useState([]);
  const [measurementType, setMeasurementType] = useState("");
  const [measurementValue, setMeasurementValue] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState(null);

  const { isOnline } = useNetworkStatus(() => {
    loadMeasurements();
  });

  const loadMeasurements = useCallback(async () => {
    try {
      setLoading(true);
      const uid = await getCurrentUserId();
      setUserId(uid);

      if (isOnline && !String(recordId).startsWith("loc_")) {
        try {
          const response = await API.get(`/measurements/${recordId}`);
          const fetched = response.data?.measurements || [];
          setMeasurements(fetched);
          await cacheActivities(uid, recordId, "measurement", fetched);
          return;
        } catch (apiErr) {
          console.log("[measurements] API fetch failed, falling back to local SQLite:", apiErr.message);
        }
      }

      // Offline or fallback: load from local SQLite
      const cached = await getCachedActivities(recordId, "measurement");
      setMeasurements(cached);
    } catch (error) {
      console.log("MEASUREMENTS ERROR:", error.message);
      const cached = await getCachedActivities(recordId, "measurement");
      setMeasurements(cached);
    } finally {
      setLoading(false);
    }
  }, [recordId, isOnline]);

  useEffect(() => {
    if (recordId) {
      loadMeasurements();
    }

    const unsubscribe = subscribeSyncEvents((event) => {
      if (event.type === "ITEM_SYNCED" || event.type === "SYNC_COMPLETE") {
        loadMeasurements();
      }
    });
    return () => unsubscribe();
  }, [recordId, loadMeasurements]);

  const handleCreateMeasurement = async () => {
    if (!measurementType.trim()) {
      Alert.alert("Missing Information", "Please enter a measurement type.");
      return;
    }

    if (!measurementValue.trim()) {
      Alert.alert("Missing Information", "Please enter a measurement value.");
      return;
    }

    if (isNaN(Number(measurementValue))) {
      Alert.alert("Invalid Value", "Measurement value must be a number.");
      return;
    }

    const payload = {
      lifecycle_record_id: Number(recordId) || recordId,
      measurement_type: measurementType.trim(),
      measurement_value: Number(measurementValue),
      unit: unit.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      setCreating(true);
      const uid = userId || (await getCurrentUserId());

      // If offline or parent lifecycle record was created offline: save locally
      if (!isOnline || String(recordId).startsWith("loc_")) {
        const localId = generateLocalId("meas");
        await enqueueOperation({
          userId: uid,
          recordType: "measurement",
          operationType: "create",
          localRecordId: localId,
          parentLocalId: String(recordId).startsWith("loc_") ? String(recordId) : null,
          parentServerId: !String(recordId).startsWith("loc_") ? Number(recordId) : null,
          endpoint: "/measurements",
          httpMethod: "POST",
          payload,
        });

        Alert.alert(
          "Saved on this device",
          "Your measurement has been saved locally and will sync when you are back online."
        );

        setMeasurementType("");
        setMeasurementValue("");
        setUnit("");
        setNotes("");

        const cached = await getCachedActivities(recordId, "measurement");
        setMeasurements(cached);
        return;
      }

      // Online: send request to server
      try {
        const response = await API.post("/measurements", payload);
        Alert.alert("Success", "Measurement created successfully.");

        setMeasurementType("");
        setMeasurementValue("");
        setUnit("");
        setNotes("");

        if (response.data?.measurement) {
          await cacheActivities(uid, recordId, "measurement", [response.data.measurement]);
        }
        await loadMeasurements();
      } catch (reqError) {
        if (!reqError.response) {
          // Connection failed: save offline safely
          const localId = generateLocalId("meas");
          await enqueueOperation({
            userId: uid,
            recordType: "measurement",
            operationType: "create",
            localRecordId: localId,
            parentLocalId: String(recordId).startsWith("loc_") ? String(recordId) : null,
            parentServerId: !String(recordId).startsWith("loc_") ? Number(recordId) : null,
            endpoint: "/measurements",
            httpMethod: "POST",
            payload,
          });

          Alert.alert(
            "Saved on this device",
            "Connection interrupted. Saved locally and queued for automatic sync."
          );

          setMeasurementType("");
          setMeasurementValue("");
          setUnit("");
          setNotes("");

          const cached = await getCachedActivities(recordId, "measurement");
          setMeasurements(cached);
        } else {
          Alert.alert(
            "Error",
            reqError.response?.data?.message || "Failed to create measurement."
          );
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
        <Text style={styles.loadingText}>Loading measurements...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Network & Offline Status Banner */}
      <SyncStatus status={isOnline ? "online" : "offline"} showBanner={true} />

      <Text style={[styles.title, { marginTop: 12 }]}>Measurements</Text>
      <Text style={styles.subtitle}>Crop ID: {id}</Text>
      <Text style={styles.subtitle}>Lifecycle Record: {recordId}</Text>

      {/* Existing Measurements */}
      <Text style={styles.sectionTitle}>Recorded Measurements</Text>

      {measurements.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No measurements recorded yet.</Text>
        </View>
      ) : (
        measurements.map((measurement) => (
          <View key={measurement.id || measurement.local_id} style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.measurementType}>{measurement.measurement_type}</Text>
              {measurement.sync_status === "pending" && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending Sync</Text>
                </View>
              )}
              {measurement.sync_status === "failed" && (
                <View style={styles.failedBadge}>
                  <Text style={styles.failedBadgeText}>Sync Failed</Text>
                </View>
              )}
            </View>

            <Text style={styles.value}>
              {measurement.measurement_value} {measurement.unit || ""}
            </Text>

            {measurement.notes && (
              <Text style={styles.notes}>Notes: {measurement.notes}</Text>
            )}
          </View>
        ))
      )}

      {/* Add Measurement Form */}
      <Text style={styles.sectionTitle}>Add Measurement</Text>

      <Text style={styles.label}>Measurement Type *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Plant Height"
        value={measurementType}
        onChangeText={setMeasurementType}
      />

      <Text style={styles.label}>Measurement Value *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 25"
        value={measurementValue}
        onChangeText={setMeasurementValue}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Unit</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. cm"
        value={unit}
        onChangeText={setUnit}
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="Additional notes..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={[styles.button, creating && styles.buttonDisabled]}
        onPress={handleCreateMeasurement}
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {!isOnline ? "Save on Device" : "Add Measurement"}
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
  measurementType: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  value: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.primary || "#2E7D32",
    marginTop: 4,
  },
  notes: {
    marginTop: 6,
    fontSize: 13,
    color: "#4B5563",
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
