import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import API from "../../../../../services/api";
import SyncStatus from "../../../../../components/SyncStatus";
import useNetworkStatus from "../../../../../hooks/useNetworkStatus";
import CameraCapture from "../../../../../components/CameraCapture";
import { Image } from "react-native";
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

const OBSERVATION_TYPES = [
  { value: "disease", label: "Disease" },
  { value: "pest", label: "Pest" },
];

const SEVERITIES = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
  { value: "severe", label: "Severe" },
];

export default function DiseasePest() {
  const { id, recordId } = useLocalSearchParams();

  const [observations, setObservations] = useState([]);
  const [observationType, setObservationType] = useState("disease");
  const [name, setName] = useState("");
  const [severity, setSeverity] = useState("low");
  const [affectedPercentage, setAffectedPercentage] = useState("");
  const [observationDate, setObservationDate] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState(null);

  const { isOnline } = useNetworkStatus(() => {
    loadObservations();
  });

  const loadObservations = useCallback(async () => {
    try {
      setLoading(true);
      const uid = await getCurrentUserId();
      setUserId(uid);

      if (isOnline && !String(recordId).startsWith("loc_")) {
        try {
          const response = await API.get(`/disease-pests/${recordId}`);
          const fetched = response.data?.observations || [];
          setObservations(fetched);
          await cacheActivities(uid, recordId, "disease_pest", fetched);
          return;
        } catch (apiErr) {
          console.log("[disease-pest] API fetch failed, loading SQLite cache:", apiErr.message);
        }
      }

      // Offline or fallback: load from SQLite
      const cached = await getCachedActivities(recordId, "disease_pest");
      setObservations(cached);
    } catch (error) {
      console.log("DISEASE PEST ERROR:", error.message);
      const cached = await getCachedActivities(recordId, "disease_pest");
      setObservations(cached);
    } finally {
      setLoading(false);
    }
  }, [recordId, isOnline]);

  useEffect(() => {
    if (recordId) {
      loadObservations();
    }

    const unsubscribe = subscribeSyncEvents((event) => {
      if (event.type === "ITEM_SYNCED" || event.type === "SYNC_COMPLETE") {
        loadObservations();
      }
    });
    return () => unsubscribe();
  }, [recordId, loadObservations]);

  const handleCreateObservation = async () => {
    if (!observationType) {
      Alert.alert("Missing Information", "Please select disease or pest.");
      return;
    }

    if (!name.trim()) {
      Alert.alert("Missing Information", "Please enter the disease or pest name.");
      return;
    }

    if (!observationDate.trim()) {
      Alert.alert("Missing Information", "Please enter the observation date.");
      return;
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(observationDate.trim())) {
      Alert.alert("Invalid Date", "Please use YYYY-MM-DD format.");
      return;
    }

    if (affectedPercentage.trim()) {
      const percentage = Number(affectedPercentage);
      if (Number.isNaN(percentage) || percentage < 0 || percentage > 100) {
        Alert.alert("Invalid Percentage", "Affected percentage must be between 0 and 100.");
        return;
      }
    }

    const payload = {
      lifecycle_record_id: Number(recordId) || recordId,
      observation_type: observationType,
      name: name.trim(),
      severity: severity || null,
      affected_percentage: affectedPercentage.trim() ? Number(affectedPercentage) : null,
      observation_date: observationDate.trim(),
      image_url: photoUri || null,
      notes: notes.trim() || null,
    };

    try {
      setCreating(true);
      const uid = userId || (await getCurrentUserId());

      // If offline or parent record was created offline: save locally and queue
      if (!isOnline || String(recordId).startsWith("loc_")) {
        const localId = generateLocalId("dp");
        await enqueueOperation({
          userId: uid,
          recordType: "disease_pest",
          operationType: "create",
          localRecordId: localId,
          parentLocalId: String(recordId).startsWith("loc_") ? String(recordId) : null,
          parentServerId: !String(recordId).startsWith("loc_") ? Number(recordId) : null,
          endpoint: "/disease-pests",
          httpMethod: "POST",
          payload,
        });

        Alert.alert(
          "Saved on this device",
          "Disease/pest observation saved locally. It will sync automatically when you are back online."
        );

        setName("");
        setObservationDate("");
        setAffectedPercentage("");
        setNotes("");
        setPhotoUri(null);

        const cached = await getCachedActivities(recordId, "disease_pest");
        setObservations(cached);
        return;
      }

      // Online: send request
      try {
        const response = await API.post("/disease-pests", payload);
        Alert.alert("Success", "Disease/pest observation added successfully.");

        setName("");
        setObservationDate("");
        setAffectedPercentage("");
        setNotes("");
        setPhotoUri(null);

        if (response.data?.observation) {
          await cacheActivities(uid, recordId, "disease_pest", [response.data.observation]);
        }
        await loadObservations();
      } catch (reqError) {
        if (!reqError.response) {
          // Connection lost: save offline
          const localId = generateLocalId("dp");
          await enqueueOperation({
            userId: uid,
            recordType: "disease_pest",
            operationType: "create",
            localRecordId: localId,
            parentLocalId: String(recordId).startsWith("loc_") ? String(recordId) : null,
            parentServerId: !String(recordId).startsWith("loc_") ? Number(recordId) : null,
            endpoint: "/disease-pests",
            httpMethod: "POST",
            payload,
          });

          Alert.alert(
            "Saved on this device",
            "Connection interrupted. Saved locally and queued for automatic sync."
          );

          setName("");
          setObservationDate("");
          setAffectedPercentage("");
          setNotes("");
          setPhotoUri(null);

          const cached = await getCachedActivities(recordId, "disease_pest");
          setObservations(cached);
        } else {
          Alert.alert("Error", reqError.response?.data?.message || "Failed to create observation.");
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
        <Text style={styles.loadingText}>Loading observations...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SyncStatus status={isOnline ? "online" : "offline"} showBanner={true} />

      <Text style={[styles.title, { marginTop: 12 }]}>Disease & Pest</Text>
      <Text style={styles.subtitle}>Crop ID: {id}</Text>
      <Text style={styles.subtitle}>Lifecycle Record: {recordId}</Text>

      {/* Existing Observations */}
      <Text style={styles.sectionTitle}>Recorded Observations</Text>

      {observations.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No observations recorded yet.</Text>
        </View>
      ) : (
        observations.map((obs) => (
          <View key={obs.id || obs.local_id} style={styles.card}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.type}>
                {obs.observation_type === "disease" ? "🦠 Disease" : "🐛 Pest"}
              </Text>
              {obs.sync_status === "pending" && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending Sync</Text>
                </View>
              )}
              {obs.sync_status === "failed" && (
                <View style={styles.failedBadge}>
                  <Text style={styles.failedBadgeText}>Sync Failed</Text>
                </View>
              )}
            </View>

            <Text style={styles.name}>{obs.name}</Text>
            {obs.severity && (
              <Text style={styles.info}>Severity: {obs.severity}</Text>
            )}
            {obs.affected_percentage !== null && obs.affected_percentage !== undefined && (
              <Text style={styles.info}>Affected: {obs.affected_percentage}%</Text>
            )}
            <Text style={styles.info}>Date: {obs.observation_date}</Text>
            {obs.image_url ? (
              <Image
                source={{ uri: obs.image_url }}
                style={styles.obsImage}
                resizeMode="cover"
              />
            ) : null}
            {obs.notes && <Text style={styles.notes}>Notes: {obs.notes}</Text>}
          </View>
        ))
      )}

      {/* Add Observation Form */}
      <Text style={styles.sectionTitle}>Add Observation</Text>

      <Text style={styles.label}>Type *</Text>
      <View style={styles.typeContainer}>
        {OBSERVATION_TYPES.map((item) => {
          const selected = observationType === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              style={[styles.typeOption, selected && styles.selectedType]}
              onPress={() => setObservationType(item.value)}
            >
              <Text style={[styles.typeOptionText, selected && styles.selectedTypeText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Leaf Rust or Aphids"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Severity</Text>
      <View style={styles.typeContainer}>
        {SEVERITIES.map((item) => {
          const selected = severity === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              style={[styles.typeOption, selected && styles.selectedSeverity]}
              onPress={() => setSeverity(item.value)}
            >
              <Text style={[styles.typeOptionText, selected && styles.selectedTypeText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Affected Percentage (%)</Text>
      <TextInput
        style={styles.input}
        placeholder="0 - 100"
        value={affectedPercentage}
        onChangeText={setAffectedPercentage}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Observation Date *</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={observationDate}
        onChangeText={setObservationDate}
      />

      <CameraCapture
        imageUri={photoUri}
        onImageSelected={setPhotoUri}
        onImageRemoved={() => setPhotoUri(null)}
        label="Disease / Pest Photo"
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="Additional symptoms or observations..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={[styles.button, creating && styles.buttonDisabled]}
        onPress={handleCreateObservation}
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {!isOnline ? "Save on Device" : "Add Observation"}
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
    fontSize: 13,
    fontWeight: "700",
    color: "#C62828",
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 2,
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
    backgroundColor: "#C62828",
    borderColor: "#C62828",
  },
  selectedSeverity: {
    backgroundColor: "#E65100",
    borderColor: "#E65100",
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
  obsImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: "#E5E7EB",
  },
});
