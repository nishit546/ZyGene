import { useEffect, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";

import {
  useLocalSearchParams,
  router,
} from "expo-router";

import API from "../../../../services/api";

const STAGES = [
  {
    value: "seed_sowing",
    label: "Seed Sowing",
  },
  {
    value: "germination",
    label: "Germination",
  },
  {
    value: "seedling",
    label: "Seedling",
  },
  {
    value: "vegetative",
    label: "Vegetative",
  },
  {
    value: "flowering",
    label: "Flowering",
  },
  {
    value: "fruiting",
    label: "Fruiting",
  },
  {
    value: "maturity",
    label: "Maturity",
  },
  {
    value: "harvest",
    label: "Harvest",
  },
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

  // ========================================
  // LOAD LIFECYCLE RECORDS
  // ========================================

  const loadLifecycle = async () => {
    try {
      const response = await API.get(
        `/lifecycle/${id}`
      );

      console.log(
        "LIFECYCLE:",
        response.data
      );

      setRecords(
        response.data.lifecycle || []
      );
    } catch (error) {
      console.log(
        "LIFECYCLE ERROR:",
        error.response?.data ||
          error.message
      );

      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to load lifecycle records."
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // LOAD WHEN SCREEN OPENS
  // ========================================

  useEffect(() => {
    if (id) {
      loadLifecycle();
    }
  }, [id]);

  // ========================================
  // CREATE LIFECYCLE RECORD
  // ========================================

  const handleCreateRecord = async () => {
    console.log(
      "CREATE LIFECYCLE CLICKED"
    );

    console.log("FORM DATA:", {
      crop_id: id,
      stage,
      record_date: recordDate,
      record_time: recordTime,
      latitude,
      longitude,
      notes,
    });

    if (!stage) {
      Alert.alert(
        "Missing Information",
        "Please select a lifecycle stage."
      );

      return;
    }

    if (!recordDate.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter the record date."
      );

      return;
    }

    const datePattern =
      /^\d{4}-\d{2}-\d{2}$/;

    if (
      !datePattern.test(
        recordDate.trim()
      )
    ) {
      Alert.alert(
        "Invalid Date",
        "Please use YYYY-MM-DD format."
      );

      return;
    }

    try {
      setCreating(true);

      const payload = {
        crop_id: Number(id),

        stage: stage,

        record_date:
          recordDate.trim(),

        record_time:
          recordTime.trim() || null,

        latitude:
          latitude.trim()
            ? Number(latitude)
            : null,

        longitude:
          longitude.trim()
            ? Number(longitude)
            : null,

        notes:
          notes.trim() || null,
      };

      console.log(
        "SENDING LIFECYCLE:",
        payload
      );

      const response =
        await API.post(
          "/lifecycle",
          payload
        );

      console.log(
        "LIFECYCLE CREATED:",
        response.data
      );

      Alert.alert(
        "Success",
        "Lifecycle record created successfully."
      );

      setStage("");
      setRecordDate("");
      setRecordTime("");
      setLatitude("");
      setLongitude("");
      setNotes("");

      await loadLifecycle();
    } catch (error) {
      console.log(
        "CREATE LIFECYCLE ERROR:",
        error
      );

      console.log(
        "SERVER ERROR:",
        error.response?.data
      );

      Alert.alert(
        "Error",
        error.response?.data?.message ||
          error.message ||
          "Failed to create lifecycle record."
      );
    } finally {
      setCreating(false);
    }
  };

  // ========================================
  // LOADING
  // ========================================

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
        />

        <Text style={styles.loadingText}>
          Loading lifecycle...
        </Text>
      </View>
    );
  }

  // ========================================
  // SCREEN
  // ========================================

  return (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
    >
      <Text style={styles.title}>
        Crop Lifecycle
      </Text>

      <Text style={styles.cropText}>
        Crop ID: {id}
      </Text>

      {/* ================================= */}
      {/* LIFECYCLE RECORDS */}
      {/* ================================= */}

      <Text style={styles.sectionTitle}>
        Lifecycle Records
      </Text>

      {records.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No lifecycle records yet.
          </Text>
        </View>
      ) : (
        records.map((record) => (
          <View
            key={record.id}
            style={styles.recordCard}
          >
            {/* ============================ */}
            {/* STAGE */}
            {/* ============================ */}

            <Text style={styles.stage}>
              {STAGES.find(
                (item) =>
                  item.value ===
                  record.stage
              )?.label ||
                record.stage}
            </Text>

            {/* ============================ */}
            {/* DATE */}
            {/* ============================ */}

            <Text style={styles.recordText}>
              Date:{" "}
              {record.record_date}
            </Text>

            {/* ============================ */}
            {/* TIME */}
            {/* ============================ */}

            {record.record_time && (
              <Text style={styles.recordText}>
                Time:{" "}
                {record.record_time}
              </Text>
            )}

            {/* ============================ */}
            {/* LOCATION */}
            {/* ============================ */}

            {record.latitude !== null &&
              record.latitude !== undefined &&
              record.longitude !== null &&
              record.longitude !==
                undefined && (
                <Text
                  style={styles.recordText}
                >
                  Location:{" "}
                  {record.latitude},{" "}
                  {record.longitude}
                </Text>
              )}

            {/* ============================ */}
            {/* NOTES */}
            {/* ============================ */}

            {record.notes && (
              <Text
                style={styles.recordText}
              >
                Notes: {record.notes}
              </Text>
            )}

            {/* ============================ */}
            {/* MEASUREMENTS */}
            {/* ============================ */}

            <TouchableOpacity
              style={
                styles.measurementButton
              }
              onPress={() =>
                router.push(
                  `/farmer/crop-details/${id}/measurements/${record.id}`
                )
              }
            >
              <Text
                style={
                  styles.measurementButtonText
                }
              >
                View Measurements
              </Text>
            </TouchableOpacity>

            {/* ============================ */}
            {/* PHOTOS */}
            {/* ============================ */}

            <TouchableOpacity
              style={styles.photoButton}
              onPress={() =>
                router.push(
                  `/farmer/crop-details/${id}/photos/${record.id}`
                )
              }
            >
              <Text
                style={
                  styles.photoButtonText
                }
              >
                View Photos
              </Text>
            </TouchableOpacity>

            {/* ============================ */}
            {/* IRRIGATION */}
            {/* ============================ */}

            <TouchableOpacity
              style={
                styles.irrigationButton
              }
              onPress={() =>
                router.push(
                  `/farmer/crop-details/${id}/irrigation/${record.id}`
                )
              }
            >
              <Text
                style={
                  styles.irrigationButtonText
                }
              >
                View Irrigation
              </Text>
            </TouchableOpacity>

            {/* ============================ */}
            {/* TREATMENTS */}
            {/* ============================ */}

            <TouchableOpacity
              style={
                styles.treatmentButton
              }
              onPress={() =>
                router.push(
                  `/farmer/crop-details/${id}/treatments/${record.id}`
                )
              }
            >
              <Text
                style={
                  styles.treatmentButtonText
                }
              >
                View Treatments
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* ================================= */}
      {/* ADD LIFECYCLE RECORD */}
      {/* ================================= */}

      <Text style={styles.sectionTitle}>
        Add Lifecycle Record
      </Text>

      {/* Stage */}

      <Text style={styles.label}>
        Stage *
      </Text>

      <View style={styles.stageContainer}>
        {STAGES.map((item) => {
          const selected =
            stage === item.value;

          return (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.stageOption,
                selected &&
                  styles.selectedStage,
              ]}
              onPress={() =>
                setStage(item.value)
              }
            >
              <Text
                style={[
                  styles.stageOptionText,
                  selected &&
                    styles.selectedStageText,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date */}

      <Text style={styles.label}>
        Record Date *
      </Text>

      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={recordDate}
        onChangeText={setRecordDate}
      />

      {/* Time */}

      <Text style={styles.label}>
        Record Time
      </Text>

      <TextInput
        style={styles.input}
        placeholder="HH:MM:SS"
        value={recordTime}
        onChangeText={setRecordTime}
      />

      {/* Latitude */}

      <Text style={styles.label}>
        Latitude
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. 23.0225"
        value={latitude}
        onChangeText={setLatitude}
        keyboardType="decimal-pad"
      />

      {/* Longitude */}

      <Text style={styles.label}>
        Longitude
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. 72.5714"
        value={longitude}
        onChangeText={setLongitude}
        keyboardType="decimal-pad"
      />

      {/* Notes */}

      <Text style={styles.label}>
        Notes
      </Text>

      <TextInput
        style={[
          styles.input,
          styles.notesInput,
        ]}
        placeholder="Add observations..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
      />

      {/* Add button */}

      <TouchableOpacity
        style={[
          styles.button,
          creating &&
            styles.buttonDisabled,
        ]}
        onPress={
          handleCreateRecord
        }
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator
            color="#fff"
          />
        ) : (
          <Text style={styles.buttonText}>
            Add Lifecycle Record
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ========================================
// STYLES
// ========================================

const styles = StyleSheet.create({
  container: {
    padding: 24,
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
    fontSize: 30,
    fontWeight: "bold",
  },

  cropText: {
    fontSize: 15,
    color: "#666",
    marginTop: 5,
    marginBottom: 25,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 15,
  },

  emptyBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 18,
    marginBottom: 20,
  },

  emptyText: {
    color: "#777",
  },

  // =====================================
  // RECORD CARD
  // =====================================

  recordCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
  },

  stage: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#2e7d32",
    marginBottom: 8,
  },

  recordText: {
    fontSize: 15,
    marginTop: 4,
  },

  // =====================================
  // MEASUREMENTS
  // =====================================

  measurementButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#2e7d32",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  measurementButtonText: {
    color: "#2e7d32",
    fontWeight: "bold",
  },

  // =====================================
  // PHOTOS
  // =====================================

  photoButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#1976d2",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  photoButtonText: {
    color: "#1976d2",
    fontWeight: "bold",
  },

  // =====================================
  // IRRIGATION
  // =====================================

  irrigationButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ef6c00",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  irrigationButtonText: {
    color: "#ef6c00",
    fontWeight: "bold",
  },

  // =====================================
  // TREATMENTS
  // =====================================

  treatmentButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#6a1b9a",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  treatmentButtonText: {
    color: "#6a1b9a",
    fontWeight: "bold",
  },

  // =====================================
  // FORM
  // =====================================

  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },

  stageContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },

  stageOption: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  selectedStage: {
    backgroundColor: "#2e7d32",
    borderColor: "#2e7d32",
  },

  stageOptionText: {
    fontSize: 14,
  },

  selectedStageText: {
    color: "#fff",
    fontWeight: "bold",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 18,
  },

  notesInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },

  button: {
    backgroundColor: "#2e7d32",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 5,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
});