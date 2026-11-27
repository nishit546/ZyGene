import { useEffect, useState, useCallback } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import API from "../../../services/api";
import FarmerHeader from "../../../components/ui/FarmerHeader";
import { COLORS } from "../../../constants/theme";
import SyncStatus from "../../../components/SyncStatus";
import useNetworkStatus from "../../../hooks/useNetworkStatus";
import { getCachedCropById } from "../../../services/offlineStorage";
import { copyToClipboard, shareText, shareFile } from "../../../services/shareService";
import { exportCropReportPDF } from "../../../services/fileService";
import ContactPickerModal from "../../../components/ContactPickerModal";
import ReportExportCard from "../../../components/ui/ReportExportCard";

export default function CropDetails() {
  const { id } = useLocalSearchParams();

  const [crop, setCrop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [lastPdfUri, setLastPdfUri] = useState(null);
  const [lastPdfFilename, setLastPdfFilename] = useState(null);

  const handleCopyCropId = () => {
    copyToClipboard(id, "Crop ID");
  };

  const buildCropSummary = () => {
    return [
      `🌾 *ZyGene Crop Summary: ${crop?.crop_name || "Crop"}*`,
      `• Variety: ${crop?.variety || "Standard"}`,
      `• Field: ${crop?.field_name || "Not specified"}`,
      `• Status: ${crop?.crop_status || "Active"}`,
      `• Sowing Date: ${crop?.sowing_date || "Not recorded"}`,
      `• Expected Harvest: ${crop?.expected_harvest_date || "TBD"}`,
      `• Crop ID: ${id}`,
      `Shared from ZyGene AgriTech Platform.`,
    ].join("\n");
  };

  const handleShareSummary = async () => {
    const summary = buildCropSummary();
    await shareText({
      title: `Crop Summary: ${crop?.crop_name || "Crop"}`,
      message: summary,
    });
  };

  const handleSelectContact = async (contact) => {
    const summary = buildCropSummary();
    await shareText({
      title: `Crop Report for ${contact.name}`,
      message: `Hi ${contact.name},\n\nHere is the crop report:\n${summary}`,
    });
  };

  const handleExportPDF = async () => {
    if (!crop) return { success: false, error: "Crop data unavailable" };
    try {
      setExporting(true);
      const res = await exportCropReportPDF(crop);
      if (res.success && res.uri) {
        setLastPdfUri(res.uri);
        setLastPdfFilename(res.filename);
        return { success: true, uri: res.uri, filename: res.filename };
      } else if (res.success) {
        return { success: true, filename: res.filename || "Report.pdf" };
      } else {
        return { success: false, error: res.error || "Unable to export report." };
      }
    } catch (e) {
      return { success: false, error: "Failed to generate PDF report." };
    } finally {
      setExporting(false);
    }
  };

  const { isOnline } = useNetworkStatus(() => {
    loadCrop();
  });

  const loadCrop = useCallback(async () => {
    try {
      setLoading(true);
      if (isOnline && !String(id).startsWith("loc_")) {
        try {
          const response = await API.get(`/crops/${id}`);
          if (response.data?.crop) {
            setCrop(response.data.crop);
            return;
          }
        } catch (apiErr) {
          console.log("[crop-details] API fetch error, checking SQLite cache:", apiErr.message);
        }
      }

      // Offline or fallback: check SQLite
      const cached = await getCachedCropById(id);
      if (cached) {
        setCrop(cached);
      } else {
        Alert.alert("Notice", "Crop details not available offline yet.");
      }
    } catch (error) {
      console.log("CROP DETAILS ERROR:", error.message);
      const cached = await getCachedCropById(id);
      if (cached) setCrop(cached);
    } finally {
      setLoading(false);
    }
  }, [id, isOnline]);

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
        <SyncStatus status={isOnline ? "online" : "offline"} showBanner={true} />

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

      {/* PROFESSIONAL PDF EXPORT SECTION */}
      <ReportExportCard
        title={`${crop.crop_name || "Crop"} Performance & Lifecycle Report`}
        subtitle="Generate an official offline-ready PDF summary with field conditions, lifecycle progression, and growth measurements."
        onExport={handleExportPDF}
        onShare={lastPdfUri ? () => shareFile(lastPdfUri, lastPdfFilename) : handleShareSummary}
        onViewFiles={() => router.push("/farmer/files")}
      />

      {/* QUICK NATIVE ACTIONS: Copy, Share, Contacts */}
      <View style={styles.nativeActionStrip}>
        <TouchableOpacity style={styles.actionChip} onPress={handleCopyCropId}>
          <Ionicons name="copy-outline" size={15} color={COLORS.primary} />
          <Text style={styles.actionChipText}>Copy ID</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionChip} onPress={handleShareSummary}>
          <Ionicons name="share-social-outline" size={15} color={COLORS.primary} />
          <Text style={styles.actionChipText}>Share Summary</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionChip} onPress={() => setContactModalVisible(true)}>
          <Ionicons name="people-outline" size={15} color={COLORS.primary} />
          <Text style={styles.actionChipText}>Share Contact</Text>
        </TouchableOpacity>
      </View>

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

    <ContactPickerModal
      visible={contactModalVisible}
      onClose={() => setContactModalVisible(false)}
      onSelectContact={handleSelectContact}
      title={`Share ${crop?.crop_name || "Crop"} Summary`}
    />
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
  nativeActionStrip: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  actionChip: {
    flex: 1,
    minWidth: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  actionChipPrimary: {
    backgroundColor: COLORS.primary || "#2E7D32",
    borderColor: COLORS.primary || "#2E7D32",
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
});