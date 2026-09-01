import { useEffect, useRef, useState } from "react";

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
} from "react-native";

import {
  useLocalSearchParams,
} from "expo-router";

import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";

import API from "../../../../../services/api";

export default function Photos() {
  const { id, recordId } = useLocalSearchParams();

  const cameraRef = useRef(null);

  const [permission, requestPermission] =
    useCameraPermissions();

  const [photos, setPhotos] = useState([]);

  const [cameraOpen, setCameraOpen] =
    useState(false);

  const [selectedImage, setSelectedImage] =
    useState(null);

  const [caption, setCaption] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  // --------------------------------
  // Load photos
  // --------------------------------

  const loadPhotos = async () => {
    try {
      const response = await API.get(
        `/photos/${recordId}`
      );

      console.log(
        "PHOTOS:",
        response.data
      );

      setPhotos(
        response.data.photos || []
      );
    } catch (error) {
      console.log(
        "PHOTOS ERROR:",
        error.response?.data ||
          error.message
      );

      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to load photos."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------
  // Load when screen opens
  // --------------------------------

  useEffect(() => {
    if (recordId) {
      loadPhotos();
    }
  }, [recordId]);

  // --------------------------------
  // Open camera
  // --------------------------------

  const openCamera = async () => {
    try {
      if (!permission) {
        return;
      }

      if (!permission.granted) {
        const result =
          await requestPermission();

        if (!result.granted) {
          Alert.alert(
            "Camera Permission",
            "Camera permission is required to take photos."
          );

          return;
        }
      }

      setCameraOpen(true);

    } catch (error) {
      console.log(
        "CAMERA PERMISSION ERROR:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to access camera."
      );
    }
  };

  // --------------------------------
  // Take photo
  // --------------------------------

  const takePhoto = async () => {
    if (!cameraRef.current) {
      console.log(
        "Camera reference not ready"
      );

      return;
    }

    try {
      const photo =
        await cameraRef.current.takePictureAsync(
          {
            quality: 0.8,
          }
        );

      if (photo?.uri) {
        console.log(
          "PHOTO CAPTURED:",
          photo.uri
        );

        setSelectedImage(
          photo.uri
        );

        setCameraOpen(false);
      }
    } catch (error) {
      console.log(
        "CAMERA ERROR:",
        error
      );

      Alert.alert(
        "Error",
        "Failed to take photo."
      );
    }
  };

  // --------------------------------
  // Save photo
  // --------------------------------

  const handleSavePhoto = async () => {
  console.log("SAVE PHOTO CLICKED");

  if (!selectedImage) {
    Alert.alert(
      "Missing Photo",
      "Please take a photo first."
    );
    return;
  }

  try {
    setSaving(true);

    const payload = {
      lifecycle_record_id: Number(recordId),

      image_url: selectedImage,

      caption: caption.trim() || null,

      // MySQL-friendly datetime
      captured_at: new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " "),
    };

    console.log(
      "PHOTO PAYLOAD:",
      payload
    );

    const response = await API.post(
      "/photos",
      payload
    );

    console.log(
      "PHOTO CREATED:",
      response.data
    );

    Alert.alert(
      "Success",
      "Photo added successfully."
    );

    setSelectedImage(null);
    setCaption("");

    await loadPhotos();

  } catch (error) {
    console.log(
      "CREATE PHOTO ERROR:",
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
      "Save Error",
      error.response?.data?.message ||
        error.message ||
        "Failed to save photo."
    );

  } finally {
    setSaving(false);
  }
};

  // --------------------------------
  // Camera screen
  // --------------------------------

  if (cameraOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        >
          <View style={styles.cameraControls}>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() =>
                setCameraOpen(false)
              }
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePhoto}
            >
              <View
                style={styles.captureInner}
              />
            </TouchableOpacity>

          </View>
        </CameraView>
      </View>
    );
  }

  // --------------------------------
  // Loading screen
  // --------------------------------

  if (loading) {
    return (
      <View
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading photos...
        </Text>
      </View>
    );
  }

  // --------------------------------
  // Main screen
  // --------------------------------

  return (
    <ScrollView
      contentContainerStyle={
        styles.container
      }
    >
      <Text style={styles.title}>
        Crop Photos
      </Text>

      <Text style={styles.subtitle}>
        Crop ID: {id}
      </Text>

      <Text style={styles.subtitle}>
        Lifecycle Record: {recordId}
      </Text>

      {/* ========================== */}
      {/* Existing Photos */}
      {/* ========================== */}

      <Text style={styles.sectionTitle}>
        Photos
      </Text>

      {photos.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            No photos added yet.
          </Text>
        </View>
      ) : (
        photos.map((photo) => (
          <View
            key={photo.id}
            style={styles.photoCard}
          >
            <Image
              source={{
                uri: photo.image_url,
              }}
              style={styles.photo}
              resizeMode="cover"
            />

            {photo.caption && (
              <Text style={styles.caption}>
                {photo.caption}
              </Text>
            )}

            {photo.captured_at && (
              <Text style={styles.date}>
                Captured:{" "}
                {photo.captured_at}
              </Text>
            )}
          </View>
        ))
      )}

      {/* ========================== */}
      {/* Take Photo */}
      {/* ========================== */}

      <Text style={styles.sectionTitle}>
        Add Photo
      </Text>

      <TouchableOpacity
        style={styles.cameraButton}
        onPress={openCamera}
      >
        <Text style={styles.cameraButtonText}>
          📷 Take Photo
        </Text>
      </TouchableOpacity>

      {/* ========================== */}
      {/* Preview */}
      {/* ========================== */}

      {selectedImage && (
        <View
          style={styles.previewContainer}
        >
          <Text style={styles.previewTitle}>
            Captured Photo
          </Text>

          <Image
            source={{
              uri: selectedImage,
            }}
            style={styles.preview}
            resizeMode="cover"
          />

          <TouchableOpacity
            style={styles.retakeButton}
            onPress={openCamera}
          >
            <Text
              style={
                styles.retakeButtonText
              }
            >
              Retake Photo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={() =>
              setSelectedImage(null)
            }
          >
            <Text style={styles.removeText}>
              Remove Photo
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ========================== */}
      {/* Caption */}
      {/* ========================== */}

      <Text style={styles.label}>
        Caption
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Describe the photo..."
        value={caption}
        onChangeText={setCaption}
        multiline
      />

      {/* ========================== */}
      {/* Save */}
      {/* ========================== */}

      <TouchableOpacity
        style={[
          styles.button,
          saving &&
            styles.buttonDisabled,
        ]}
        onPress={handleSavePhoto}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            Save Photo
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

  photoCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },

  photo: {
    width: "100%",
    height: 220,
    borderRadius: 8,
  },

  caption: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
  },

  date: {
    fontSize: 13,
    color: "#777",
    marginTop: 5,
  },

  cameraButton: {
    backgroundColor: "#2e7d32",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },

  cameraButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },

  previewContainer: {
    marginTop: 20,
  },

  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },

  preview: {
    width: "100%",
    height: 250,
    borderRadius: 10,
  },

  retakeButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#2e7d32",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  retakeButtonText: {
    color: "#2e7d32",
    fontWeight: "bold",
  },

  removeButton: {
    marginTop: 10,
    alignItems: "center",
  },

  removeText: {
    color: "#d32f2f",
    fontWeight: "600",
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 22,
    marginBottom: 7,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    minHeight: 70,
    textAlignVertical: "top",
  },

  button: {
    backgroundColor: "#2e7d32",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: "#fff",
    fontSize: 17,
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
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 40,
  },

  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#ccc",
  },

  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#222",
  },

  cancelButton: {
    position: "absolute",
    left: 25,
    bottom: 55,
    padding: 12,
  },

  cancelText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
});