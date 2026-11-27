import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../../constants/theme";

/**
 * Enterprise AgriTech Report Export Card
 *
 * @param {Object} props
 * @param {string} props.title - e.g. "Crop Performance & Lifecycle Report"
 * @param {string} props.subtitle - Description of the PDF document
 * @param {() => Promise<{ success: boolean, uri?: string, filename?: string, error?: string }>} props.onExport - Export handler
 * @param {() => void} [props.onShare] - Share handler when generated
 * @param {() => void} [props.onViewFiles] - Navigate to My Files
 * @param {string} [props.badgeText="OFFICIAL PDF"]
 */
export default function ReportExportCard({
  title = "Crop Performance & Lifecycle Report",
  subtitle = "Generate an official offline-ready PDF summary with field conditions, lifecycle progression, and growth measurements.",
  onExport,
  onShare,
  onViewFiles,
  badgeText = "OFFICIAL PDF",
  style,
}) {
  const [loading, setLoading] = useState(false);
  const [lastExport, setLastExport] = useState(null); // { success, filename, uri, error }

  const handleExport = async () => {
    if (loading || !onExport) return;
    try {
      setLoading(true);
      setLastExport(null);
      const res = await onExport();
      setLastExport(res || { success: true });
    } catch (err) {
      setLastExport({ success: false, error: err.message || "Failed to generate report" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.card, style]}>
      {/* Top Banner Row */}
      <View style={styles.topRow}>
        <View style={styles.pdfIconBadge}>
          <Ionicons name="document-text" size={24} color="#DC2626" />
        </View>

        <View style={styles.headerTextWrap}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
            <View style={styles.offlineChip}>
              <Ionicons name="shield-checkmark" size={11} color="#15803D" style={{ marginRight: 3 }} />
              <Text style={styles.offlineChipText}>Saved Offline</Text>
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>{subtitle}</Text>

      {/* Highlights / Features included in report */}
      <View style={styles.includedTagsRow}>
        <View style={styles.tag}>
          <Ionicons name="checkmark" size={13} color="#15803D" style={{ marginRight: 3 }} />
          <Text style={styles.tagText}>Plot Details</Text>
        </View>
        <View style={styles.tag}>
          <Ionicons name="checkmark" size={13} color="#15803D" style={{ marginRight: 3 }} />
          <Text style={styles.tagText}>Growth Timeline</Text>
        </View>
        <View style={styles.tag}>
          <Ionicons name="checkmark" size={13} color="#15803D" style={{ marginRight: 3 }} />
          <Text style={styles.tagText}>Field Notes</Text>
        </View>
      </View>

      {/* Export Action Button */}
      <TouchableOpacity
        style={[styles.exportBtn, loading && styles.exportBtnDisabled]}
        onPress={handleExport}
        disabled={loading}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel="Export PDF report"
      >
        {loading ? (
          <View style={styles.btnContent}>
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.exportBtnText}>Compiling PDF Report...</Text>
          </View>
        ) : (
          <View style={styles.btnContent}>
            <Ionicons name="download-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.exportBtnText}>Generate & Save PDF</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Success / Result Feedback Banner */}
      {lastExport && (
        <View
          style={[
            styles.feedbackBanner,
            lastExport.success ? styles.feedbackSuccess : styles.feedbackError,
          ]}
        >
          <Ionicons
            name={lastExport.success ? "checkmark-circle" : "alert-circle"}
            size={18}
            color={lastExport.success ? "#15803D" : "#DC2626"}
            style={{ marginRight: 8 }}
          />

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.feedbackTitle,
                { color: lastExport.success ? "#15803D" : "#DC2626" },
              ]}
            >
              {lastExport.success ? "PDF Export Ready!" : "Export Failed"}
            </Text>
            <Text style={styles.feedbackSubtitle} numberOfLines={2}>
              {lastExport.success
                ? lastExport.filename
                  ? `Saved as ${lastExport.filename}`
                  : "Document compiled successfully."
                : lastExport.error || "Unable to save report."}
            </Text>
          </View>

          {lastExport.success && (
            <View style={styles.quickActions}>
              {onShare && (
                <TouchableOpacity
                  style={styles.quickShareBtn}
                  onPress={onShare}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="share-social-outline" size={14} color="#15803D" />
                  <Text style={styles.quickShareText}>Share</Text>
                </TouchableOpacity>
              )}

              {onViewFiles && (
                <TouchableOpacity
                  style={styles.quickFilesBtn}
                  onPress={onViewFiles}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.quickFilesText}>View</Text>
                  <Ionicons name="chevron-forward" size={12} color="#0F172A" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
      },
    }),
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  pdfIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  badge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#DC2626",
    letterSpacing: 0.4,
  },
  offlineChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  offlineChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 12,
  },
  includedTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#334155",
  },
  exportBtn: {
    backgroundColor: "#1B5E20",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  exportBtnDisabled: {
    opacity: 0.75,
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  exportBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  feedbackError: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  feedbackSubtitle: {
    fontSize: 11.5,
    color: "#475569",
    marginTop: 1,
  },
  quickActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 6,
  },
  quickShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 3,
  },
  quickShareText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#15803D",
  },
  quickFilesBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 2,
  },
  quickFilesText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0F172A",
  },
});
