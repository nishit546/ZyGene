import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../../../../../services/api";
import SearchBar from "../../../../../components/ui/SearchBar";
import FilterButton from "../../../../../components/ui/FilterButton";
import FilterModal from "../../../../../components/ui/FilterModal";
import FilterSection from "../../../../../components/ui/FilterSection";
import EmptySearchState from "../../../../../components/ui/EmptySearchState";
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from "../../../../../constants/theme";
import CropContextBar from "../../../../../components/ui/CropContextBar";
import FarmerHeader from "../../../../../components/ui/FarmerHeader";
import StatusBadge from "../../../../../components/ui/StatusBadge";
import AppInput from "../../../../../components/ui/AppInput";
import AppButton from "../../../../../components/ui/AppButton";
import RecordDetailModal from "../../../../../components/ui/RecordDetailModal";

const QUALITY_GRADES = ["Grade A", "Grade B", "Grade C", "Commercial", "Export"];
const YIELD_UNITS = ["kg", "quintals", "tons", "bags", "lbs"];

export default function Harvest() {
  const router = useRouter();
  const { id, recordId } = useLocalSearchParams();

  const [harvestRecords, setHarvestRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortBy, setSortBy] = useState("Newest first");
  const [tempSortBy, setTempSortBy] = useState("Newest first");
const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Form states
  const [harvestDate, setHarvestDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [totalYield, setTotalYield] = useState("");
  const [yieldUnit, setYieldUnit] = useState("kg");
  const [areaHarvested, setAreaHarvested] = useState("");
  const [areaUnit, setAreaUnit] = useState("acres");
  const [yieldPerArea, setYieldPerArea] = useState("");
  const [numberOfPlants, setNumberOfPlants] = useState("");
  const [averageWeight, setAverageWeight] = useState("");
  const [qualityGrade, setQualityGrade] = useState("Grade A");
  const [notes, setNotes] = useState("");

  const loadHarvest = useCallback(async () => {
    if (!recordId) return;
    try {
      setLoading(true);
      const response = await API.get(`/harvest/${recordId}`);
      setHarvestRecords(response.data?.harvest || []);
    } catch (error) {
      console.log("HARVEST ERROR:", error.response?.data || error.message);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to load harvest records."
      );
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    loadHarvest();
  }, [loadHarvest]);

  const handleYieldOrAreaChange = (newTotal, newArea) => {
    if (
      newTotal &&
      newArea &&
      !isNaN(Number(newTotal)) &&
      !isNaN(Number(newArea)) &&
      Number(newArea) > 0
    ) {
      const calc = (Number(newTotal) / Number(newArea)).toFixed(2);
      setYieldPerArea(String(calc));
    }
  };

  const handleCreateHarvest = async () => {
    if (!harvestDate.trim()) {
      Alert.alert("Required Field", "Please enter the harvest date.");
      return;
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(harvestDate.trim())) {
      Alert.alert("Invalid Date", "Please use YYYY-MM-DD format.");
      return;
    }

    if (totalYield.trim() && isNaN(Number(totalYield.trim()))) {
      Alert.alert("Invalid Input", "Total yield must be a valid number.");
      return;
    }

    if (creating) return;

    try {
      setCreating(true);

      const payload = {
        lifecycle_record_id: Number(recordId),
        harvest_date: harvestDate.trim(),
        total_yield: totalYield.trim() ? Number(totalYield.trim()) : null,
        yield_unit: yieldUnit.trim() || null,
        area_harvested: areaHarvested.trim() ? Number(areaHarvested.trim()) : null,
        area_unit: areaUnit.trim() || null,
        yield_per_area: yieldPerArea.trim() ? Number(yieldPerArea.trim()) : null,
        number_of_plants: numberOfPlants.trim()
          ? Number(numberOfPlants.trim())
          : null,
        average_weight_per_plant: averageWeight.trim()
          ? Number(averageWeight.trim())
          : null,
        quality_grade: qualityGrade.trim() || null,
        notes: notes.trim() || null,
      };

      await API.post("/harvest", payload);

      Alert.alert("Recorded", "Harvest production data saved successfully.");
      setTotalYield("");
      setAreaHarvested("");
      setYieldPerArea("");
      setNotes("");
      loadHarvest();
    } catch (error) {
      console.log("CREATE HARVEST ERROR:", error.response?.data || error.message);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to save harvest record."
      );
    } finally {
      setCreating(false);
    }
  };

  const latestHarvest = useMemo(() => {
    if (harvestRecords.length === 0) return null;
    return harvestRecords[harvestRecords.length - 1];
  }, [harvestRecords]);

  const totalCumulativeYield = useMemo(() => {
    return harvestRecords.reduce((acc, curr) => {
      const val = parseFloat(curr.total_yield) || 0;
      return acc + val;
    }, 0);
  }, [harvestRecords]);

  
  const filteredRecords = useMemo(() => {
    let result = harvestRecords;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => {
        return (item.quality || '').toLowerCase().includes(q) || (item.notes || '').toLowerCase().includes(q);
      });
    }

    result = [...result];
    if (sortBy === "Oldest first") {
      result.sort((a, b) => new Date(a.harvest_date || 0) - new Date(b.harvest_date || 0));
    } else if (sortBy === "Newest first") {
      result.sort((a, b) => new Date(b.harvest_date || 0) - new Date(a.harvest_date || 0));
    } else if (sortBy === "Highest severity") {
      const sev = {"High": 3, "Medium": 2, "Low": 1};
      result.sort((a, b) => (sev[b.severity] || 0) - (sev[a.severity] || 0));
    } else if (sortBy === "Largest yield") {
      result.sort((a, b) => (parseFloat(b.total_yield) || 0) - (parseFloat(a.total_yield) || 0));
    }
    return result;
  }, [harvestRecords, searchQuery, sortBy]);
return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <FarmerHeader
        title="Harvest & Production"
        subtitle="Track crop yields & quality grade results"
        showBack={true}
      />

      <CropContextBar cropId={id} />


      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* HARVEST RESULT HIGHLIGHT STRIP */}
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultHeaderTitle}>HARVEST RESULT</Text>
              {latestHarvest?.quality_grade ? (
                <StatusBadge
                  status={latestHarvest.quality_grade}
                  size="sm"
                  customLabel={latestHarvest.quality_grade}
                />
              ) : null}
            </View>

            <View style={styles.metricGrid}>
              <View style={styles.metricCell}>
                <Text style={styles.metricNumber}>
                  {latestHarvest?.total_yield != null
                    ? `${latestHarvest.total_yield} ${latestHarvest.yield_unit || "kg"}`
                    : totalCumulativeYield > 0
                    ? `${totalCumulativeYield} kg`
                    : "--"}
                </Text>
                <Text style={styles.metricSub}>Total Yield</Text>
              </View>

              <View style={styles.metricCell}>
                <Text style={styles.metricNumber}>
                  {latestHarvest?.yield_per_area != null
                    ? `${latestHarvest.yield_per_area} kg/acre`
                    : "--"}
                </Text>
                <Text style={styles.metricSub}>Yield per Area</Text>
              </View>

              <View style={styles.metricCell}>
                <Text style={styles.metricNumber}>
                  {latestHarvest?.quality_grade
                    ? latestHarvest.quality_grade.replace("Grade ", "")
                    : "A"}
                </Text>
                <Text style={styles.metricSub}>Quality Grade</Text>
              </View>

              <View style={styles.metricCell}>
                <Text style={styles.metricNumber}>
                  {latestHarvest?.harvest_date
                    ? new Date(latestHarvest.harvest_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                    : "--"}
                </Text>
                <Text style={styles.metricSub}>Harvest Date</Text>
              </View>
            </View>
          </View>

          {/* HARVEST RECORDS LIST */}
          <Text style={styles.sectionHeader}>HARVEST LOG</Text>
          {harvestRecords.length > 0 && (
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md}}>
            <View style={{flex: 1, marginRight: SPACING.sm}}>
              <SearchBar
                placeholder="Search harvest notes..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onClear={() => setSearchQuery("")}
              />
            </View>
            <FilterButton
              count={0}
              label="Sort"
              onPress={() => {
                setTempSortBy(sortBy);
                setFilterVisible(true);
              }}
            />
          </View>
          )}
          
          {harvestRecords.length > 0 && filteredRecords.length === 0 && (
            <EmptySearchState onClear={() => setSearchQuery("")} />
          )}
          
          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading harvest history...</Text>
            </View>
          ) : harvestRecords.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No harvest records yet</Text>
              <Text style={styles.emptySub}>
                Record production yield and crop grading results below.
              </Text>
            </View>
          ) : filteredRecords.length > 0 ? (
            <View style={styles.recordsList}>
              {filteredRecords.map((item, idx) => {
                const dateStr = item.harvest_date
                  ? new Date(item.harvest_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                  : "Recorded";

                return (
                  <TouchableOpacity
                    key={item.id || idx}
                    style={styles.recordRowCard}
                    onPress={() => setSelectedRecord(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recordLeft}>
                      <View style={styles.titleRow}>
                        <Text style={styles.recordTitle}>
                          {item.quality_grade || "Harvest Batch"}
                        </Text>
                        <Text style={styles.recordDate}>{dateStr}</Text>
                      </View>

                      <View style={styles.metaRow}>
                        {item.area_harvested ? (
                          <Text style={styles.areaText}>
                            Area: {item.area_harvested} {item.area_unit || "acres"}
                          </Text>
                        ) : null}
                        {item.yield_per_area ? (
                          <Text style={styles.rateText}>
                            • Rate: {item.yield_per_area} {item.yield_unit || "kg"}/
                            {item.area_unit || "acre"}
                          </Text>
                        ) : null}
                      </View>

                      {item.notes ? (
                        <Text style={styles.recordNotes} numberOfLines={1}>
                          {item.notes}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.recordRight}>
                      {item.total_yield ? (
                        <View style={styles.yieldBadge}>
                          <Text style={styles.yieldBadgeNum}>
                            {item.total_yield}
                          </Text>
                          <Text style={styles.yieldBadgeUnit}>
                            {item.yield_unit || "kg"}
                          </Text>
                        </View>
                      ) : null}
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={COLORS.borderDark}
                        style={styles.chevron}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {/* ADD RECORD FORM */}
          <Text style={styles.sectionHeader}>+ LOG HARVEST PRODUCTION</Text>
          <View style={styles.formCard}>
            <AppInput
              label="Harvest Date *"
              placeholder="YYYY-MM-DD"
              value={harvestDate}
              onChangeText={setHarvestDate}
            />

            <View style={styles.rowInputs}>
              <View style={styles.colInput}>
                <AppInput
                  label="Total Yield *"
                  placeholder="e.g. 580"
                  value={totalYield}
                  onChangeText={(val) => {
                    setTotalYield(val);
                    handleYieldOrAreaChange(val, areaHarvested);
                  }}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.gapInput} />
              <View style={styles.colInput}>
                <AppInput
                  label="Yield Unit"
                  placeholder="kg"
                  value={yieldUnit}
                  onChangeText={setYieldUnit}
                />
              </View>
            </View>

            <View style={styles.unitChipRow}>
              {YIELD_UNITS.map((u) => {
                const isSelected = yieldUnit === u;
                return (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitChip, isSelected && styles.unitChipActive]}
                    onPress={() => setYieldUnit(u)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.unitChipText, isSelected && styles.unitChipTextActive]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.colInput}>
                <AppInput
                  label="Area Harvested"
                  placeholder="e.g. 4.8"
                  value={areaHarvested}
                  onChangeText={(val) => {
                    setAreaHarvested(val);
                    handleYieldOrAreaChange(totalYield, val);
                  }}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.gapInput} />
              <View style={styles.colInput}>
                <AppInput
                  label="Area Unit"
                  placeholder="acres"
                  value={areaUnit}
                  onChangeText={setAreaUnit}
                />
              </View>
            </View>

            <AppInput
              label="Calculated Yield per Area"
              placeholder="Auto-calculated (e.g. 120.8)"
              value={yieldPerArea}
              onChangeText={setYieldPerArea}
              keyboardType="numeric"
              helper="Auto-calculated from total yield and area"
            />

            <Text style={styles.fieldLabel}>Quality Grade</Text>
            <View style={styles.chipRow}>
              {QUALITY_GRADES.map((g) => {
                const isSelected = qualityGrade === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setQualityGrade(g)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <AppInput
              label="Production Notes"
              placeholder="Moisture content at harvest, grain quality, market destination..."
              value={notes}
              onChangeText={setNotes}
              multiline={true}
              numberOfLines={3}
            />

            <AppButton
              title="Save Harvest Production"
              variant="primary"
              onPress={handleCreateHarvest}
              loading={creating}
              style={styles.submitBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <RecordDetailModal
          visible={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title="Harvest Batch Details"
          type={selectedRecord.quality_grade || "Harvest Batch"}
          primaryValue={
            selectedRecord.total_yield
              ? `${selectedRecord.total_yield} ${selectedRecord.yield_unit || "kg"}`
              : "Completed"
          }
          date={
            selectedRecord.harvest_date
              ? new Date(selectedRecord.harvest_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
              : null
          }
          details={[
            { label: "Quality Grade", value: selectedRecord.quality_grade || "Unassigned" },
            {
              label: "Area Harvested",
              value: selectedRecord.area_harvested
                ? `${selectedRecord.area_harvested} ${selectedRecord.area_unit || "acres"}`
                : "Not recorded",
            },
            {
              label: "Yield per Area",
              value: selectedRecord.yield_per_area
                ? `${selectedRecord.yield_per_area} ${selectedRecord.yield_unit || "kg"}/${selectedRecord.area_unit || "acre"}`
                : "Not calculated",
            },
            { label: "Lifecycle Stage ID", value: String(recordId) },
          ]}
          notes={selectedRecord.notes}
          onDelete={() => {
            setHarvestRecords((prev) => prev.filter((h) => h !== selectedRecord));
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg, // 20px
    paddingTop: SPACING.base,
    paddingBottom: 40,
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
    marginBottom: SPACING.xl,
    ...SHADOWS.subtle,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  resultHeaderTitle: {
    ...TYPOGRAPHY.caption,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  metricCell: {
    width: "48%",
    marginHorizontal: "1%",
    marginBottom: 10,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  metricNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  centerLoading: {
    paddingVertical: SPACING.xl,
    alignItems: "center",
  },
  loadingText: {
    ...TYPOGRAPHY.supporting,
    marginTop: SPACING.sm,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: "center",
    marginBottom: SPACING.xl,
    ...SHADOWS.subtle,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  recordsList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.xl,
    ...SHADOWS.subtle,
  },
  recordRowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  recordLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  recordDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  areaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  rateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  recordNotes: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  recordRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  yieldBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  yieldBadgeNum: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  yieldBadgeUnit: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginLeft: 3,
  },
  chevron: {
    marginLeft: 6,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
    marginBottom: SPACING.xl,
    ...SHADOWS.subtle,
  },
  rowInputs: {
    flexDirection: "row",
  },
  colInput: {
    flex: 1,
  },
  gapInput: {
    width: SPACING.md,
  },
  unitChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: -8,
    marginBottom: SPACING.md,
  },
  unitChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginRight: 6,
    marginBottom: 6,
  },
  unitChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  unitChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  unitChipTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: SPACING.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  submitBtn: {
    marginTop: SPACING.sm,
  },
});