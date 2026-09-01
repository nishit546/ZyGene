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
} from "expo-router";

import API from "../../../../../services/api";

export default function Measurements() {
  const { id, recordId } =
    useLocalSearchParams();

  const [measurements, setMeasurements] =
    useState([]);

  const [measurementType, setMeasurementType] =
    useState("");

  const [measurementValue, setMeasurementValue] =
    useState("");

  const [unit, setUnit] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  // --------------------------------
  // Get measurements
  // --------------------------------

  const loadMeasurements = async () => {
    try {
      const response = await API.get(
        `/measurements/${recordId}`
      );

      console.log(
        "MEASUREMENTS:",
        response.data
      );

      setMeasurements(
        response.data.measurements || []
      );
    } catch (error) {
      console.log(
        "MEASUREMENTS ERROR:",
        error.response?.data ||
          error.message
      );

      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to load measurements."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------
  // Load measurements
  // --------------------------------

  useEffect(() => {
    if (recordId) {
      loadMeasurements();
    }
  }, [recordId]);

  // --------------------------------
  // Create measurement
  // --------------------------------

  const handleCreateMeasurement =
    async () => {
      console.log(
        "CREATE MEASUREMENT CLICKED"
      );

      console.log(
        "MEASUREMENT FORM:",
        {
          lifecycle_record_id:
            recordId,
          measurement_type:
            measurementType,
          measurement_value:
            measurementValue,
          unit,
          notes,
        }
      );

      if (!measurementType.trim()) {
        Alert.alert(
          "Missing Information",
          "Please enter a measurement type."
        );

        return;
      }

      if (!measurementValue.trim()) {
        Alert.alert(
          "Missing Information",
          "Please enter a measurement value."
        );

        return;
      }

      if (
        isNaN(Number(measurementValue))
      ) {
        Alert.alert(
          "Invalid Value",
          "Measurement value must be a number."
        );

        return;
      }

      try {
        setCreating(true);

        const payload = {
          lifecycle_record_id:
            Number(recordId),

          measurement_type:
            measurementType.trim(),

          measurement_value:
            Number(measurementValue),

          unit:
            unit.trim() || null,

          notes:
            notes.trim() || null,
        };

        console.log(
          "SENDING MEASUREMENT:",
          payload
        );

        const response =
          await API.post(
            "/measurements",
            payload
          );

        console.log(
          "MEASUREMENT CREATED:",
          response.data
        );

        Alert.alert(
          "Success",
          "Measurement created successfully."
        );

        // Clear form

        setMeasurementType("");
        setMeasurementValue("");
        setUnit("");
        setNotes("");

        // Refresh measurements

        await loadMeasurements();

      } catch (error) {
        console.log(
          "CREATE MEASUREMENT ERROR:",
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
            "Failed to create measurement."
        );
      } finally {
        setCreating(false);
      }
    };

  // --------------------------------
  // Loading
  // --------------------------------

  if (loading) {
    return (
      <View
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
        />

        <Text style={styles.loadingText}>
          Loading measurements...
        </Text>
      </View>
    );
  }

  // --------------------------------
  // Screen
  // --------------------------------

  return (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
    >
      <Text style={styles.title}>
        Measurements
      </Text>

      <Text style={styles.subtitle}>
        Crop ID: {id}
      </Text>

      <Text style={styles.subtitle}>
        Lifecycle Record: {recordId}
      </Text>

      {/* ========================== */}
      {/* Existing Measurements */}
      {/* ========================== */}

      <Text style={styles.sectionTitle}>
        Recorded Measurements
      </Text>

      {measurements.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No measurements recorded yet.
          </Text>
        </View>
      ) : (
        measurements.map(
          (measurement) => (
            <View
              key={measurement.id}
              style={styles.card}
            >
              <Text
                style={
                  styles.measurementType
                }
              >
                {
                  measurement.measurement_type
                }
              </Text>

              <Text style={styles.value}>
                {
                  measurement.measurement_value
                }{" "}
                {measurement.unit || ""}
              </Text>

              {measurement.notes && (
                <Text
                  style={styles.notes}
                >
                  Notes:{" "}
                  {measurement.notes}
                </Text>
              )}
            </View>
          )
        )
      )}

      {/* ========================== */}
      {/* Add Measurement */}
      {/* ========================== */}

      <Text style={styles.sectionTitle}>
        Add Measurement
      </Text>

      <Text style={styles.label}>
        Measurement Type *
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. Plant Height"
        value={measurementType}
        onChangeText={
          setMeasurementType
        }
      />

      <Text style={styles.label}>
        Measurement Value *
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. 25"
        value={measurementValue}
        onChangeText={
          setMeasurementValue
        }
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>
        Unit
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. cm"
        value={unit}
        onChangeText={setUnit}
      />

      <Text style={styles.label}>
        Notes
      </Text>

      <TextInput
        style={[
          styles.input,
          styles.notesInput,
        ]}
        placeholder="Additional notes..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={[
          styles.button,
          creating &&
            styles.buttonDisabled,
        ]}
        onPress={
          handleCreateMeasurement
        }
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator
            color="#fff"
          />
        ) : (
          <Text style={styles.buttonText}>
            Add Measurement
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

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

  subtitle: {
    fontSize: 15,
    color: "#666",
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 28,
    marginBottom: 15,
  },

  emptyBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 18,
  },

  emptyText: {
    color: "#777",
  },

  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  measurementType: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2e7d32",
    marginBottom: 6,
  },

  value: {
    fontSize: 18,
    fontWeight: "600",
  },

  notes: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 7,
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