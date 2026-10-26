import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from "../../constants/theme";
import API from "../../services/api";
import SearchBar from "../ui/SearchBar";
import EmptySearchState from "../ui/EmptySearchState";
import { router } from "expo-router";

export default function FieldSelector({ onSelect }) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    API.get("/fields")
      .then(res => setFields(res.data?.fields || []))
      .catch(err => console.log(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredFields = useMemo(() => {
    let result = fields;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => 
        (f.field_name || "").toLowerCase().includes(q) || 
        (f.location_name || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [fields, searchQuery]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading fields...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Field</Text>
      
      {fields.length > 5 && (
        <View style={styles.searchWrapper}>
          <SearchBar 
            placeholder="Search fields..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery("")}
          />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {fields.length > 0 && filteredFields.length === 0 ? (
          <EmptySearchState onClear={() => setSearchQuery("")} />
        ) : filteredFields.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No fields available</Text>
            <TouchableOpacity 
               style={styles.createBtn}
               onPress={() => router.push("/farmer/create-field")}
            >
               <Text style={styles.createBtnText}>Create Field</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredFields.map(field => (
            <TouchableOpacity
              key={field.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => onSelect(field)}
            >
              <View style={styles.textCol}>
                <Text style={styles.fieldName}>{field.field_name}</Text>
                <Text style={styles.fieldDesc}>
                  {field.location_name || "Unknown Location"} {field.area ? `• ${field.area} ${field.area_unit || 'acres'}` : ""}
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
  fieldName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  fieldDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyText: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  createBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  createBtnText: {
    color: COLORS.surface,
    fontWeight: "600",
  }
});
