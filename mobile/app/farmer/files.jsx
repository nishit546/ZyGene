import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from "../../constants/theme";
import FarmerHeader from "../../components/ui/FarmerHeader";
import { getExportedFilesList, deleteExportedFile } from "../../services/fileService";
import { shareFile } from "../../services/shareService";

export default function MyFilesScreen() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getExportedFilesList();
      setFiles(list || []);
    } catch (err) {
      console.log("[MyFiles] error loading files:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFiles();
  };

  const handleShare = async (file) => {
    if (!file.path) {
      Alert.alert("Notice", "File path is unavailable.");
      return;
    }
    await shareFile(file.path, file.name);
  };

  const handleDelete = (file) => {
    Alert.alert("Delete File?", `Remove "${file.name}" from saved files?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteExportedFile(file.path);
          await loadFiles();
        },
      },
    ]);
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 KB";
    const kb = bytes / 1024;
    if (kb > 1024) {
      return `${(kb / 1024).toFixed(1)} MB`;
    }
    return `${Math.round(kb)} KB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "--";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FarmerHeader
        title="My Exported Files"
        showBack={true}
        onBackPress={() => router.back()}
        rightIcon="refresh"
        onRightPress={loadFiles}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        <View style={styles.headerBanner}>
          <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerBannerTitle}>Local Reports & Exports</Text>
            <Text style={styles.headerBannerSub}>
              PDF and CSV files saved directly on this device for offline access and sharing.
            </Text>
          </View>
        </View>

        {files.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No exported documents yet</Text>
            <Text style={styles.emptySubtitle}>
              Export reports from Crop Details ("Export PDF") or Harvest History ("Export CSV") to view and share them here.
            </Text>
          </View>
        ) : (
          files.map((file) => {
            const isPdf = file.type === "pdf" || file.name.endsWith(".pdf");
            return (
              <View key={file.id || file.path} style={styles.fileCard}>
                <View
                  style={[
                    styles.fileIconBox,
                    { backgroundColor: isPdf ? "#FEE2E2" : "#DCFCE7" },
                  ]}
                >
                  <Ionicons
                    name={isPdf ? "document-text" : "grid"}
                    size={22}
                    color={isPdf ? "#DC2626" : COLORS.primary}
                  />
                </View>

                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.badgeText}>
                      {isPdf ? "PDF Report" : "CSV Spreadsheet"}
                    </Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.metaText}>{formatFileSize(file.size)}</Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.metaText}>{formatDate(file.createdAt)}</Text>
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleShare(file)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="share-outline" size={20} color={COLORS.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDelete(file)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORS.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background || "#F9FBF7",
  },
  scrollContainer: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  headerBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  headerBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerBannerSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 36,
    alignItems: "center",
    marginTop: 20,
    ...SHADOWS.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 10,
    ...SHADOWS.sm,
  },
  fileIconBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  dot: {
    fontSize: 10,
    color: "#94A3B8",
    marginHorizontal: 4,
  },
  metaText: {
    fontSize: 11,
    color: "#64748B",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    padding: 6,
  },
});
