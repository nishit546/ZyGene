import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import API from "../../../services/api";
import FarmerHeader from "../../../components/ui/FarmerHeader";
import { COLORS } from "../../../constants/theme";

export default function CropDetails() {
  const { id } = useLocalSearchParams();

  const [crop, setCrop] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCrop = async () => {
    try {
      const response = await API.get(`/crops/${id}`);

      console.log(
        "CROP DETAILS:",
        response.data
      );

      setCrop(response.data.crop);
    } catch (error) {
      console.log(
        "CROP DETAILS ERROR:",
        error.response?.data || error.message
      );

      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to load crop."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadCrop();
    }
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            Loading crop...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!crop) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
        <FarmerHeader title="Crop Details" showBack={true} />
        <View style={styles.loadingContainer}>
          <Text style={styles.notFoundText}>
            Crop not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <FarmerHeader
        title={crop.crop_name}
        subtitle={`Variety: ${crop.variety || "Not specified"}`}
        showBack={true}
      />
      <ScrollView
        contentContainerStyle={styles.container}
      >

      {/* Field */}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Field
        </Text>

        <Text style={styles.value}>
          {crop.field_name || "Not specified"}
        </Text>

        {crop.location_name && (
          <Text style={styles.secondary}>
            Location: {crop.location_name}
          </Text>
        )}
      </View>

      {/* Sowing Date */}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Sowing Date
        </Text>

        <Text style={styles.value}>
          {crop.sowing_date || "Not specified"}
        </Text>
      </View>

      {/* Expected Harvest Date */}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Expected Harvest Date
        </Text>

        <Text style={styles.value}>
          {crop.expected_harvest_date ||
            "Not specified"}
        </Text>
      </View>

      {/* Status */}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Status
        </Text>

        <Text style={styles.status}>
          {crop.crop_status || "Active"}
        </Text>
      </View>

      {/* Notes */}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Notes
        </Text>

        <Text style={styles.value}>
          {crop.notes || "No notes added."}
        </Text>
      </View>

      {/* Lifecycle Button */}

      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          router.push(
            `/farmer/crop-details/${id}/lifecycle`
          )
        }
      >
        <Text style={styles.buttonText}>
          View Crop Lifecycle
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.historyButton}
        onPress={() =>
          router.push(
            `/farmer/crop-details/${id}/history`
          )
        }
      >
        <Text style={styles.historyButtonText}>
          View Full History
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickAddButton}
        onPress={() =>
          router.push(
            `/farmer/field-work?cropId=${id}`
          )
        }
      >
        <Text style={styles.quickAddButtonText}>
          + Add Record
        </Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
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

  notFoundText: {
    fontSize: 17,
  },

  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 5,
  },

  variety: {
    fontSize: 17,
    color: "#666",
    marginBottom: 25,
  },

  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
    marginBottom: 7,
  },

  value: {
    fontSize: 17,
  },

  secondary: {
    fontSize: 14,
    color: "#777",
    marginTop: 5,
  },

  status: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#2e7d32",
    textTransform: "capitalize",
  },

  button: {
    backgroundColor: "#2e7d32",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
  
  quickAddButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2e7d32",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  
  quickAddButtonText: {
    color: "#2e7d32",
    fontSize: 17,
    fontWeight: "bold",
  },

  historyButton: {
    backgroundColor: "#e8f5e9", // subtle green
    borderWidth: 1,
    borderColor: "#a5d6a7",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  historyButtonText: {
    color: "#1b5e20",
    fontSize: 17,
    fontWeight: "bold",
  },
});