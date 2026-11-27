import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from "../constants/theme";

// Safely require react-native-maps on native platforms
let MapView = null;
let Marker = null;
let Callout = null;

if (Platform.OS !== "web") {
  try {
    const Maps = require("react-native-maps");
    MapView = Maps.default || Maps;
    Marker = Maps.Marker;
    Callout = Maps.Callout;
  } catch (err) {
    console.log("[FarmMapView] react-native-maps load notice:", err.message);
  }
}

export default function FarmMapView({
  fields = [],
  selectedField = null,
  onSelectField = () => {},
  style,
  interactive = true,
  initialRegion = null,
}) {
  const mapRef = useRef(null);

  // Filter fields with valid numeric latitude and longitude
  const mappedFields = (fields || []).filter(
    (f) =>
      f &&
      f.latitude !== null &&
      f.latitude !== undefined &&
      f.longitude !== null &&
      f.longitude !== undefined &&
      !isNaN(Number(f.latitude)) &&
      !isNaN(Number(f.longitude)) &&
      Number(f.latitude) !== 0 &&
      Number(f.longitude) !== 0
  );

  // Calculate default center region
  const defaultLat = mappedFields.length > 0 ? Number(mappedFields[0].latitude) : 23.0225;
  const defaultLng = mappedFields.length > 0 ? Number(mappedFields[0].longitude) : 72.5714;

  const region = initialRegion || {
    latitude: defaultLat,
    longitude: defaultLng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const openInExternalMaps = (lat, lng, label) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(label)}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(label)})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    Linking.openURL(url).catch((err) =>
      console.log("Error opening external maps:", err)
    );
  };

  // WEB FALLBACK / FALLBACK WHEN NATIVE MAPS CANNOT RENDER
  if (Platform.OS === "web" || !MapView) {
    return (
      <View style={[styles.webFallbackContainer, style]}>
        <View style={styles.webFallbackHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="map" size={18} color={COLORS.primary} />
            <Text style={styles.webFallbackTitle}>Farm Field Map</Text>
          </View>
          <Text style={styles.webFallbackCount}>
            {mappedFields.length} {mappedFields.length === 1 ? "Plot Mapped" : "Plots Mapped"}
          </Text>
        </View>

        {mappedFields.length === 0 ? (
          <View style={styles.noCoordinatesBox}>
            <Ionicons name="location-outline" size={32} color={COLORS.textTertiary} />
            <Text style={styles.noCoordinatesText}>No fields with GPS coordinates recorded</Text>
            <Text style={styles.noCoordinatesSub}>
              Use "Use Current Location" when creating or editing fields to view them on the map.
            </Text>
          </View>
        ) : (
          <View style={styles.webGrid}>
            {mappedFields.map((field) => {
              const isSelected = selectedField && (selectedField.id === field.id || selectedField.local_id === field.local_id);
              return (
                <TouchableOpacity
                  key={field.id || field.local_id || `${field.latitude}-${field.longitude}`}
                  style={[styles.webFieldCard, isSelected && styles.webFieldCardSelected]}
                  onPress={() => onSelectField(field)}
                  activeOpacity={0.8}
                >
                  <View style={styles.webFieldTop}>
                    <Text style={styles.webFieldName} numberOfLines={1}>
                      {field.field_name}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        openInExternalMaps(field.latitude, field.longitude, field.field_name)
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="open-outline" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.webFieldCoords}>
                    📍 {Number(field.latitude).toFixed(4)}°, {Number(field.longitude).toFixed(4)}°
                  </Text>
                  {field.location_name ? (
                    <Text style={styles.webFieldLocation} numberOfLines={1}>
                      {field.location_name}
                    </Text>
                  ) : null}
                  {field.area ? (
                    <Text style={styles.webFieldArea}>
                      {field.area} {field.area_unit || "acres"}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  // NATIVE MAPS (iOS / Android)
  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
      >
        {mappedFields.map((field) => {
          const lat = Number(field.latitude);
          const lng = Number(field.longitude);
          const isSelected =
            selectedField &&
            (selectedField.id === field.id || selectedField.local_id === field.local_id);

          return (
            <Marker
              key={field.id || field.local_id || `${lat}-${lng}`}
              coordinate={{ latitude: lat, longitude: lng }}
              title={field.field_name}
              description={`${field.area ? field.area + " " + (field.area_unit || "acres") : "Farm plot"}${field.location_name ? " · " + field.location_name : ""}`}
              pinColor={isSelected ? "#15803D" : COLORS.primary}
              onPress={() => onSelectField(field)}
            >
              {Callout && (
                <Callout onPress={() => onSelectField(field)}>
                  <View style={styles.calloutContainer}>
                    <Text style={styles.calloutTitle}>{field.field_name}</Text>
                    {field.area ? (
                      <Text style={styles.calloutText}>
                        Area: {field.area} {field.area_unit || "acres"}
                      </Text>
                    ) : null}
                    <Text style={styles.calloutCoords}>
                      {lat.toFixed(4)}, {lng.toFixed(4)}
                    </Text>
                  </View>
                </Callout>
              )}
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 300,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  calloutContainer: {
    padding: 8,
    minWidth: 140,
  },
  calloutTitle: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#1F2937",
    marginBottom: 2,
  },
  calloutText: {
    fontSize: 12,
    color: "#4B5563",
  },
  calloutCoords: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 2,
  },
  // Web Fallback styles
  webFallbackContainer: {
    width: "100%",
    minHeight: 220,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    padding: 16,
  },
  webFallbackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  webFallbackTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  webFallbackCount: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  noCoordinatesBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  noCoordinatesText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 8,
  },
  noCoordinatesSub: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
    maxWidth: 320,
  },
  webGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  webFieldCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...SHADOWS.sm,
  },
  webFieldCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#F0FDF4",
  },
  webFieldTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  webFieldName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  webFieldCoords: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 4,
  },
  webFieldLocation: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  webFieldArea: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: 4,
  },
});
