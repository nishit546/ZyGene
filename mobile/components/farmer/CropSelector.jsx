import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from "../../constants/theme";
import API from "../../services/api";
import SearchBar from "../ui/SearchBar";
import EmptySearchState from "../ui/EmptySearchState";

export default function CropSelector({ onSelect, fieldId }) {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    API.get("/crops")
      .then(res => setCrops(res.data?.crops || []))
      .catch(err => console.log(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredCrops = useMemo(() => {
    let result = crops.filter(c => (c.crop_status || "").toLowerCase() !== "harvested");
    
    // Filter by fieldId if provided
    if (fieldId) {
      result = result.filter(c => c.field_id === fieldId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        (c.crop_name || "").toLowerCase().includes(q) || 
        (c.variety || "").toLowerCase().includes(q) || 
        (c.field_name || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [crops, searchQuery, fieldId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading active crops...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Crop</Text>
      
      <View style={styles.searchWrapper}>
        <SearchBar 
          placeholder="Search crops..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery("")}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {crops.length > 0 && filteredCrops.length === 0 ? (
          <EmptySearchState onClear={() => setSearchQuery("")} />
        ) : filteredCrops.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No active crops found.</Text>
          </View>
        ) : (
          filteredCrops.map(crop => (
            <TouchableOpacity
              key={crop.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => onSelect(crop)}
            >
              <View style={styles.textCol}>
                <Text style={styles.cropName}>{crop.crop_name}</Text>
                <Text style={styles.cropDesc}>
                  {crop.variety || "Standard"} • {crop.field_name || "Unassigned"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.borderDark} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  center: {
    padding: SPACING.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
  },
  title: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.md,
  },
  searchWrapper: {
    marginBottom: SPACING.lg,
  },
  list: {
    paddingBottom: SPACING.xxl,
    gap: SPACING.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  textCol: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  cropName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  cropDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyText: {
    color: COLORS.textSecondary,
  },
});
