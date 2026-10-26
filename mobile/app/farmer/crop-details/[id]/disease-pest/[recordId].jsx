import { useEffect, useState } from "react";

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


const OBSERVATION_TYPES = [
  {
    value: "disease",
    label: "Disease",
  },
  {
    value: "pest",
    label: "Pest",
  },
];

const SEVERITIES = [
  {
    value: "low",
    label: "Low",
  },
  {
    value: "moderate",
    label: "Moderate",
  },
  {
    value: "high",
    label: "High",
  },
  {
    value: "severe",
    label: "Severe",
  },
];

export default function DiseasePest() {
  const { id, recordId } =
    useLocalSearchParams();

  const [observations, setObservations] =
    useState([]);

  const [observationType, setObservationType] =
    useState("disease");

  const [name, setName] = useState("");

  const [severity, setSeverity] =
    useState("");

  const [affectedPercentage, setAffectedPercentage] =
    useState("");

  const [observationDate, setObservationDate] =
    useState("");

  const [notes, setNotes] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  // LOAD OBSERVATIONS

  const loadObservations = async () => {
    try {
      const response = await API.get(
        `/disease-pest/${recordId}`
      );

      console.log(
        "DISEASE PEST:",
        response.data
      );

      setObservations(
        response.data.observations || []
      );
    } catch (error) {
      console.log(
        "DISEASE PEST ERROR:",
        error.response?.data ||
          error.message
      );

      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to load disease/pest observations."
      );
    } finally {
      setLoading(false);
    }
  };

  // LOAD ON SCREEN OPEN

  useEffect(() => {
    if (recordId) {
      loadObservations();
    }
  }, [recordId]);

  // CREATE OBSERVATION

  const handleCreateObservation =
    async () => {
      console.log(
        "CREATE OBSERVATION CLICKED"
      );

      if (!observationType) {
        Alert.alert(
          "Missing Information",
          "Please select disease or pest."
        );
        return;
      }

      if (!name.trim()) {
        Alert.alert(
          "Missing Information",
          "Please enter the disease or pest name."
        );
        return;
      }

      if (!observationDate.trim()) {
        Alert.alert(
          "Missing Information",
          "Please enter the observation date."
        );
        return;
      }

      const datePattern =
        /^\d{4}-\d{2}-\d{2}$/;

      if (
        !datePattern.test(
          observationDate.trim()
        )
      ) {
        Alert.alert(
          "Invalid Date",
          "Please use YYYY-MM-DD format."
        );
        return;
      }

      if (affectedPercentage.trim()) {
        const percentage = Number(
          affectedPercentage
        );

        if (
          Number.isNaN(percentage) ||
          percentage < 0 ||
          percentage > 100
        ) {
          Alert.alert(
            "Invalid Percentage",
            "Affected percentage must be between 0 and 100."
          );
          return;
        }
      }

      try {
        setCreating(true);

        const payload = {
          lifecycle_record_id:
            Number(recordId),

          observation_type:
            observationType,

          name: name.trim(),

          severity:
            severity || null,

          affected_percentage:
            affectedPercentage.trim()
              ? Number(affectedPercentage)
              : null,

          observation_date:
            observationDate.trim(),

          notes:
            notes.trim() || null,
        };

        console.log(
          "OBSERVATION PAYLOAD:",
          payload
        );

        const response =
          await API.post(
            "/disease-pest",
            payload
          );

        console.log(
          "OBSERVATION CREATED:",
          response.data
        );

        Alert.alert(
          "Success",
          "Disease/pest observation added successfully."
        );

        // Clear form

        setObservationType(
          "disease"
        );

        setName("");
        setSeverity("");
        setAffectedPercentage("");
        setObservationDate("");
        setNotes("");

        // Reload records

        await loadObservations();
      } catch (error) {
        console.log(
          "CREATE OBSERVATION ERROR:",
          error
        );

        console.log(
          "STATUS:",
          error.response?.status
        );

        console.log(
          "SERVER ERROR:",
          error.response?.data
        );

        Alert.alert(
          "Error",
          error.response?.data?.message ||
            "Failed to create observation."
        );
      } finally {
        setCreating(false);
      }
    };

  // LOADING

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
          Loading observations...
        </Text>
      </View>
    );
  }

  // SCREEN

  return (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
    >
      <Text style={styles.title}>
        Disease & Pest
      </Text>

      <Text style={styles.subtitle}>
        Crop ID: {id}
      </Text>

      <Text style={styles.subtitle}>
        Lifecycle Record ID: {recordId}
      </Text>

      {/* EXISTING OBSERVATIONS */}

      <Text style={styles.sectionTitle}>
        Observations
      </Text>

      {observations.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No disease or pest observations yet.
          </Text>
        </View>
      ) : (
        observations.map(
          (observation) => (
            <View
              key={observation.id}
              style={styles.observationCard}
            >
              {/* TYPE */}

              <Text
                style={
                  observation.observation_type ===
                  "disease"
                    ? styles.diseaseTitle
                    : styles.pestTitle
                }
              >
                {observation.observation_type ===
                "disease"
                  ? "Disease"
                  : "Pest"}
              </Text>

              {/* NAME */}

              <Text
                style={styles.observationName}
              >
                {observation.name}
              </Text>

              {/* SEVERITY */}

              {observation.severity && (
                <Text
                  style={
                    styles.observationText
                  }
                >
                  Severity:{" "}
                  {observation.severity}
                </Text>
              )}

              {/* AFFECTED */}

              {observation.affected_percentage !==
                null &&
                observation.affected_percentage !==
                  undefined && (
                  <Text
                    style={
                      styles.observationText
                    }
                  >
                    Affected:{" "}
                    {
                      observation.affected_percentage
                    }
                    %
                  </Text>
                )}

              {/* DATE */}

              <Text
                style={
                  styles.observationText
                }
              >
                Date:{" "}
                {
                  observation.observation_date
                }
              </Text>

              {/* NOTES */}

              {observation.notes && (
                <Text
                  style={
                    styles.observationText
                  }
                >
                  Notes:{" "}
                  {observation.notes}
                </Text>
              )}
            </View>
          )
        )
      )}

      {/* ADD OBSERVATION */}

      <Text style={styles.sectionTitle}>
        Add Disease / Pest Observation
      </Text>

      {/* TYPE */}

      <Text style={styles.label}>
        Observation Type *
      </Text>

      <View
        style={
          styles.optionsContainer
        }
      >
        {OBSERVATION_TYPES.map(
          (item) => {
            const selected =
              observationType ===
              item.value;

            return (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.option,
                  selected &&
                    styles.selectedOption,
                ]}
                onPress={() =>
                  setObservationType(
                    item.value
                  )
                }
              >
                <Text
                  style={[
                    styles.optionText,
                    selected &&
                      styles.selectedOptionText,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }
        )}
      </View>

      {/* NAME */}

      <Text style={styles.label}>
        Disease / Pest Name *
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. Leaf Blight"
        value={name}
        onChangeText={setName}
      />

      {/* SEVERITY */}

      <Text style={styles.label}>
        Severity
      </Text>

      <View
        style={
          styles.optionsContainer
        }
      >
        {SEVERITIES.map(
          (item) => {
            const selected =
              severity === item.value;

            return (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.option,
                  selected &&
                    styles.selectedOption,
                ]}
                onPress={() =>
                  setSeverity(
                    selected
                      ? ""
                      : item.value
                  )
                }
              >
                <Text
                  style={[
                    styles.optionText,
                    selected &&
                      styles.selectedOptionText,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }
        )}
      </View>

      {/* AFFECTED PERCENTAGE */}

      <Text style={styles.label}>
        Affected Percentage
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. 25.5"
        value={affectedPercentage}
        onChangeText={
          setAffectedPercentage
        }
        keyboardType="decimal-pad"
      />

      {/* DATE */}

      <Text style={styles.label}>
        Observation Date *
      </Text>

      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={observationDate}
        onChangeText={
          setObservationDate
        }
      />

      {/* NOTES */}

      <Text style={styles.label}>
        Notes
      </Text>

      <TextInput
        style={[
          styles.input,
          styles.notesInput,
        ]}
        placeholder="Describe the observation..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
      />

      {/* SUBMIT */}

      <TouchableOpacity
        style={[
          styles.button,
          creating &&
            styles.buttonDisabled,
        ]}
        onPress={
          handleCreateObservation
        }
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator
            color="#fff"
          />
        ) : (
          <Text style={styles.buttonText}>
            Add Observation
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// STYLES

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
    marginBottom: 5,
  },

  subtitle: {
    color: "#666",
    marginBottom: 3,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 25,
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

  // OBSERVATION CARD

  observationCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  diseaseTitle: {
    color: "#c62828",
    fontSize: 15,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  pestTitle: {
    color: "#ef6c00",
    fontSize: 15,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  observationName: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 5,
    marginBottom: 8,
  },

  observationText: {
    fontSize: 15,
    marginTop: 4,
  },

  // FORM

  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },

  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },

  option: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  selectedOption: {
    backgroundColor: "#6a1b9a",
    borderColor: "#6a1b9a",
  },

  optionText: {
    fontSize: 14,
  },

  selectedOptionText: {
    color: "#fff",
    fontWeight: "bold",
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