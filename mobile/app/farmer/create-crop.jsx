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
} from "react-native";
import { router } from "expo-router";

import API from "../../services/api";

export default function CreateCrop() {
  const [fields, setFields] = useState([]);

  const [fieldId, setFieldId] = useState("");
  const [cropName, setCropName] = useState("");
  const [variety, setVariety] = useState("");
  const [sowingDate, setSowingDate] = useState("");
  const [expectedHarvestDate, setExpectedHarvestDate] =
    useState("");
  const [notes, setNotes] = useState("");

  const [loadingFields, setLoadingFields] =
    useState(true);

  const [loading, setLoading] = useState(false);

  // Fetch farmer's fields
  const loadFields = async () => {
    try {
      const response = await API.get("/fields");

      console.log(
        "FIELDS FOR CROP:",
        response.data
      );

      setFields(response.data.fields || []);

    } catch (error) {
      console.log(
        "LOAD FIELDS ERROR:",
        error.response?.data ||
          error.message
      );

      Alert.alert(
        "Error",
        "Failed to load your fields."
      );

    } finally {
      setLoadingFields(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, []);

  const handleCreateCrop = async () => {
    if (!fieldId) {
      Alert.alert(
        "Missing Information",
        "Please select a field."
      );
      return;
    }

    if (!cropName.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter a crop name."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await API.post("/crops", {
        field_id: Number(fieldId),

        crop_name: cropName.trim(),

        variety:
          variety.trim() || null,

        sowing_date:
          sowingDate.trim() || null,

        expected_harvest_date:
          expectedHarvestDate.trim() || null,

        notes:
          notes.trim() || null,
      });

      console.log(
        "CROP CREATED:",
        response.data
      );

      Alert.alert(
        "Success",
        "Crop created successfully.",
        [
          {
            text: "OK",
            onPress: () =>
              router.replace(
                "/farmer/dashboard"
              ),
          },
        ]
      );

    } catch (error) {
      console.log(
        "CREATE CROP ERROR:",
        error.response?.data ||
          error.message
      );

      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to create crop."
      );

    } finally {
      setLoading(false);
    }
  };

  if (loadingFields) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading fields...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>
        Create Crop
      </Text>

      <Text style={styles.subtitle}>
        Add a crop to one of your fields
      </Text>

      {/* Field */}

      <Text style={styles.label}>
        Select Field *
      </Text>

      {fields.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text>
            You don't have any fields yet.
          </Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              router.push(
                "/farmer/create-field"
              )
            }
          >
            <Text style={styles.secondaryButtonText}>
              + Create Field
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        fields.map((field) => (
          <TouchableOpacity
            key={field.id}
            style={[
              styles.fieldOption,
              fieldId === String(field.id) &&
                styles.selectedField,
            ]}
            onPress={() =>
              setFieldId(String(field.id))
            }
          >
            <Text
              style={[
                styles.fieldText,
                fieldId === String(field.id) &&
                  styles.selectedFieldText,
              ]}
            >
              {field.field_name}
            </Text>

            {field.location_name && (
              <Text style={styles.locationText}>
                {field.location_name}
              </Text>
            )}
          </TouchableOpacity>
        ))
      )}

      {/* Crop Name */}

      <Text style={styles.label}>
        Crop Name *
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. Wheat"
        value={cropName}
        onChangeText={setCropName}
      />

      {/* Variety */}

      <Text style={styles.label}>
        Variety
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. GW-322"
        value={variety}
        onChangeText={setVariety}
      />

      {/* Sowing Date */}

      <Text style={styles.label}>
        Sowing Date
      </Text>

      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={sowingDate}
        onChangeText={setSowingDate}
      />

      {/* Expected Harvest Date */}

      <Text style={styles.label}>
        Expected Harvest Date
      </Text>

      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={expectedHarvestDate}
        onChangeText={
          setExpectedHarvestDate
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
        placeholder="Additional notes..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
      />

      {/* Create */}

      {fields.length > 0 && (
        <TouchableOpacity
          style={[
            styles.button,
            loading &&
              styles.buttonDisabled,
          ]}
          onPress={handleCreateCrop}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Create Crop
            </Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
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
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
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

  fieldOption: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },

  selectedField: {
    borderWidth: 2,
    borderColor: "#2e7d32",
  },

  fieldText: {
    fontSize: 16,
    fontWeight: "600",
  },

  selectedFieldText: {
    color: "#2e7d32",
  },

  locationText: {
    marginTop: 4,
    color: "#777",
  },

  emptyBox: {
    padding: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 20,
  },

  secondaryButton: {
    marginTop: 15,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2e7d32",
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#2e7d32",
    fontWeight: "bold",
  },

  button: {
    backgroundColor: "#2e7d32",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
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