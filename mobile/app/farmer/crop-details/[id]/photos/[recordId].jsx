import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";

import API from "../../../../../services/api";
import SyncStatus from "../../../../../components/SyncStatus";
import useNetworkStatus from "../../../../../hooks/useNetworkStatus";
import {
  cacheActivities,
  getCachedActivities,
  generateLocalId,
} from "../../../../../services/offlineStorage";
import {
  enqueueOperation,
  subscribeSyncEvents,
} from "../../../../../services/syncService";
import { getCurrentUserId } from "../../../../../services/auth";
import { COLORS } from "../../../../../constants/theme";

export default function Photos() {
  const { id, recordId } = useLocalSearchParams();
  const cameraRef = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [photos, setPhotos] = useState([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);

  const { isOnline } = useNetworkStatus(() => {
    loadPhotos();
  });

  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);
      const uid = await getCurrentUserId();
      setUserId(uid);

      if (isOnline && !String(recordId).startsWith("loc_")) {
        try {
          const response = await API.get(`/photos/${recordId}`);
          const fetched = response.data?.photos || [];
          setPhotos(fetched);
          await cacheActivities(uid, recordId, "photo", fetched);
          return;
        } catch (apiErr) {
          console.log("[photos] API fetch failed, falling back to SQLite cache:", apiErr.message);
        }
      }

      // Offline or fallback: load from SQLite
      const cached = await getCachedActivities(recordId, "photo");
      setPhotos(cached);
    } catch (error) {
      console.log("PHOTOS ERROR:", error.message);
      const cached = await getCachedActivities(recordId, "photo");
      setPhotos(cached);
    } finally {
      setLoading(false);
    }
  }, [recordId, isOnline]);

  useEffect(() => {
    if (recordId) {
      loadPhotos();
    }

    const unsubscribe = subscribeSyncEvents((event) => {
      if (event.type === "ITEM_SYNCED" || event.type === "SYNC_COMPLETE") {
        loadPhotos();
      }
    });
    return () => unsubscribe();
  }, [recordId, loadPhotos]);

  const openCamera = async () => {
    try {
      if (!permission) return;

      if (!permission.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert("Camera Permission", "Camera permission is required to take photos.");
          return;
        }
      }

      setCameraOpen(true);
    } catch (error) {
      console.log("CAMERA PERMISSION ERROR:", error);
      Alert.alert("Error", "Unable to access camera.");
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        setSelectedImage(photo.uri);
        setCameraOpen(false);
      }
    } catch (error) {
      console.log("CAMERA ERROR:", error);
      Alert.alert("Error", "Failed to take photo.");
    }
  };

  const handleSavePhoto = async () => {
    if (!selectedImage) {
      Alert.alert("Missing Photo", "Please take a photo first.");
      return;
    }

    try {
      setSaving(true);
      const uid = userId || (await getCurrentUserId());

      // Persist local file reference in document directory
      let localFileUri = selectedImage;
      if (Platform.OS !== "web" && FileSystem.documentDirectory) {
        try {
          const photosDir = `${FileSystem.documentDirectory}offline_photos/`;
          const dirInfo = await FileSystem.getInfoAsync(photosDir);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true });
          }
          const fileName = `crop_photo_${Date.now()}.jpg`;
          const dest = `${photosDir}${fileName}`;
          await FileSystem.copyAsync({ from: selectedImage, to: dest });
          localFileUri = dest;
        } catch (fsErr) {
          console.warn("[photos] Could not copy photo to local documentDirectory:", fsErr);
        }
      }

      const capturedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
      const payload = {
        lifecycle_record_id: Number(recordId) || recordId,
        image_url: localFileUri,
        caption: caption.trim() || null,
        captured_at: capturedAt,
      };

      // If offline or parent record was created offline: save locally and enqueue
      if (!isOnline || String(recordId).startsWith("loc_")) {
        const localId = generateLocalId("photo");
        await enqueueOperation({
          userId: uid,
          recordType: "photo",
          operationType: "create",
          localRecordId: localId,
          parentLocalId: String(recordId).startsWith("loc_") ? String(recordId) : null,
          parentServerId: !String(recordId).startsWith("loc_") ? Number(recordId) : null,
          endpoint: "/photos",
          httpMethod: "POST",
          payload,
        });

        Alert.alert(
          "Saved on this device",
          "Photo saved locally. It will upload automatically when you are back online."
        );

        setSelectedImage(null);
        setCaption("");

        const cached = await getCachedActivities(recordId, "photo");
        setPhotos(cached);
        return;
      }

      // Online: Attempt direct upload
      try {
        // Read file as base64 for API upload
        let uploadPayload = { ...payload };
        if (localFileUri.startsWith("file://") || localFileUri.startsWith("/")) {
          try {
            const base64Data = await FileSystem.readAsStringAsync(localFileUri, {
              encoding: FileSystem.EncodingType?.Base64 || "base64",
            });
            uploadPayload.image_url = `data:image/jpeg;base64,${base64Data}`;
          } catch (fileErr) {
            console.warn("[photos] Fallback to direct URI:", fileErr);
          }
        }

        const response = await API.post("/photos", uploadPayload);
        Alert.alert("Success", "Photo added successfully.");

        setSelectedImage(null);
        setCaption("");

        if (response.data?.photo) {
          await cacheActivities(uid, recordId, "photo", [response.data.photo]);
        }
        await loadPhotos();
      } catch (reqError) {
        if (!reqError.response) {
          // Network failed mid-request: save offline
          const localId = generateLocalId("photo");
          await enqueueOperation({
            userId: uid,
            recordType: "photo",
            operationType: "create",
            localRecordId: localId,
            parentLocalId: String(recordId).startsWith("loc_") ? String(recordId) : null,
            parentServerId: !String(recordId).startsWith("loc_") ? Number(recordId) : null,
            endpoint: "/photos",
            httpMethod: "POST",
            payload,
          });

          Alert.alert(
            "Saved on this device",
            "Network lost. Photo saved locally and will upload when connected."
          );

          setSelectedImage(null);
          setCaption("");

          const cached = await getCachedActivities(recordId, "photo");
          setPhotos(cached);
        } else {
          Alert.alert("Save Error", reqError.response?.data?.message || "Failed to save photo.");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  if (cameraOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setCameraOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary || "#2E7D32"} />
        <Text style={styles.loadingText}>Loading photos...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Network / Offline Banner */}
      <SyncStatus status={isOnline ? "online" : "offline"} showBanner={true} />

      <Text style={[styles.title, { marginTop: 12 }]}>Crop Photos</Text>
      <Text style={styles.subtitle}>Crop ID: {id}</Text>
      <Text style={styles.subtitle}>Lifecycle Record: {recordId}</Text>

      {/* Existing Photos */}
      <Text style={styles.sectionTitle}>Photos</Text>

      {photos.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No photos added yet.</Text>
        </View>
      ) : (
        photos.map((photo) => (
          <View key={photo.id || photo.local_id} style={styles.photoCard}>
            <Image
              source={{ uri: photo.image_url }}
              style={styles.photo}
              resizeMode="cover"
            />
            <View style={{ padding: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                {photo.caption ? (
                  <Text style={[styles.caption, { flex: 1 }]}>{photo.caption}</Text>
                ) : (
                  <Text style={[styles.caption, { color: "#9CA3AF", flex: 1 }]}>No caption</Text>
                )}
                {photo.sync_status === "pending" && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pending Upload</Text>
                  </View>
                )}
                {photo.sync_status === "failed" && (
                  <View style={styles.failedBadge}>
                    <Text style={styles.failedBadgeText}>Upload Failed</Text>
                  </View>
                )}
              </View>

              {photo.captured_at && (
                <Text style={styles.date}>Captured: {photo.captured_at}</Text>
              )}
            </View>
          </View>
        ))
      )}

      {/* Take Photo */}
      <Text style={styles.sectionTitle}>Add Photo</Text>

      <TouchableOpacity style={styles.cameraButton} onPress={openCamera}>
        <Text style={styles.cameraButtonText}>📷 Take Photo</Text>
      </TouchableOpacity>

      {/* Preview */}
      {selectedImage && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>Captured Photo</Text>
          <Image source={{ uri: selectedImage }} style={styles.preview} resizeMode="cover" />

          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <TouchableOpacity style={styles.retakeButton} onPress={openCamera}>
              <Text style={styles.retakeButtonText}>Retake Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => setSelectedImage(null)}
            >
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Caption */}
      <Text style={styles.label}>Caption</Text>
      <TextInput
        style={styles.input}
        placeholder="Describe the photo..."
        value={caption}
        onChangeText={setCaption}
        multiline
      />

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSavePhoto}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {!isOnline ? "Save on Device" : "Save Photo"}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
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
    fontSize: 26,
    fontWeight: "bold",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 12,
    color: "#1F2937",
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  emptyText: {
    color: "#777",
  },
  photoCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    marginBottom: 14,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  photo: {
    width: "100%",
    height: 200,
  },
  caption: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  date: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
  },
  pendingBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E65100",
  },
  failedBadge: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  failedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D32F2F",
  },
  cameraButton: {
    backgroundColor: "#374151",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cameraButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  previewContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  preview: {
    width: "100%",
    height: 180,
    borderRadius: 8,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    marginRight: 6,
  },
  retakeButtonText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 13,
  },
  removeButton: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    marginLeft: 6,
  },
  removeText: {
    color: "#DC2626",
    fontWeight: "600",
    fontSize: 13,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#FFFFFF",
    minHeight: 60,
  },
  button: {
    backgroundColor: COLORS.primary || "#2E7D32",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  cancelButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cancelText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
  },
});
