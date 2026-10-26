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
  Platform,
} from "react-native";

import { useLocalSearchParams } from "expo-router";

import API from "../../../../../services/api";

export default function Irrigation() {
  const { id, recordId } =
    useLocalSearchParams();

  const [irrigation, setIrrigation] =
    useState([]);

  const [irrigationDate, setIrrigationDate] =
    useState("");

  const [waterAmount, setWaterAmount] =
    useState("");

  const [waterUnit, setWaterUnit] =
    useState("");

  const [irrigationMethod, setIrrigationMethod] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  // ========================================
  // GET IRRIGATION RECORDS
  // ========================================

  const loadIrrigation = async () => {
    try {
      const response = await API.get(
        `/irrigation/${recordId}`
      );

      console.log(
        "IRRIGATION:",
        response.data
      );

      setIrrigation(
        response.data.irrigation || []
      );
    } catch (error) {
      console.log(
        "IRRIGATION ERROR:",
        error.response?.data ||
          error.message
      );

      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to load irrigation records."
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // LOAD ON SCREEN OPEN
  // ========================================

  useEffect(() => {
    if (recordId) {
      loadIrrigation();
    }
  }, [recordId]);

  // ========================================
  // CREATE IRRIGATION
  // ========================================

  const handleCreateIrrigation =
    async () => {
      console.log(
        "CREATE IRRIGATION CLICKED"
      );

      console.log(
        "IRRIGATION FORM:",
        {
          lifecycle_record_id:
            recordId,
          irrigation_date:
            irrigationDate,
          water_amount:
            waterAmount,
          water_unit:
            waterUnit,
          irrigation_method:
            irrigationMethod,
          notes,
        }
      );

      if (!irrigationDate.trim()) {
        Alert.alert(
          "Missing Information",
          "Please enter the irrigation date."
        );

        return;
      }

      const datePattern =
        /^\d{4}-\d{2}-\d{2}$/;

      if (
        !datePattern.test(
          irrigationDate.trim()
        )
      ) {
        Alert.alert(
          "Invalid Date",
          "Please use YYYY-MM-DD format."
        );

        return;
      }

      if (
        waterAmount.trim() &&
        isNaN(Number(waterAmount))
      ) {
        Alert.alert(
          "Invalid Water Amount",
          "Water amount must be a number."
        );

        return;
      }

      try {
        setCreating(true);

        const payload = {
          lifecycle_record_id:
            Number(recordId),

          irrigation_date:
            irrigationDate.trim(),

          water_amount:
            waterAmount.trim()
              ? Number(waterAmount)
              : null,

          water_unit:
            waterUnit.trim() || null,

          irrigation_method:
            irrigationMethod.trim() ||
            null,

          notes:
            notes.trim() || null,
        };

        console.log(
          "SENDING IRRIGATION:",
          payload
        );

        const response =
          await API.post(
            "/irrigation",
            payload
          );

        console.log(
          "IRRIGATION CREATED:",
          response.data
        );

        Alert.alert(
          "Success",
          "Irrigation record created successfully."
        );

        setIrrigationDate("");
        setWaterAmount("");
        setWaterUnit("");
        setIrrigationMethod("");
        setNotes("");

        await loadIrrigation();

      } catch (error) {
        console.log(
          "CREATE IRRIGATION ERROR:",
          error
        );

        console.log(
          "SERVER ERROR:",
          error.response?.data ||
            error.message
        );

        Alert.alert(
          "Error",
          error.response?.data?.message ||
            "Failed to create irrigation record."
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
          Loading irrigation...
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
        Irrigation
      </Text>

      <Text style={styles.subtitle}>
        Crop ID: {id}
      </Text>

      <Text style={styles.subtitle}>
        Lifecycle Record: {recordId}
      </Text>

      {/* ================================= */}
      {/* EXISTING IRRIGATION */}
      {/* ================================= */}

      <Text style={styles.sectionTitle}>
        Irrigation Records
      </Text>

      {irrigation.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No irrigation records yet.
          </Text>
        </View>
      ) : (
        irrigation.map((record) => (
          <View
            key={record.id}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>
              {record.irrigation_method ||
                "Irrigation"}
            </Text>

            <Text style={styles.value}>
              Date:{" "}
              {record.irrigation_date}
            </Text>

            {record.water_amount !==
              null &&
              record.water_amount !==
                undefined && (
                <Text
                  style={styles.value}
                >
                  Water:{" "}
                  {record.water_amount}{" "}
                  {record.water_unit ||
                    ""}
                </Text>
              )}

            {record.notes && (
              <Text
                style={styles.notes}
              >
                Notes: {record.notes}
              </Text>
            )}
          </View>
        ))
      )}

      {/* ================================= */}
      {/* ADD IRRIGATION */}
      {/* ================================= */}

      <Text style={styles.sectionTitle}>
        Add Irrigation
      </Text>

      {/* Date */}

      <Text style={styles.label}>
        Irrigation Date *
      </Text>

      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={irrigationDate}
        onChangeText={
          setIrrigationDate
        }
      />

      {/* Water Amount */}

      <Text style={styles.label}>
        Water Amount
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. 50"
        value={waterAmount}
        onChangeText={setWaterAmount}
        keyboardType="decimal-pad"
      />

      {/* Water Unit */}

      <Text style={styles.label}>
        Water Unit
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. liters"
        value={waterUnit}
        onChangeText={setWaterUnit}
      />

      {/* Method */}

      <Text style={styles.label}>
        Irrigation Method
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. Drip irrigation"
        value={irrigationMethod}
        onChangeText={
          setIrrigationMethod
        }
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
        placeholder="Add irrigation notes..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
      />

      {/* Submit */}

      <TouchableOpacity
        style={[
          styles.button,
          creating &&
            styles.buttonDisabled,
        ]}
        onPress={
          handleCreateIrrigation
        }
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator
            color="#fff"
          />
        ) : (
          <Text style={styles.buttonText}>
            Add Irrigation
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

  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2e7d32",
    marginBottom: 8,
  },

  value: {
    fontSize: 16,
    marginTop: 4,
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
    backgroundColor: "#ffffff",
    borderWidth: 1.2,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 18,
    ...Platform.select({
      web: {
        outlineStyle: "none",
        outlineWidth: 0,
        boxShadow: "none",
      },
    }),
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