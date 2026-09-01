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

import { useLocalSearchParams } from "expo-router";

import API from "../../../../../services/api";

const TREATMENT_TYPES = [
  {
    value: "fertilizer",
    label: "Fertilizer",
  },
  {
    value: "pesticide",
    label: "Pesticide",
  },
  {
    value: "fungicide",
    label: "Fungicide",
  },
  {
    value: "herbicide",
    label: "Herbicide",
  },
  {
    value: "other",
    label: "Other",
  },
];

export default function Treatments() {
  const { id, recordId } =
    useLocalSearchParams();

  const [treatments, setTreatments] =
    useState([]);

  const [treatmentType, setTreatmentType] =
    useState("");

  const [productName, setProductName] =
    useState("");

  const [quantity, setQuantity] =
    useState("");

  const [quantityUnit, setQuantityUnit] =
    useState("");

  const [applicationMethod, setApplicationMethod] =
    useState("");

  const [applicationDate, setApplicationDate] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  // ========================================
  // GET TREATMENTS
  // ========================================

  const loadTreatments = async () => {
    try {
      const response = await API.get(
        `/treatments/${recordId}`
      );

      console.log(
        "TREATMENTS:",
        response.data
      );

      setTreatments(
        response.data.treatments || []
      );
    } catch (error) {
      console.log(
        "TREATMENTS ERROR:",
        error.response?.data ||
          error.message
      );

      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to load treatments."
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // LOAD SCREEN
  // ========================================

  useEffect(() => {
    if (recordId) {
      loadTreatments();
    }
  }, [recordId]);

  // ========================================
  // CREATE TREATMENT
  // ========================================

  const handleCreateTreatment =
    async () => {
      console.log(
        "CREATE TREATMENT CLICKED"
      );

      console.log(
        "TREATMENT FORM:",
        {
          lifecycle_record_id:
            recordId,
          treatment_type:
            treatmentType,
          product_name:
            productName,
          quantity,
          quantity_unit:
            quantityUnit,
          application_method:
            applicationMethod,
          application_date:
            applicationDate,
          notes,
        }
      );

      // Required fields

      if (!treatmentType) {
        Alert.alert(
          "Missing Information",
          "Please select a treatment type."
        );

        return;
      }

      if (!applicationDate.trim()) {
        Alert.alert(
          "Missing Information",
          "Please enter the application date."
        );

        return;
      }

      // Date validation

      const datePattern =
        /^\d{4}-\d{2}-\d{2}$/;

      if (
        !datePattern.test(
          applicationDate.trim()
        )
      ) {
        Alert.alert(
          "Invalid Date",
          "Please use YYYY-MM-DD format."
        );

        return;
      }

      // Quantity validation

      if (
        quantity.trim() &&
        isNaN(Number(quantity))
      ) {
        Alert.alert(
          "Invalid Quantity",
          "Quantity must be a number."
        );

        return;
      }

      try {
        setCreating(true);

        const payload = {
          lifecycle_record_id:
            Number(recordId),

          treatment_type:
            treatmentType,

          product_name:
            productName.trim() ||
            null,

          quantity:
            quantity.trim()
              ? Number(quantity)
              : null,

          quantity_unit:
            quantityUnit.trim() ||
            null,

          application_method:
            applicationMethod.trim() ||
            null,

          application_date:
            applicationDate.trim(),

          notes:
            notes.trim() || null,
        };

        console.log(
          "TREATMENT PAYLOAD:",
          payload
        );

        const response =
          await API.post(
            "/treatments",
            payload
          );

        console.log(
          "TREATMENT CREATED:",
          response.data
        );

        Alert.alert(
          "Success",
          "Treatment record created successfully."
        );

        // Clear form

        setTreatmentType("");
        setProductName("");
        setQuantity("");
        setQuantityUnit("");
        setApplicationMethod("");
        setApplicationDate("");
        setNotes("");

        // Reload

        await loadTreatments();

      } catch (error) {
        console.log(
          "CREATE TREATMENT ERROR:",
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
            "Failed to create treatment."
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
          Loading treatments...
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
        Treatments
      </Text>

      <Text style={styles.subtitle}>
        Crop ID: {id}
      </Text>

      <Text style={styles.subtitle}>
        Lifecycle Record: {recordId}
      </Text>

      {/* ================================= */}
      {/* EXISTING TREATMENTS */}
      {/* ================================= */}

      <Text style={styles.sectionTitle}>
        Treatment Records
      </Text>

      {treatments.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No treatment records yet.
          </Text>
        </View>
      ) : (
        treatments.map((treatment) => (
          <View
            key={treatment.id}
            style={styles.card}
          >
            <Text
              style={styles.cardTitle}
            >
              {treatment.treatment_type}
            </Text>

            {treatment.product_name && (
              <Text style={styles.value}>
                Product:{" "}
                {treatment.product_name}
              </Text>
            )}

            <Text style={styles.value}>
              Date:{" "}
              {treatment.application_date}
            </Text>

            {treatment.quantity !==
              null &&
              treatment.quantity !==
                undefined && (
                <Text
                  style={styles.value}
                >
                  Quantity:{" "}
                  {treatment.quantity}{" "}
                  {treatment.quantity_unit ||
                    ""}
                </Text>
              )}

            {treatment.application_method && (
              <Text style={styles.value}>
                Method:{" "}
                {treatment.application_method}
              </Text>
            )}

            {treatment.notes && (
              <Text
                style={styles.notes}
              >
                Notes: {treatment.notes}
              </Text>
            )}
          </View>
        ))
      )}

      {/* ================================= */}
      {/* ADD TREATMENT */}
      {/* ================================= */}

      <Text style={styles.sectionTitle}>
        Add Treatment
      </Text>

      {/* Treatment Type */}

      <Text style={styles.label}>
        Treatment Type *
      </Text>

      <View
        style={
          styles.typeContainer
        }
      >
        {TREATMENT_TYPES.map(
          (item) => {
            const selected =
              treatmentType ===
              item.value;

            return (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.typeOption,
                  selected &&
                    styles.selectedType,
                ]}
                onPress={() =>
                  setTreatmentType(
                    item.value
                  )
                }
              >
                <Text
                  style={[
                    styles.typeText,
                    selected &&
                      styles.selectedTypeText,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }
        )}
      </View>

      {/* Product */}

      <Text style={styles.label}>
        Product Name
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. NPK 10-10-10"
        value={productName}
        onChangeText={
          setProductName
        }
      />

      {/* Quantity */}

      <Text style={styles.label}>
        Quantity
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. 2.5"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
      />

      {/* Unit */}

      <Text style={styles.label}>
        Quantity Unit
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. kg"
        value={quantityUnit}
        onChangeText={
          setQuantityUnit
        }
      />

      {/* Method */}

      <Text style={styles.label}>
        Application Method
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. Soil application"
        value={applicationMethod}
        onChangeText={
          setApplicationMethod
        }
      />

      {/* Date */}

      <Text style={styles.label}>
        Application Date *
      </Text>

      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={applicationDate}
        onChangeText={
          setApplicationDate
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
        placeholder="Add treatment notes..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
      />

      {/* Button */}

      <TouchableOpacity
        style={[
          styles.button,
          creating &&
            styles.buttonDisabled,
        ]}
        onPress={
          handleCreateTreatment
        }
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator
            color="#fff"
          />
        ) : (
          <Text style={styles.buttonText}>
            Add Treatment
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
    color: "#6a1b9a",
    textTransform: "capitalize",
    marginBottom: 8,
  },

  value: {
    fontSize: 16,
    marginTop: 5,
  },

  notes: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },

  typeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },

  typeOption: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  selectedType: {
    backgroundColor: "#6a1b9a",
    borderColor: "#6a1b9a",
  },

  typeText: {
    fontSize: 14,
  },

  selectedTypeText: {
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
    backgroundColor: "#6a1b9a",
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