import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, TYPOGRAPHY } from "../constants/theme";

/**
 * Reusable Camera & Gallery Image Picker Component for AgriTech workflows.
 */
export default function CameraCapture({
  imageUri,
  onImageSelected,
  onImageRemoved,
  label = "Capture or Select Photo",
  aspect = [4, 3],
  quality = 0.7,
}) {
  const [loading, setLoading] = useState(false);

  const requestCameraPermission = async () => {
    if (Platform.OS === "web") return true;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera Permission Required",
        "ZyGene needs camera access to photograph crops, fields, and plant symptoms."
      );
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async () => {
    if (Platform.OS === "web") return true;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Gallery Permission Required",
        "ZyGene needs access to your photos to upload crop and field images."
      );
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      setLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || "images",
        allowsEditing: true,
        aspect,
        quality,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("Camera capture error:", err);
      Alert.alert("Error", "Could not take photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePickFromGallery = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || "images",
        allowsEditing: true,
        aspect,
        quality,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("Gallery pick error:", err);
      Alert.alert("Error", "Could not select photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {imageUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.retakeBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
              <Ionicons name="camera-reverse-outline" size={16} color={COLORS.primary || "#2E7D32"} style={{ marginRight: 4 }} />
              <Text style={styles.retakeBtnText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFromGallery} activeOpacity={0.8}>
              <Ionicons name="images-outline" size={16} color="#374151" style={{ marginRight: 4 }} />
              <Text style={styles.galleryBtnText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.removeBtn} onPress={onImageRemoved} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={16} color="#DC2626" style={{ marginRight: 4 }} />
              <Text style={styles.removeBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.uploadPlaceholder}>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary || "#2E7D32"} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
              <Text style={styles.placeholderText}>Take a photo or choose from gallery</Text>
              <View style={styles.buttonsRow}>
                <TouchableOpacity style={styles.primaryOptionBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryOptionText}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryOptionBtn} onPress={handlePickFromGallery} activeOpacity={0.8}>
                  <Ionicons name="images" size={16} color="#374151" style={{ marginRight: 6 }} />
                  <Text style={styles.secondaryOptionText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  uploadPlaceholder: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    borderRadius: RADIUS.md || 10,
    backgroundColor: "#F9FAFB",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
    textAlign: "center",
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary || "#2E7D32",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.sm || 6,
  },
  primaryOptionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.sm || 6,
  },
  secondaryOptionText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
  },
  previewContainer: {
    borderRadius: RADIUS.md || 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  previewImage: {
    width: "100%",
    height: 180,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 8,
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  retakeBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary || "#2E7D32",
  },
  galleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  galleryBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },
});
