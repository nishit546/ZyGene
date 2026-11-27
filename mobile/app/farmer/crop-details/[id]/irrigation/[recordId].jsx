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

export default function Irrigation() {
  const { id, recordId } = useLocalSearchParams();

  const [irrigation, setIrrigation] = useState([]);
  const [irrigationDate, setIrrigationDate] = useState("");
  const [waterAmount, setWaterAmount] = useState("");
  const [waterUnit, setWaterUnit] = useState("");
  const [irrigationMethod, setIrrigationMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState(null);

  const { isOnline } = useNetworkStatus(() => {
    loadIrrigation();
  });

  const loadIrrigation = useCallback(async () => {
    try {
      setLoading(true);
      const uid = await getCurrentUserId();
      setUserId(uid);

      if (isOnline && !String(recordId).startsWith("loc_")) {
        try {
          const response = await API.get(`/irrigation/${recordId}`);
          const fetched = response.data?.irrigation || [];
          setIrrigation(fetched);
          await cacheActivities(uid, recordId, "irrigation", fetched);
          return;
        } catch (apiErr) {
          console.log("[irrigation] API fetch failed, loading SQLite cache:", apiErr.message);
        }
      }

      // Offline or fallback: load from SQLite
      const cached = await getCachedActivities(recordId, "irrigation");
      setIrrigation(cached);
    } catch (error) {
      console.log("IRRIGATION ERROR:", error.message);
      const cached = await getCachedActivities(recordId, "irrigation");
      setIrrigation(cached);
    } finally {
      setLoading(false);
    }
  }, [recordId, isOnline]);

  useEffect(() => {
    if (recordId) {
      loadIrrigation();
    }

    const unsubscribe = subscribeSyncEvents((event) => {
      if (event.type === "ITEM_SYNCED" || event.type === "SYNC_COMPLETE") {
        loadIrrigation();
      }
    });
    return () => unsubscribe();
  }, [recordId, loadIrrigation]);

  const handleCreateIrrigation = async () => {
    if (!irrigationDate.trim()) {
      Alert.alert("Missing Information", "Please enter the irrigation date.");
      return;
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(irrigationDate.trim())) {
      Alert.alert("Invalid Date", "Please use YYYY-MM-DD format.");
      return;
    }

    if (waterAmount.trim() && isNaN(Number(waterAmount))) {
      Alert.alert("Invalid Water Amount", "Water amount must be a number.");
      return;
    }

    const payload = {
      lifecycle_record_id: Number(recordId) || recordId,
      irrigation_date: irrigationDate.trim(),
      water_amount: waterAmount.trim() ? Number(waterAmount) : null,
      water_unit: waterUnit.trim() || null,
      irrigation_method: irrigationMethod.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      setCreating(true);
      const uid = userId || (await getCurrentUserId());

      // If offline or parent record was created offline: save locally and queue
      if (!isOnline || String(recordId).startsWith("loc_")) {
        const localId = generateLocalId("irrig");
        await enqueueOperation({
          userId: uid,
          recordType: "irrigation",
          operationType: "create",
          localRecordId: localId,
          parentLocalId: String(recordId).startsWith("loc_") ? String(recordId) : null,
          parentServerId: !String(recordId).startsWith("loc_") ? Number(recordId) : null,
          endpoint: "/irrigation",
          httpMethod: "POST",
          payload,
        });

        Alert.alert(
          "Saved on this device",
          "Irrigation record saved locally. It will sync automatically when you are back online."
        );

        setIrrigationDate("");
        setWaterAmount("");
        setWaterUnit("");
        setIrrigationMethod("");
        setNotes("");

        const cached = await getCachedActivities(recordId, "irrigation");
        setIrrigation(cached);
        return;
      }

      // Online: send request
      try {
        const response = await API.post("/irrigation", payload);
        Alert.alert("Success", "Irrigation record created successfully.");

        setIrrigationDate("");
        setWaterAmount("");
        setWaterUnit("");
        setIrrigationMethod("");
        setNotes("");

        if (response.data?.irrigation) {
          await cacheActivities(uid, recordId, "irrigation", [response.data.irrigation]);
        }
        await loadIrrigation();
      } catch (reqError) {
        if (!reqError.response) {
          // Connection lost: save offline
          const localId = generateLocalId("irrig");
          await enqueueOperation({
            userId: uid,
            recordType: "irrigation",
            operationType: "create",
            localRecordId: localId,
            parentLocalId: String(recordId).startsWith("loc_") ? String(recordId) : null,
            parentServerId: !String(recordId).startsWith("loc_") ? Number(recordId) : null,
            endpoint: "/irrigation",
            httpMethod: "POST",
            payload,
          });

          Alert.alert(
            "Saved on this device",
            "Connection interrupted. Saved locally and queued for automatic sync."
          );

          setIrrigationDate("");
          setWaterAmount("");
          setWaterUnit("");
          setIrrigationMethod("");
          setNotes("");

          const cached = await getCachedActivities(recordId, "irrigation");
          setIrrigation(cached);
        } else {
          Alert.alert("Error", reqError.response?.data?.message || "Failed to create irrigation record.");
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
        <Text style={styles.loadingText}>Loading irrigation...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SyncStatus status={isOnline ? "online" : "offline"} showBanner={true} />

      <Text style={[styles.title, { marginTop: 12 }]}>Irrigation</Text>
      <Text style={styles.subtitle}>Crop ID: {id}</Text>
      <Text style={styles.subtitle}>Lifecycle Record: {recordId}</Text>

      {/* Existing Irrigation Records */}
      <Text style={styles.sectionTitle}>Recorded Irrigation</Text>

      {irrigation.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No irrigation records yet.</Text>
        </View>
      ) : (
        irrigation.map((record) => (
          <View key={record.id || record.local_id} style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.date}>Date: {record.irrigation_date}</Text>
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

            {record.water_amount && (
              <Text style={styles.amount}>
                Water: {record.water_amount} {record.water_unit || ""}
              </Text>
            )}

            {record.irrigation_method && (
              <Text style={styles.method}>Method: {record.irrigation_method}</Text>
            )}

            {record.notes && (
              <Text style={styles.notes}>Notes: {record.notes}</Text>
            )}
          </View>
        ))
      )}

      {/* Add Irrigation Form */}
      <Text style={styles.sectionTitle}>Add Irrigation Record</Text>

      <Text style={styles.label}>Irrigation Date *</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={irrigationDate}
        onChangeText={setIrrigationDate}
      />

      <Text style={styles.label}>Water Amount</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 100"
        value={waterAmount}
        onChangeText={setWaterAmount}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Water Unit</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Liters or mm"
        value={waterUnit}
        onChangeText={setWaterUnit}
      />

      <Text style={styles.label}>Irrigation Method</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Drip, Sprinkler"
        value={irrigationMethod}
        onChangeText={setIrrigationMethod}
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="Additional observations..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={[styles.button, creating && styles.buttonDisabled]}
        onPress={handleCreateIrrigation}
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {!isOnline ? "Save on Device" : "Add Irrigation Record"}
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
  date: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1F2937",
  },
  amount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF6C00",
    marginTop: 4,
  },
  method: {
    marginTop: 4,
    fontSize: 13,
    color: "#4B5563",
  },
  notes: {
    marginTop: 4,
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
