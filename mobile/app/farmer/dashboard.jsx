import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";

import { router } from "expo-router";

import API from "../../services/api";

export default function FarmerDashboard() {
  const [fields, setFields] = useState([]);
  const [crops, setCrops] = useState([]);

  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [fieldsResponse, cropsResponse] =
        await Promise.all([
          API.get("/fields"),
          API.get("/crops"),
        ]);

      console.log(
        "FIELDS:",
        fieldsResponse.data
      );

      console.log(
        "CROPS:",
        cropsResponse.data
      );

      setFields(
        fieldsResponse.data.fields || []
      );

      setCrops(
        cropsResponse.data.crops || []
      );

    } catch (error) {
      console.log(
        "DASHBOARD ERROR:",
        error.response?.data ||
          error.message
      );

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading ZyGene...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
    >

      <Text style={styles.title}>
        🌱 ZyGene
      </Text>

      <Text style={styles.subtitle}>
        Farmer Dashboard
      </Text>

      {/* Statistics */}

      <View style={styles.statsContainer}>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {fields.length}
          </Text>

          <Text style={styles.statLabel}>
            Fields
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {crops.length}
          </Text>

          <Text style={styles.statLabel}>
            Crops
          </Text>
        </View>

      </View>

      {/* Create Crop */}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() =>
          router.push(
            "/farmer/create-crop"
          )
        }
      >
        <Text style={styles.primaryButtonText}>
          + Create Crop
        </Text>
      </TouchableOpacity>

      {/* Fields */}

      <Text style={styles.sectionTitle}>
        My Fields
      </Text>

      {fields.length === 0 ? (
        <Text style={styles.emptyText}>
          No fields found.
        </Text>
      ) : (
        fields.map((field) => (
          <View
            key={field.id}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>
              {field.field_name}
            </Text>
          </View>
        ))
      )}

      {/* Crops */}

      <Text style={styles.sectionTitle}>
        My Crops
      </Text>

      {crops.length === 0 ? (
        <Text style={styles.emptyText}>
          No crops found.
        </Text>
      ) : (
        crops.map((crop) => (
          <TouchableOpacity
            key={crop.id}
            style={styles.card}
            onPress={() =>
              router.push(
                `/farmer/crop-details/${crop.id}`
              )
            }
          >
            <Text style={styles.cardTitle}>
              {crop.crop_name}
            </Text>

            <Text style={styles.cardText}>
              Variety: {crop.variety}
            </Text>

            <Text style={styles.cardText}>
              Sowing Date:{" "}
              {crop.sowing_date}
            </Text>
          </TouchableOpacity>
        ))
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
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
    fontSize: 32,
    fontWeight: "bold",
  },

  subtitle: {
    fontSize: 18,
    marginTop: 5,
    marginBottom: 25,
  },

  statsContainer: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 25,
  },

  statCard: {
    flex: 1,
    padding: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    alignItems: "center",
  },

  statNumber: {
    fontSize: 30,
    fontWeight: "bold",
  },

  statLabel: {
    fontSize: 15,
    marginTop: 5,
  },

  primaryButton: {
    backgroundColor: "#2e7d32",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 30,
  },

  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    marginTop: 10,
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
  },

  cardText: {
    fontSize: 14,
    marginTop: 5,
  },

  emptyText: {
    color: "#777",
    marginBottom: 15,
  },
});