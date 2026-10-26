import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../../services/api";
import BreederNavigation from "../../components/BreederNavigation";
import EmptyState from "../../components/EmptyState";

export default function BreederAnalytics() {
  const router = useRouter();

  // Screen loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Analytics data states
  const [overview, setOverview] = useState(null);
  const [topVarieties, setTopVarieties] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [growthDuration, setGrowthDuration] = useState([]);
  const [diseaseOccurrence, setDiseaseOccurrence] = useState([]);
  const [locationPerformance, setLocationPerformance] = useState([]);
  const [stagePerformance, setStagePerformance] = useState([]);

  // Section error flags to ensure resilient rendering
  const [sectionErrors, setSectionErrors] = useState({});

  // Active filter for stage performance
  const [selectedStage, setSelectedStage] = useState("all");

  // Helper for safe numeric formatting
  const formatNum = (val, decimals = 2) => {
    if (val === null || val === undefined || val === "") return "N/A";
    const num = Number(val);
    if (isNaN(num)) return "N/A";
    return Number.isInteger(num) ? String(num) : num.toFixed(decimals);
  };

  const formatInt = (val) => {
    if (val === null || val === undefined || val === "") return "0";
    const num = Number(val);
    if (isNaN(num)) return "0";
    return String(Math.round(num));
  };

  // Safe fetch all analytics endpoints
  const fetchAllAnalytics = useCallback(async () => {
    const errors = {};

    const [
      overviewRes,
      topVarietiesRes,
      varietiesRes,
      growthRes,
      diseaseRes,
      locationRes,
      stageRes,
    ] = await Promise.allSettled([
      API.get("/breeder/overview"),
      API.get("/breeder/top-varieties"),
      API.get("/breeder/varieties"),
      API.get("/breeder/growth-duration"),
      API.get("/breeder/disease-occurrence"),
      API.get("/breeder/location-performance"),
      API.get("/breeder/stage-performance"),
    ]);

    // 1. Overview
    if (overviewRes.status === "fulfilled") {
      const data = overviewRes.value.data;
      setOverview(data?.overview || data || null);
    } else {
      console.log(
        "Overview API error:",
        overviewRes.reason?.response?.data || overviewRes.reason?.message
      );
      errors.overview = true;
    }

    // 2. Top Varieties
    if (topVarietiesRes.status === "fulfilled") {
      const data = topVarietiesRes.value.data;
      setTopVarieties(
        Array.isArray(data)
          ? data
          : data?.top_varieties || data?.varieties || []
      );
    } else {
      console.log(
        "Top Varieties API error:",
        topVarietiesRes.reason?.response?.data ||
          topVarietiesRes.reason?.message
      );
      errors.topVarieties = true;
    }

    // 3. Variety Comparison
    if (varietiesRes.status === "fulfilled") {
      const data = varietiesRes.value.data;
      setVarieties(
        Array.isArray(data) ? data : data?.varieties || []
      );
    } else {
      console.log(
        "Varieties API error:",
        varietiesRes.reason?.response?.data || varietiesRes.reason?.message
      );
      errors.varieties = true;
    }

    // 4. Growth Duration
    if (growthRes.status === "fulfilled") {
      const data = growthRes.value.data;
      setGrowthDuration(
        Array.isArray(data) ? data : data?.growth_duration || []
      );
    } else {
      console.log(
        "Growth Duration API error:",
        growthRes.reason?.response?.data || growthRes.reason?.message
      );
      errors.growthDuration = true;
    }

    // 5. Disease Occurrence
    if (diseaseRes.status === "fulfilled") {
      const data = diseaseRes.value.data;
      setDiseaseOccurrence(
        Array.isArray(data) ? data : data?.disease_occurrence || []
      );
    } else {
      console.log(
        "Disease Occurrence API error:",
        diseaseRes.reason?.response?.data || diseaseRes.reason?.message
      );
      errors.diseaseOccurrence = true;
    }

    // 6. Location Performance
    if (locationRes.status === "fulfilled") {
      const data = locationRes.value.data;
      setLocationPerformance(
        Array.isArray(data) ? data : data?.location_performance || []
      );
    } else {
      console.log(
        "Location Performance API error:",
        locationRes.reason?.response?.data || locationRes.reason?.message
      );
      errors.locationPerformance = true;
    }

    // 7. Stage Performance
    if (stageRes.status === "fulfilled") {
      const data = stageRes.value.data;
      setStagePerformance(
        Array.isArray(data) ? data : data?.stage_performance || []
      );
    } else {
      console.log(
        "Stage Performance API error:",
        stageRes.reason?.response?.data || stageRes.reason?.message
      );
      errors.stagePerformance = true;
    }

    setSectionErrors(errors);
  }, []);

  useEffect(() => {
    const loadInitial = async () => {
      setInitialLoading(true);
      await fetchAllAnalytics();
      setInitialLoading(false);
    };
    loadInitial();
  }, [fetchAllAnalytics]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllAnalytics();
    setRefreshing(false);
  };

  // Lifecycle stages list for filtering
  const lifecycleStages = [
    "all",
    "seed_sowing",
    "germination",
    "seedling",
    "vegetative",
    "flowering",
    "fruiting",
    "maturity",
    "harvest",
  ];

  const filteredStagePerformance =
    selectedStage === "all"
      ? stagePerformance
      : stagePerformance.filter(
          (item) =>
            item.stage?.toLowerCase() === selectedStage.toLowerCase()
        );

  // Disease severity color helper
  const getDiseaseColor = (percentage) => {
    const val = Number(percentage) || 0;
    if (val < 10) return "#2E7D32"; // Safe green
    if (val < 25) return "#F57C00"; // Caution orange
    return "#D32F2F"; // High disease red
  };

  const isAnalyticsEmpty =
    !initialLoading &&
    (!overview ||
      (Number(overview.total_crops || 0) === 0 &&
        Number(overview.total_varieties || 0) === 0 &&
        Number(overview.total_harvested || 0) === 0)) &&
    topVarieties.length === 0 &&
    varieties.length === 0 &&
    growthDuration.length === 0 &&
    diseaseOccurrence.length === 0 &&
    locationPerformance.length === 0 &&
    stagePerformance.length === 0;

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Breeder Analytics</Text>
            <Text style={styles.headerSubtitle}>
              Analyze crop and breeding performance
            </Text>
          </View>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2E7D32"]}
            tintColor="#2E7D32"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Breeder Analytics</Text>
            <Text style={styles.headerSubtitle}>
              Analyze crop and breeding performance
            </Text>
          </View>
        </View>

        {/* Breeder Module Navigation Bar */}
        <View style={{ marginTop: 14 }}>
          <BreederNavigation activeTab="analytics" />
        </View>

        {/* 1. OVERVIEW SECTION */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="grid-outline" size={17} color="#1B5E20" />
            </View>
            <Text style={styles.sectionTitle}>Overview</Text>
          </View>

          {sectionErrors.overview ? (
            <View style={styles.sectionErrorCard}>
              <Ionicons name="warning-outline" size={18} color="#D32F2F" />
              <Text style={styles.sectionErrorText}>
                Failed to load overview data
              </Text>
            </View>
          ) : (
            <View style={styles.overviewGrid}>
              {/* Total Crops */}
              <View style={styles.overviewCard}>
                <View style={[styles.cardIconBox, { backgroundColor: "#E8F5E9" }]}>
                  <Ionicons name="leaf" size={20} color="#2E7D32" />
                </View>
                <Text style={styles.overviewNumber}>
                  {formatInt(overview?.total_crops)}
                </Text>
                <Text style={styles.overviewLabel}>Total Crops</Text>
              </View>

              {/* Total Varieties */}
              <View style={styles.overviewCard}>
                <View style={[styles.cardIconBox, { backgroundColor: "#E3F2FD" }]}>
                  <Ionicons name="layers" size={20} color="#1976D2" />
                </View>
                <Text style={styles.overviewNumber}>
                  {formatInt(overview?.total_varieties)}
                </Text>
                <Text style={styles.overviewLabel}>Total Varieties</Text>
              </View>

              {/* Total Harvested */}
              <View style={styles.overviewCard}>
                <View style={[styles.cardIconBox, { backgroundColor: "#FFF3E0" }]}>
                  <Ionicons name="basket" size={20} color="#F57C00" />
                </View>
                <Text style={styles.overviewNumber}>
                  {formatInt(overview?.total_harvested)}
                </Text>
                <Text style={styles.overviewLabel}>Total Harvested</Text>
              </View>

              {/* Average Yield */}
              <View style={styles.overviewCard}>
                <View style={[styles.cardIconBox, { backgroundColor: "#F3E5F5" }]}>
                  <Ionicons name="trending-up" size={20} color="#7B1FA2" />
                </View>
                <Text style={styles.overviewNumber}>
                  {formatNum(overview?.average_yield)}
                </Text>
                <Text style={styles.overviewLabel}>Average Yield</Text>
              </View>
            </View>
          )}
        </View>

        {/* 2. TOP VARIETIES */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="trophy-outline" size={17} color="#1B5E20" />
            </View>
            <Text style={styles.sectionTitle}>Top Varieties</Text>
          </View>

          {sectionErrors.topVarieties ? (
            <View style={styles.sectionErrorCard}>
              <Ionicons name="warning-outline" size={18} color="#D32F2F" />
              <Text style={styles.sectionErrorText}>
                Failed to load top varieties
              </Text>
            </View>
          ) : topVarieties.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={32} color="#B0BEC5" />
              <Text style={styles.emptyText}>No data available yet</Text>
            </View>
          ) : (
            <>
              {/* Prominent Top Performing Variety Highlight */}
              <View style={styles.topVarietyHeroCard}>
                <View style={styles.topVarietyHeroHeader}>
                  <View style={styles.trophyIconCircle}>
                    <Text style={{ fontSize: 24 }}>🏆</Text>
                  </View>
                  <View style={styles.topVarietyHeroTitleWrap}>
                    <Text style={styles.topVarietyHeroLabel}>
                      TOP PERFORMING VARIETY
                    </Text>
                    <Text style={styles.topVarietyHeroName}>
                      {topVarieties[0].variety ||
                        topVarieties[0].variety_name ||
                        "Top Variety"}
                    </Text>
                  </View>
                  <View style={styles.topVarietyHeroScoreBadge}>
                    <Text style={styles.topVarietyHeroScoreNum}>
                      {formatNum(topVarieties[0].performance_score, 1)}
                    </Text>
                    <Text style={styles.topVarietyHeroScoreLabel}>SCORE</Text>
                  </View>
                </View>

                <View style={styles.topVarietyHeroMetrics}>
                  <View style={styles.heroMetricCol}>
                    <Text style={styles.heroMetricLabel}>Avg Yield</Text>
                    <Text style={styles.heroMetricValue}>
                      {formatNum(
                        topVarieties[0].average_yield ||
                          topVarieties[0].avg_yield
                      )}
                    </Text>
                  </View>
                  <View style={styles.heroMetricDivider} />
                  <View style={styles.heroMetricCol}>
                    <Text style={styles.heroMetricLabel}>Disease %</Text>
                    <Text
                      style={[
                        styles.heroMetricValue,
                        {
                          color:
                            Number(
                              topVarieties[0].disease_occurrence_percentage ??
                                topVarieties[0].disease_percentage ??
                                0
                            ) > 30
                              ? "#C62828"
                              : "#2E7D32",
                        },
                      ]}
                    >
                      {formatNum(
                        topVarieties[0].disease_occurrence_percentage ??
                          topVarieties[0].disease_percentage,
                        1
                      )}
                      %
                    </Text>
                  </View>
                  <View style={styles.heroMetricDivider} />
                  <View style={styles.heroMetricCol}>
                    <Text style={styles.heroMetricLabel}>Tested Crops</Text>
                    <Text style={styles.heroMetricValue}>
                      {formatInt(topVarieties[0].crop_count)}
                    </Text>
                  </View>
                </View>
              </View>

              {topVarieties.map((item, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;
              const varietyName =
                item.variety || item.variety_name || "Unknown Variety";
              const rankColor =
                rank === 1 ? "#FFB300" : rank === 2 ? "#78909C" : rank === 3 ? "#A1887F" : "#546E7A";

              return (
                <View
                  key={`top-var-${item.variety || index}`}
                  style={[
                    styles.topVarietyCard,
                    isTop3 && styles.top3HighlightCard,
                  ]}
                >
                  <View style={styles.topVarietyHeader}>
                    <View style={styles.rankBadgeContainer}>
                      <View
                        style={[
                          styles.rankBadge,
                          { backgroundColor: rankColor },
                        ]}
                      >
                        <Text style={styles.rankBadgeText}>#{rank}</Text>
                      </View>
                      <View style={styles.varietyTitleBox}>
                        <Text style={styles.varietyNameText}>{varietyName}</Text>
                        <Text style={styles.varietyCropsCount}>
                          {formatInt(item.crop_count)} crops tested
                        </Text>
                      </View>
                    </View>

                    {item.performance_score !== undefined && (
                      <View style={styles.scoreBadge}>
                        <Text style={styles.scoreLabel}>SCORE</Text>
                        <Text style={styles.scoreValue}>
                          {formatNum(item.performance_score, 1)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Metrics Row */}
                  <View style={styles.varietyMetricsRow}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Avg Yield</Text>
                      <Text style={styles.metricValue}>
                        {formatNum(item.average_yield || item.avg_yield)}
                      </Text>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Yield / Area</Text>
                      <Text style={styles.metricValue}>
                        {formatNum(
                          item.average_yield_per_area || item.yield_per_area
                        )}
                      </Text>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Growth Days</Text>
                      <Text style={styles.metricValue}>
                        {formatInt(
                          item.average_growth_duration || item.growth_duration
                        )}
                      </Text>
                    </View>

                    <View style={styles.metricDivider} />

                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>Disease %</Text>
                      <Text
                        style={[
                          styles.metricValue,
                          {
                            color: getDiseaseColor(
                              item.disease_occurrence_percentage
                            ),
                          },
                        ]}
                      >
                        {formatNum(item.disease_occurrence_percentage, 1)}%
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
        </View>

        {/* 3. VARIETY COMPARISON */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="swap-horizontal-outline" size={17} color="#1B5E20" />
            </View>
            <Text style={styles.sectionTitle}>Variety Comparison</Text>
          </View>

          {sectionErrors.varieties ? (
            <View style={styles.sectionErrorCard}>
              <Ionicons name="warning-outline" size={18} color="#D32F2F" />
              <Text style={styles.sectionErrorText}>
                Failed to load variety comparison
              </Text>
            </View>
          ) : varieties.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={32} color="#B0BEC5" />
              <Text style={styles.emptyText}>No data available yet</Text>
            </View>
          ) : (
            <View style={styles.comparisonList}>
              {varieties.map((v, idx) => {
                const name = v.variety || v.variety_name || `Variety ${idx + 1}`;
                return (
                  <View key={`comp-${name}-${idx}`} style={styles.comparisonCard}>
                    <View style={styles.compCardHeader}>
                      <Ionicons name="git-branch-outline" size={18} color="#2E7D32" />
                      <Text style={styles.compVarietyTitle}>{name}</Text>
                    </View>

                    <View style={styles.compDetailsGrid}>
                      <View style={styles.compDetailCol}>
                        <Text style={styles.compDetailLabel}>Crops / Harvested</Text>
                        <Text style={styles.compDetailValue}>
                          {formatInt(v.crop_count)} / {formatInt(v.harvested_count)}
                        </Text>
                      </View>

                      <View style={styles.compDetailCol}>
                        <Text style={styles.compDetailLabel}>Avg Yield</Text>
                        <Text style={styles.compDetailValue}>
                          {formatNum(v.average_yield || v.avg_yield)}
                        </Text>
                      </View>

                      <View style={styles.compDetailCol}>
                        <Text style={styles.compDetailLabel}>Yield / Area</Text>
                        <Text style={styles.compDetailValue}>
                          {formatNum(
                            v.average_yield_per_area || v.avg_yield_per_area
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 4. GROWTH DURATION */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="time-outline" size={17} color="#1B5E20" />
            </View>
            <Text style={styles.sectionTitle}>Growth Duration</Text>
          </View>

          {sectionErrors.growthDuration ? (
            <View style={styles.sectionErrorCard}>
              <Ionicons name="warning-outline" size={18} color="#D32F2F" />
              <Text style={styles.sectionErrorText}>
                Failed to load growth duration data
              </Text>
            </View>
          ) : growthDuration.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={32} color="#B0BEC5" />
              <Text style={styles.emptyText}>No data available yet</Text>
            </View>
          ) : (
            growthDuration.map((item, idx) => {
              const name = item.variety || `Variety ${idx + 1}`;
              const avg = Number(item.average_growth_duration) || 0;
              const min = Number(item.minimum_growth_duration) || 0;
              const max = Number(item.maximum_growth_duration) || 0;

              return (
                <View key={`growth-${name}-${idx}`} style={styles.growthCard}>
                  <View style={styles.growthCardHeader}>
                    <Text style={styles.growthVarietyName}>{name}</Text>
                    <View style={styles.growthAvgBadge}>
                      <Text style={styles.growthAvgBadgeText}>
                        Avg: {formatNum(avg, 1)} days
                      </Text>
                    </View>
                  </View>

                  <View style={styles.durationRangeContainer}>
                    <View style={styles.durationBound}>
                      <Text style={styles.durationBoundLabel}>Min Days</Text>
                      <Text style={styles.durationBoundValue}>{min || "N/A"}</Text>
                    </View>

                    <View style={styles.durationBarContainer}>
                      <View style={styles.durationBarTrack}>
                        <View
                          style={[
                            styles.durationBarFill,
                            {
                              width:
                                max > 0
                                  ? `${Math.min(
                                      100,
                                      Math.max(10, ((avg - min) / (max - min || 1)) * 100)
                                    )}%`
                                  : "50%",
                            },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.durationBound}>
                      <Text style={styles.durationBoundLabel}>Max Days</Text>
                      <Text style={styles.durationBoundValue}>{max || "N/A"}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* 5. DISEASE OCCURRENCE */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="bug-outline" size={17} color="#1B5E20" />
            </View>
            <Text style={styles.sectionTitle}>Disease Occurrence</Text>
          </View>

          {sectionErrors.diseaseOccurrence ? (
            <View style={styles.sectionErrorCard}>
              <Ionicons name="warning-outline" size={18} color="#D32F2F" />
              <Text style={styles.sectionErrorText}>
                Failed to load disease occurrence data
              </Text>
            </View>
          ) : diseaseOccurrence.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={32} color="#B0BEC5" />
              <Text style={styles.emptyText}>No data available yet</Text>
            </View>
          ) : (
            diseaseOccurrence.map((item, idx) => {
              const name = item.variety || `Variety ${idx + 1}`;
              const pct = Number(item.disease_occurrence_percentage) || 0;
              const affected = Number(item.affected_crops) || 0;
              const total = Number(item.crop_count) || 0;
              const color = getDiseaseColor(pct);

              return (
                <View key={`disease-${name}-${idx}`} style={styles.diseaseCard}>
                  <View style={styles.diseaseCardHeader}>
                    <Text style={styles.diseaseVarietyName}>{name}</Text>
                    <Text style={[styles.diseasePctText, { color }]}>
                      {formatNum(pct, 1)}%
                    </Text>
                  </View>

                  {/* Progress Bar Representation */}
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, Math.max(0, pct))}%`,
                          backgroundColor: color,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.diseaseFooterRow}>
                    <Text style={styles.diseaseFooterText}>
                      Affected: {affected} of {total} crops
                    </Text>
                    <Text
                      style={[
                        styles.diseaseStatusTag,
                        { color, borderColor: color },
                      ]}
                    >
                      {pct < 10 ? "Low Risk" : pct < 25 ? "Moderate" : "High Risk"}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* 6. LOCATION PERFORMANCE */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="location-outline" size={17} color="#1B5E20" />
            </View>
            <Text style={styles.sectionTitle}>Location Performance</Text>
          </View>

          {sectionErrors.locationPerformance ? (
            <View style={styles.sectionErrorCard}>
              <Ionicons name="warning-outline" size={18} color="#D32F2F" />
              <Text style={styles.sectionErrorText}>
                Failed to load location performance data
              </Text>
            </View>
          ) : locationPerformance.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={32} color="#B0BEC5" />
              <Text style={styles.emptyText}>No data available yet</Text>
            </View>
          ) : (
            locationPerformance.map((item, idx) => {
              const locationName =
                item.field_name || item.location || `Plot #${item.field_id || idx + 1}`;
              const varietyName = item.variety || "Variety";

              return (
                <View
                  key={`loc-${locationName}-${varietyName}-${idx}`}
                  style={styles.locationCard}
                >
                  <View style={styles.locationHeader}>
                    <View style={styles.locationIconBox}>
                      <Ionicons name="map" size={16} color="#1B5E20" />
                    </View>
                    <View style={styles.locationTitleBox}>
                      <Text style={styles.locationTitleText}>
                        {locationName}
                      </Text>
                      <Text style={styles.locationVarietyText}>
                        Variety: {varietyName}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.locationStatsRow}>
                    <View style={styles.locationStatItem}>
                      <Text style={styles.locationStatLabel}>Crops</Text>
                      <Text style={styles.locationStatValue}>
                        {formatInt(item.crop_count)}
                      </Text>
                    </View>

                    <View style={styles.locationStatItem}>
                      <Text style={styles.locationStatLabel}>Harvested</Text>
                      <Text style={styles.locationStatValue}>
                        {formatInt(item.harvested_count)}
                      </Text>
                    </View>

                    <View style={styles.locationStatItem}>
                      <Text style={styles.locationStatLabel}>Avg Yield</Text>
                      <Text style={styles.locationStatValue}>
                        {formatNum(item.average_yield || item.avg_yield)}
                      </Text>
                    </View>

                    <View style={styles.locationStatItem}>
                      <Text style={styles.locationStatLabel}>Yield / Area</Text>
                      <Text style={styles.locationStatValue}>
                        {formatNum(
                          item.average_yield_per_area || item.yield_per_area
                        )}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* 7. STAGE PERFORMANCE */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBadge}>
              <Ionicons name="analytics-outline" size={17} color="#1B5E20" />
            </View>
            <Text style={styles.sectionTitle}>Stage Performance</Text>
          </View>

          {/* Stage Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stageFilterScroll}
          >
            {lifecycleStages.map((stage) => {
              const isSelected = selectedStage === stage;
              return (
                <TouchableOpacity
                  key={`stage-chip-${stage}`}
                  style={[
                    styles.stageChip,
                    isSelected && styles.stageChipSelected,
                  ]}
                  onPress={() => setSelectedStage(stage)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.stageChipText,
                      isSelected && styles.stageChipTextSelected,
                    ]}
                  >
                    {stage.replace("_", " ").toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {sectionErrors.stagePerformance ? (
            <View style={styles.sectionErrorCard}>
              <Ionicons name="warning-outline" size={18} color="#D32F2F" />
              <Text style={styles.sectionErrorText}>
                Failed to load stage performance data
              </Text>
            </View>
          ) : filteredStagePerformance.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={32} color="#B0BEC5" />
              <Text style={styles.emptyText}>
                No measurements recorded for this stage
              </Text>
            </View>
          ) : (
            filteredStagePerformance.map((item, idx) => {
              const stageName = (
                item.stage || "unspecified"
              ).replace("_", " ");
              const varietyName = item.variety || "General";
              const measurementType =
                item.measurement_type || "Measurement";
              const avgValue = formatNum(
                item.average_value || item.avg_value
              );
              const unit = item.unit || "";
              const count = formatInt(item.measurement_count);

              return (
                <View
                  key={`stage-perf-${varietyName}-${item.stage}-${idx}`}
                  style={styles.stageCard}
                >
                  <View style={styles.stageCardTop}>
                    <View style={styles.stageBadge}>
                      <Text style={styles.stageBadgeText}>
                        {stageName.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.stageVarietyText}>{varietyName}</Text>
                  </View>

                  <View style={styles.stageMeasurementRow}>
                    <View style={styles.stageMeasurementBox}>
                      <Text style={styles.stageMeasureLabel}>
                        {measurementType}
                      </Text>
                      <Text style={styles.stageMeasureValue}>
                        {avgValue} {unit}
                      </Text>
                    </View>
                    <View style={styles.stageCountBox}>
                      <Text style={styles.stageCountLabel}>Samples</Text>
                      <Text style={styles.stageCountValue}>{count}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1B5E20",
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* Header */
  header: {
    backgroundColor: "#1B5E20",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  headerTextContainer: {
    paddingHorizontal: 2,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "bold",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: "#D7F0D8",
    fontSize: 14,
    marginTop: 4,
    lineHeight: 19,
  },

  /* Section Styling */
  sectionContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1B5E20",
    letterSpacing: 0.3,
  },

  /* Overview Section */
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    minWidth: "46%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  overviewNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#263238",
  },
  overviewLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#607D8B",
    marginTop: 2,
  },

  /* Top Varieties Section */
  topVarietyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },
  top3HighlightCard: {
    borderColor: "#C8E6C9",
    borderWidth: 1.5,
  },
  topVarietyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  rankBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  rankBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  varietyTitleBox: {
    flex: 1,
  },
  varietyNameText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#263238",
  },
  varietyCropsCount: {
    fontSize: 12,
    color: "#78909C",
    marginTop: 1,
  },
  scoreBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#2E7D32",
    letterSpacing: 0.5,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1B5E20",
  },
  varietyMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAF9",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E0E0E0",
  },
  metricLabel: {
    fontSize: 10.5,
    color: "#78909C",
    fontWeight: "600",
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#263238",
  },

  /* Top Variety Hero Card */
  topVarietyHeroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "#FFD54F",
    ...Platform.select({
      ios: {
        shadowColor: "#FF8F00",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  topVarietyHeroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  trophyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF8E1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  topVarietyHeroTitleWrap: {
    flex: 1,
  },
  topVarietyHeroLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#E65100",
    letterSpacing: 0.5,
  },
  topVarietyHeroName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1B5E20",
    marginTop: 2,
  },
  topVarietyHeroScoreBadge: {
    backgroundColor: "#E8F5E9",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A5D6A7",
  },
  topVarietyHeroScoreNum: {
    fontSize: 17,
    fontWeight: "800",
    color: "#2E7D32",
  },
  topVarietyHeroScoreLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#388E3C",
    letterSpacing: 0.3,
  },
  topVarietyHeroMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FAFCFA",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E8ECE8",
  },
  heroMetricCol: {
    flex: 1,
    alignItems: "center",
  },
  heroMetricDivider: {
    width: 1,
    height: 26,
    backgroundColor: "#E0E0E0",
  },
  heroMetricLabel: {
    fontSize: 11,
    color: "#78909C",
    fontWeight: "600",
    marginBottom: 3,
  },
  heroMetricValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#263238",
  },

  /* Variety Comparison */
  comparisonList: {
    gap: 10,
  },
  comparisonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },
  compCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  compVarietyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1B5E20",
    marginLeft: 8,
  },
  compDetailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FAFCFA",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },
  compDetailCol: {
    alignItems: "center",
    flex: 1,
  },
  compDetailLabel: {
    fontSize: 10,
    color: "#78909C",
    fontWeight: "600",
    marginBottom: 2,
  },
  compDetailValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#263238",
  },

  /* Growth Duration */
  growthCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },
  growthCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  growthVarietyName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#263238",
  },
  growthAvgBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  growthAvgBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2E7D32",
  },
  durationRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  durationBound: {
    alignItems: "center",
    minWidth: 55,
  },
  durationBoundLabel: {
    fontSize: 10,
    color: "#78909C",
    fontWeight: "600",
  },
  durationBoundValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#263238",
    marginTop: 2,
  },
  durationBarContainer: {
    flex: 1,
  },
  durationBarTrack: {
    height: 8,
    backgroundColor: "#ECEFF1",
    borderRadius: 4,
    overflow: "hidden",
  },
  durationBarFill: {
    height: "100%",
    backgroundColor: "#2E7D32",
    borderRadius: 4,
  },

  /* Disease Occurrence */
  diseaseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },
  diseaseCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  diseaseVarietyName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#263238",
  },
  diseasePctText: {
    fontSize: 15,
    fontWeight: "800",
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "#ECEFF1",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  diseaseFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  diseaseFooterText: {
    fontSize: 12,
    color: "#78909C",
  },
  diseaseStatusTag: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },

  /* Location Performance */
  locationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  locationTitleBox: {
    flex: 1,
  },
  locationTitleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#263238",
  },
  locationVarietyText: {
    fontSize: 12,
    color: "#2E7D32",
    fontWeight: "600",
    marginTop: 1,
  },
  locationStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FAFCFA",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },
  locationStatItem: {
    alignItems: "center",
    flex: 1,
  },
  locationStatLabel: {
    fontSize: 10,
    color: "#78909C",
    fontWeight: "600",
    marginBottom: 2,
  },
  locationStatValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#263238",
  },

  /* Stage Performance */
  stageFilterScroll: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  stageChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#ECEFF1",
    borderWidth: 1,
    borderColor: "#CFD8DC",
  },
  stageChipSelected: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },
  stageChipText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#546E7A",
  },
  stageChipTextSelected: {
    color: "#FFFFFF",
  },
  stageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },
  stageCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  stageBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stageBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#2E7D32",
    letterSpacing: 0.5,
  },
  stageVarietyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#263238",
  },
  stageMeasurementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FAFCFA",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EEF2EE",
  },
  stageMeasurementBox: {
    flex: 1,
  },
  stageMeasureLabel: {
    fontSize: 11,
    color: "#78909C",
    fontWeight: "600",
  },
  stageMeasureValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1B5E20",
    marginTop: 2,
  },
  stageCountBox: {
    alignItems: "flex-end",
  },
  stageCountLabel: {
    fontSize: 10,
    color: "#78909C",
    fontWeight: "600",
  },
  stageCountValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#263238",
    marginTop: 2,
  },

  /* Empty & Error Cards */
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EEF2EE",
    marginVertical: 4,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    color: "#90A4AE",
    fontWeight: "500",
  },
  sectionErrorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFCDD2",
    marginVertical: 4,
  },
  sectionErrorText: {
    marginLeft: 8,
    color: "#D32F2F",
    fontSize: 13,
    fontWeight: "600",
  },

  /* Initial Loading */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#546E7A",
    fontWeight: "500",
  },
});
