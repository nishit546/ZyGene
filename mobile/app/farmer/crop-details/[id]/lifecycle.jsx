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
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";

import API from "../../../../services/api";
import FarmerHeader from "../../../../components/ui/FarmerHeader";
import SyncStatus from "../../../../components/SyncStatus";
import useNetworkStatus from "../../../../hooks/useNetworkStatus";
import {
  cacheLifecycleRecords,
  getCachedLifecycleRecords,
  generateLocalId,
} from "../../../../services/offlineStorage";
import {
  enqueueOperation,
  subscribeSyncEvents,
} from "../../../../services/syncService";
import { getCurrentUserId } from "../../../../services/auth";
import { COLORS } from "../../../../constants/theme";
import AppDatePicker from "../../../../components/ui/AppDatePicker";

const STAGES = [
  { value: "seed_sowing", label: "Seed Sowing" },
  { value: "germination", label: "Germination" },
  { value: "seedling", label: "Seedling" },
  { value: "vegetative", label: "Vegetative" },
  { value: "flowering", label: "Flowering" },
  { value: "fruiting", label: "Fruiting" },
  { value: "maturity", label: "Maturity" },
  { value: "harvest", label: "Harvest" },
];

export default function Lifecycle() {
  const { id } = useLocalSearchParams();

  const [records, setRecords] = useState([]);
  const [stage, setStage] = useState("");
  const [recordDate, setRecordDate] = useState("");
  const [recordTime, setRecordTime] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState(null);

  const { isOnline } = useNetworkStatus(() => {
    loadLifecycle();
  });

  const loadLifecycle = useCallback(async () => {
    try {
      setLoading(true);
      const uid = await getCurrentUserId();
      setUserId(uid);

      if (isOnline && !String(id).startsWith("loc_")) {
        try {
          const response = await API.get(`/lifecycle/${id}`);
          const fetched = response.data?.lifecycle || [];
          setRecords(fetched);
          await cacheLifecycleRecords(uid, id, fetched);
          return;
        } catch (apiErr) {
          console.log("[lifecycle] API fetch failed, loading SQLite cache:", apiErr.message);
        }
      }

      // Offline or fallback: load from SQLite
      const cached = await getCachedLifecycleRecords(id);
      setRecords(cached);
    } catch (error) {
      console.log("LIFECYCLE ERROR:", error.message);
      const cached = await getCachedLifecycleRecords(id);
      setRecords(cached);
    } finally {
      setLoading(false);
    }
  }, [id, isOnline]);

  useEffect(() => {
    if (id) {
      loadLifecycle();
    }

    const unsubscribe = subscribeSyncEvents((event) => {
      if (event.type === "ITEM_SYNCED" || event.type === "SYNC_COMPLETE") {
        loadLifecycle();
      }
    });
    return () => unsubscribe();
  }, [id, loadLifecycle]);

  const handleCreateRecord = async () => {
    if (!stage) {
      Alert.alert("Missing Information", "Please select a lifecycle stage.");
      return;
    }

    if (!recordDate.trim()) {
      Alert.alert("Missing Information", "Please enter the record date.");
      return;
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(recordDate.trim())) {
      Alert.alert("Invalid Date", "Please use YYYY-MM-DD format.");
      return;
    }

    const payload = {
      crop_id: Number(id) || id,
      stage: stage,
      record_date: recordDate.trim(),
      record_time: recordTime.trim() || null,
      latitude: latitude.trim() ? Number(latitude) : null,
      longitude: longitude.trim() ? Number(longitude) : null,
      notes: notes.trim() || null,
    };

    try {
      setCreating(true);
      const uid = userId || (await getCurrentUserId());

      // If offline or parent crop is local: save locally and enqueue
      if (!isOnline || String(id).startsWith("loc_")) {
        const localId = generateLocalId("lc");
        await enqueueOperation({
          userId: uid,
          recordType: "lifecycle",
          operationType: "create",
          localRecordId: localId,
          parentLocalId: String(id).startsWith("loc_") ? String(id) : null,
          parentServerId: !String(id).startsWith("loc_") ? Number(id) : null,
          endpoint: "/lifecycle",
          httpMethod: "POST",
          payload,
        });

        Alert.alert(
          "Saved on this device",
          "Lifecycle record saved locally. It will sync automatically when you are back online."
        );

        setStage("");
        setRecordDate("");
        setRecordTime("");
        setLatitude("");
        setLongitude("");
        setNotes("");

        const cached = await getCachedLifecycleRecords(id);
        setRecords(cached);
        return;
      }

      // Online: send request to server
      try {
        const response = await API.post("/lifecycle", payload);
        Alert.alert("Success", "Lifecycle record created successfully.");

        setStage("");
        setRecordDate("");
        setRecordTime("");
        setLatitude("");
        setLongitude("");
        setNotes("");

        if (response.data?.lifecycle) {
          await cacheLifecycleRecords(uid, id, [response.data.lifecycle]);
        }
        await loadLifecycle();
      } catch (reqError) {
        if (!reqError.response) {
          // Connection lost: save locally
          const localId = generateLocalId("lc");
          await enqueueOperation({
            userId: uid,
            recordType: "lifecycle",
            operationType: "create",
            localRecordId: localId,
            parentLocalId: String(id).startsWith("loc_") ? String(id) : null,
            parentServerId: !String(id).startsWith("loc_") ? Number(id) : null,
            endpoint: "/lifecycle",
            httpMethod: "POST",
            payload,
          });

          Alert.alert(
            "Saved on this device",
            "Connection interrupted. Saved locally and queued for automatic sync."
          );

          setStage("");
          setRecordDate("");
          setRecordTime("");
          setLatitude("");
          setLongitude("");
          setNotes("");

          const cached = await getCachedLifecycleRecords(id);
          setRecords(cached);
        } else {
          Alert.alert("Error", reqError.response?.data?.message || "Failed to create lifecycle record.");
        }
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading lifecycle...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <FarmerHeader
        title="Crop Lifecycle"
        subtitle={`Crop ID: ${id}`}
        showBack={true}
      />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Offline / Sync Banner */}
        <SyncStatus status={isOnline ? "online" : "offline"} showBanner={true} />

        {/* Existing Records */}
        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Lifecycle Records</Text>

        {records.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No lifecycle records yet.</Text>
          </View>
        ) : (
          records.map((record) => (
            <View key={record.id || record.local_id} style={styles.recordCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.stage}>
                  {STAGES.find((item) => item.value === record.stage)?.label || record.stage}
                </Text>
                {record.sync_status === "pending" && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pending Sync</Text>
                  </View>
                )}
                {record.sync_status === "failed" && (
                  <View style={styles.failedBadge}>
                    <Text style={styles.failedBadgeText}>Sync Failed</Text>
                  </View>
                )}
              </View>

              <Text style={styles.recordText}>Date: {record.record_date}</Text>

              {record.record_time && (
                <Text style={styles.recordText}>Time: {record.record_time}</Text>
              )}

              {record.latitude !== null && record.latitude !== undefined && (
                <Text style={styles.recordText}>
                  Location: {record.latitude}, {record.longitude}
                </Text>
              )}

              {record.notes && (
                <Text style={styles.recordText}>Notes: {record.notes}</Text>
              )}

              {/* Activity Navigation Buttons */}
              <TouchableOpacity
                style={styles.measurementButton}
                onPress={() => router.push(`/farmer/crop-details/${id}/measurements/${record.id || record.local_id}`)}
              >
                <Text style={styles.measurementButtonText}>View Measurements</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => router.push(`/farmer/crop-details/${id}/photos/${record.id || record.local_id}`)}
              >
                <Text style={styles.photoButtonText}>View Photos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.irrigationButton}
                onPress={() => router.push(`/farmer/crop-details/${id}/irrigation/${record.id || record.local_id}`)}
              >
                <Text style={styles.irrigationButtonText}>View Irrigation</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.treatmentButton}
                onPress={() => router.push(`/farmer/crop-details/${id}/treatments/${record.id || record.local_id}`)}
              >
                <Text style={styles.treatmentButtonText}>View Treatments</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.diseasePestButton}
                onPress={() => router.push(`/farmer/crop-details/${id}/disease-pest/${record.id || record.local_id}`)}
              >
                <Text style={styles.diseasePestButtonText}>View Disease & Pest</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.harvestButton}
                onPress={() => router.push(`/farmer/crop-details/${id}/harvest/${record.id || record.local_id}`)}
              >
                <Text style={styles.harvestButtonText}>View Harvest</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Add Lifecycle Record Form */}
        <Text style={styles.sectionTitle}>Add Lifecycle Record</Text>

        <Text style={styles.label}>Stage *</Text>
        <View style={styles.stageContainer}>
          {STAGES.map((item) => {
            const selected = stage === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={[styles.stageOption, selected && styles.selectedStage]}
                onPress={() => setStage(item.value)}
              >
                <Text style={[styles.stageOptionText, selected && styles.selectedStageText]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <AppDatePicker
          label="Record Date"
          placeholder="Select record date"
          value={recordDate}
          onChange={setRecordDate}
          isRequired={true}
          maxDate={new Date()}
        />

        <Text style={styles.label}>Record Time</Text>
        <TextInput
          style={styles.input}
          placeholder="HH:MM:SS"
          value={recordTime}
          onChangeText={setRecordTime}
        />

        <Text style={styles.label}>Latitude</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 23.0225"
          value={latitude}
          onChangeText={setLatitude}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Longitude</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 72.5714"
          value={longitude}
          onChangeText={setLongitude}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Add observations..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.button, creating && styles.buttonDisabled]}
          onPress={handleCreateRecord}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {!isOnline ? "Save on Device" : "Add Lifecycle Record"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 50,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1F2937",
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
  },
  emptyText: {
    color: "#777",
  },
  recordCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    backgroundColor: "#FFFFFF",
  },
  stage: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2e7d32",
    marginBottom: 6,
  },
  recordText: {
    fontSize: 14,
    color: "#374151",
    marginTop: 3,
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
  measurementButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#2e7d32",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  measurementButtonText: {
    color: "#2e7d32",
    fontWeight: "bold",
    fontSize: 13,
  },
  photoButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#1976d2",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  photoButtonText: {
    color: "#1976d2",
    fontWeight: "bold",
    fontSize: 13,
  },
  irrigationButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#ef6c00",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  irrigationButtonText: {
    color: "#ef6c00",
    fontWeight: "bold",
    fontSize: 13,
  },
  treatmentButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#6a1b9a",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  treatmentButtonText: {
    color: "#6a1b9a",
    fontWeight: "bold",
    fontSize: 13,
  },
  diseasePestButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#c62828",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  diseasePestButtonText: {
    color: "#c62828",
    fontWeight: "bold",
    fontSize: 13,
  },
  harvestButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#0284C7",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  harvestButtonText: {
    color: "#0284C7",
    fontWeight: "bold",
    fontSize: 13,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 12,
    marginBottom: 6,
  },
  stageContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  stageOption: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  selectedStage: {
    backgroundColor: "#2e7d32",
    borderColor: "#2e7d32",
  },
  stageOptionText: {
    fontSize: 13,
    color: "#374151",
  },
  selectedStageText: {
    color: "#fff",
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    fontWeight: "500",
    color: "#0F172A",
    marginBottom: 10,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#2e7d32",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
