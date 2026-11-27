import * as Location from "expo-location";
import { Platform } from "react-native";

/**
 * Request location permission and get current GPS coordinates with reverse geocoded address.
 * Respects user privacy: only requests foreground permission when triggered.
 */
export async function getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return {
        success: false,
        error: "Location permission denied. Please enable location permissions in device settings to use GPS.",
      };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Platform.OS === "android" ? Location.Accuracy.Balanced : Location.Accuracy.High,
    });

    const { latitude, longitude, accuracy } = location.coords;

    let locationName = "";
    try {
      const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocoded && geocoded.length > 0) {
        const place = geocoded[0];
        const parts = [
          place.name || place.street,
          place.district || place.subregion,
          place.city,
          place.region,
        ].filter(Boolean);

        // Deduplicate adjacent identical names
        const uniqueParts = parts.filter((part, idx) => parts.indexOf(part) === idx);
        locationName = uniqueParts.join(", ");
      }
    } catch (geoErr) {
      console.log("[locationService] Reverse geocode error:", geoErr.message);
    }

    return {
      success: true,
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
      accuracy: Math.round(accuracy || 0),
      locationName: locationName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    };
  } catch (error) {
    console.log("[locationService] getCurrentLocation error:", error.message);
    return {
      success: false,
      error: error.message || "Failed to retrieve device location.",
    };
  }
}

/**
 * Check existing location permission status without prompting.
 */
export async function checkLocationPermission() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status;
  } catch (error) {
    return "undetermined";
  }
}
