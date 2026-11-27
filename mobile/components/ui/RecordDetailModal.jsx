import { SafeAreaView } from "react-native-safe-area-context";
import React from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from "../../constants/theme";
import AppButton from "./AppButton";
import { copyToClipboard, shareText } from "../../services/shareService";

/**
 * Reusable unified Record Detail modal for Farmer activities.
 * Enforces the identical visual structure across:
 * Measurements, Photos, Irrigation, Treatments, Disease/Pest, and Harvest.
 */
export default function RecordDetailModal({
  visible,
  onClose,
  title = "Record Inspection",
  type,
  primaryValue,
  date,
  details = [],
  notes,
  imageUri,
  onDelete,
}) {
  const handleDeletePress = () => {
    Alert.alert(
      `Delete ${title}?`,
      "This record will be permanently removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (onDelete) onDelete();
            onClose();
          },
        },
      ]
    );
  };

  const formatRecordText = () => {
    const lines = [
      `🌱 *ZyGene Activity: ${title}*`,
      type ? `• Type: ${type}` : null,
      primaryValue ? `• Value: ${primaryValue}` : null,
      date ? `• Date: ${date}` : null,
      ...details.map((d) => `• ${d.label}: ${d.value}`),
      notes ? `• Notes: ${notes}` : null,
      `Shared from ZyGene AgriTech Platform.`,
    ].filter(Boolean);
    return lines.join("\n");
  };

  const handleShare = async () => {
    const text = formatRecordText();
    await shareText({ title: `${title} Record`, message: text });
  };

  const handleCopy = () => {
    const text = formatRecordText();
    copyToClipboard(text, `${title} Summary`);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Modal Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close record details"
          >
            <Ionicons name="close" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Optional Photo Display */}
          {imageUri ? (
            <View style={styles.imageBox}>
              <Image
                source={{ uri: imageUri }}
                style={styles.photo}
                resizeMode="cover"
              />
            </View>
          ) : null}

          {/* Primary Metric Banner */}
          <View style={styles.primaryMetricCard}>
            <Text style={styles.typeLabel}>{type || "Record Entry"}</Text>
            {primaryValue ? (
              <Text style={styles.primaryValueText}>{primaryValue}</Text>
            ) : null}
            {date ? (
              <View style={styles.dateRow}>
                <Ionicons
                  name="calendar-outline"
                  size={13}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.dateText}>Recorded {date}</Text>
              </View>
            ) : null}

            {/* Quick Share / Copy Strip */}
            <View style={styles.actionChipStrip}>
              <TouchableOpacity style={styles.actionChipBtn} onPress={handleCopy}>
                <Ionicons name="copy-outline" size={14} color={COLORS.primary} />
                <Text style={styles.actionChipBtnText}>Copy Summary</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionChipBtn} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={14} color={COLORS.primary} />
                <Text style={styles.actionChipBtnText}>Share Record</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Important Values List */}
          {details.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>RECORD VALUES</Text>
              <View style={styles.detailsCard}>
                {details.map((item, idx) => (
                  <View key={item.label || idx}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{item.label}</Text>
                      <Text style={styles.detailValue}>{item.value || "--"}</Text>
                    </View>
                    {idx < details.length - 1 && (
                      <View style={styles.rowDivider} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Notes Section */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>NOTES & OBSERVATIONS</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>
                {notes && notes.trim()
                  ? notes
                  : "No notes provided for this observation."}
              </Text>
            </View>
          </View>

          {/* Destructive / Edit Actions */}
          <View style={styles.actionsRow}>
            <View style={styles.actionCol}>
              <AppButton
                title="Close"
                variant="secondary"
                onPress={onClose}
              />
            </View>
            {onDelete && (
              <>
                <View style={styles.actionGap} />
                <View style={styles.actionCol}>
                  <AppButton
                    title="Delete Record"
                    variant="danger"
                    onPress={handleDeletePress}
                  />
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  placeholder: {
    width: 32,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg, // 20px
    paddingTop: SPACING.base,
    paddingBottom: 40,
  },
  imageBox: {
    width: "100%",
    height: 220,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  primaryMetricCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
    marginBottom: SPACING.xl,
    ...SHADOWS.subtle,
  },
  typeLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  primaryValueText: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginVertical: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  sectionBlock: {
    marginBottom: SPACING.xl,
  },
  sectionLabel: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.sm,
  },
  detailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.base,
    ...SHADOWS.subtle,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
  },
  notesCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
    ...SHADOWS.subtle,
  },
  notesText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: "row",
    marginTop: SPACING.sm,
  },
  actionCol: {
    flex: 1,
  },
  actionGap: {
    width: SPACING.md,
  },
  actionChipStrip: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  actionChipBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  actionChipBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
});
