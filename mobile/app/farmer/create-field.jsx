import { useState } from "react";

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

export default function CreateField() {
  const [fieldName, setFieldName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [area, setArea] = useState("");
  const [areaUnit, setAreaUnit] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);

  const handleCreateField = async () => {
    console.log("CREATE FIELD CLICKED");

    if (!fieldName.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter a field name."
      );
      return;
    }

    try {
      setLoading(true);

      const payload = {
        field_name: fieldName.trim(),

        location_name:
          locationName.trim() || null,

        area: area.trim()
          ? Number(area)
          : null,

        area_unit:
          areaUnit.trim() || null,

        latitude: latitude.trim()
          ? Number(latitude)
          : null,

        longitude: longitude.trim()
          ? Number(longitude)
          : null,

        notes: notes.trim() || null,
      };

      console.log(
        "FIELD PAYLOAD:",
        payload
      );

      const response = await API.post(
        "/fields",
        payload
      );

      console.log(
        "FIELD CREATED:",
        response.data
      );

      // ====================================
      // REDIRECT AFTER SUCCESS
      // ====================================

      router.replace("/farmer/create-crop");

    } catch (error) {
      console.log(
        "CREATE FIELD ERROR:",
        error.response?.data ||
          error.message
      );

      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to create field."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
    >
      <Text style={styles.title}>
        Create Field
      </Text>

      <Text style={styles.subtitle}>
        Add a new field to your farm
      </Text>

      {/* FIELD NAME */}

      <Text style={styles.label}>
        Field Name *
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. North Field"
        value={fieldName}
        onChangeText={setFieldName}
      />

      {/* LOCATION */}

      <Text style={styles.label}>
        Location
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. Ahmedabad"
        value={locationName}
        onChangeText={setLocationName}
      />

      {/* AREA */}

      <Text style={styles.label}>
        Area
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. 5"
        value={area}
        onChangeText={setArea}
        keyboardType="decimal-pad"
      />

      {/* AREA UNIT */}

      <Text style={styles.label}>
        Area Unit
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. acre"
        value={areaUnit}
        onChangeText={setAreaUnit}
      />

      {/* LATITUDE */}

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

      {/* LONGITUDE */}

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

      {/* NOTES */}

      <Text style={styles.label}>
        Notes
      </Text>

      <TextInput
        style={[
          styles.input,
          styles.notesInput,
        ]}
        placeholder="Additional information..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
      />

      {/* CREATE FIELD */}

      <TouchableOpacity
        style={[
          styles.button,
          loading &&
            styles.buttonDisabled,
        ]}
        onPress={handleCreateField}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            Create Field
          </Text>
        )}
      </TouchableOpacity>

      {/* CANCEL */}

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() =>
          router.replace(
            "/farmer/create-crop"
          )
        }
        disabled={loading}
      >
        <Text style={styles.cancelText}>
          Cancel
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 50,
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

  cancelButton: {
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },

  cancelText: {
    color: "#666",
    fontSize: 16,
  },
});