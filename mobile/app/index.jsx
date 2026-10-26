import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
  ScrollView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOWS } from "../constants/theme";

const { width } = Dimensions.get("window");

export default function Index() {
  const [currentUser, setCurrentUser] = useState(null);
  const [tapMessage, setTapMessage] = useState(null);
  const [growthClicks, setGrowthClicks] = useState(0);

  // Animation values
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const sproutGrowth = useRef(new Animated.Value(0)).current;
  const pulseRing1 = useRef(new Animated.Value(0)).current;
  const pulseRing2 = useRef(new Animated.Value(0)).current;
  const pulseRing3 = useRef(new Animated.Value(0)).current;
  const leafLeftSway = useRef(new Animated.Value(0)).current;
  const leafRightSway = useRef(new Animated.Value(0)).current;
  const ambientFloat = useRef(new Animated.Value(0)).current;
  const counterFloat = useRef(new Animated.Value(0)).current;
  const sunRotation = useRef(new Animated.Value(0)).current;
  const dnaRotation = useRef(new Animated.Value(0)).current;
  const tapSurge = useRef(new Animated.Value(1)).current;
  const toastFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Check if user is already logged in
    const checkActiveSession = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const userStr = await AsyncStorage.getItem("user");
        if (token && userStr) {
          const user = JSON.parse(userStr);
          setCurrentUser(user);
        }
      } catch (err) {
        console.log("Session inspect:", err);
      }
    };
    checkActiveSession();

    // 1. Initial Staggered Entrance
    Animated.parallel([
      Animated.timing(entranceAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(sproutGrowth, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Pulse Ring 1 Loop
    const createPulseLoop = (anim, delay = 0) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const pulse1 = createPulseLoop(pulseRing1, 0);
    const pulse2 = createPulseLoop(pulseRing2, 850);
    const pulse3 = createPulseLoop(pulseRing3, 1700);
    pulse1.start();
    pulse2.start();
    pulse3.start();

    // 3. Leaf Swaying Loops
    Animated.loop(
      Animated.sequence([
        Animated.timing(leafLeftSway, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(leafLeftSway, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(leafRightSway, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(leafRightSway, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4. Floating Elements
    Animated.loop(
      Animated.sequence([
        Animated.timing(ambientFloat, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ambientFloat, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(counterFloat, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(counterFloat, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 5. Sun & DNA continuous rotations
    Animated.loop(
      Animated.timing(sunRotation, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(dnaRotation, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    return () => {
      pulse1.stop();
      pulse2.stop();
      pulse3.stop();
    };
  }, []);

  // Interactive Tap on Plant
  const handlePlantTap = () => {
    const newClicks = growthClicks + 1;
    setGrowthClicks(newClicks);

    const stages = [
      "🌱 Germination: Vigorous Sprout!",
      "🌿 Photosynthesis: Vitality 100%",
      "💧 Deep Hydration Activated!",
      "🌾 Golden Yield Forecast: Excellent",
      "🧬 Hybrid Vigor: Optimal F1 Expression",
    ];
    const message = stages[newClicks % stages.length];
    setTapMessage(message);

    // Bounce tap surge
    Animated.sequence([
      Animated.spring(tapSurge, {
        toValue: 1.28,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(tapSurge, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Toast animation
    toastFade.setValue(1);
    Animated.sequence([
      Animated.delay(1800),
      Animated.timing(toastFade, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Interpolations
  const ring1Scale = pulseRing1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.7],
  });
  const ring1Opacity = pulseRing1.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.65, 0.35, 0],
  });

  const ring2Scale = pulseRing2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.7],
  });
  const ring2Opacity = pulseRing2.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.65, 0.35, 0],
  });

  const ring3Scale = pulseRing3.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.7],
  });
  const ring3Opacity = pulseRing3.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.65, 0.35, 0],
  });

  const leftLeafRotate = leafLeftSway.interpolate({
    inputRange: [0, 1],
    outputRange: ["-24deg", "-8deg"],
  });

  const rightLeafRotate = leafRightSway.interpolate({
    inputRange: [0, 1],
    outputRange: ["8deg", "24deg"],
  });

  const floatY1 = ambientFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 8],
  });

  const floatY2 = counterFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [8, -8],
  });

  const sunSpin = sunRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const dnaSpin = dnaRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const heroTranslateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [25, 0],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F8F4" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {/* Top Brand Header */}
          <Animated.View
            style={[
              styles.headerArea,
              {
                opacity: entranceAnim,
                transform: [{ translateY: heroTranslateY }],
              },
            ]}
          >
            <View style={styles.logoRow}>
              <View style={styles.logoIconContainer}>
                <Ionicons name="leaf" size={20} color="#FFFFFF" />
              </View>
              <View>
                <View style={styles.brandTitleRow}>
                  <Text style={styles.brandName}>ZYGENE</Text>
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>INTELLIGENCE</Text>
                  </View>
                </View>
                <Text style={styles.brandSubtitle}>
                  Next-Gen Agritech & Crop Genetics OS
                </Text>
              </View>
            </View>

            {/* Quick Switch if logged in */}
            {currentUser ? (
              <TouchableOpacity
                style={styles.activeUserPill}
                onPress={() =>
                  router.push(
                    currentUser.role === "breeder"
                      ? "/breeder/dashboard"
                      : "/farmer/dashboard"
                  )
                }
                activeOpacity={0.8}
              >
                <Ionicons name="person-circle" size={18} color="#1B5E20" />
                <Text style={styles.activeUserPillText}>
                  {currentUser.name || "My Dashboard"}
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#1B5E20" />
              </TouchableOpacity>
            ) : null}
          </Animated.View>

          {/* CRAZY ANIMATED CROP STAGE */}
          <View style={styles.stageContainer}>
            {/* Ambient Background Grid Pattern */}
            <View style={styles.stageGrid}>
              <View style={styles.gridHLine1} />
              <View style={styles.gridHLine2} />
              <View style={styles.gridVLine1} />
              <View style={styles.gridVLine2} />
            </View>

            {/* Floating Live Metric Badge 1 (Vitality) */}
            <Animated.View
              style={[
                styles.floatingBadgeLeft,
                { transform: [{ translateY: floatY1 }] },
              ]}
            >
              <View style={styles.metricIconWrap}>
                <Ionicons name="pulse" size={15} color="#2E7D32" />
              </View>
              <View>
                <Text style={styles.metricLabel}>Crop Vitality</Text>
                <Text style={styles.metricVal}>99.4% Prime</Text>
              </View>
            </Animated.View>

            {/* Floating Live Metric Badge 2 (Genomics) */}
            <Animated.View
              style={[
                styles.floatingBadgeRight,
                { transform: [{ translateY: floatY2 }] },
              ]}
            >
              <Animated.View
                style={[
                  styles.metricIconWrap,
                  { transform: [{ rotate: dnaSpin }] },
                ]}
              >
                <Ionicons name="git-branch-outline" size={15} color="#1565C0" />
              </Animated.View>
              <View>
                <Text style={styles.metricLabel}>Hybrid F1</Text>
                <Text style={styles.metricVal}>Genetics Active</Text>
              </View>
            </Animated.View>

            {/* Floating Ambient Drifting Leaves */}
            <Animated.View
              style={[
                styles.driftingLeafTop,
                {
                  transform: [
                    { translateY: floatY2 },
                    { rotate: leftLeafRotate },
                  ],
                },
              ]}
            >
              <Ionicons name="leaf-outline" size={20} color="#81C784" />
            </Animated.View>

            <Animated.View
              style={[
                styles.driftingWaterDrop,
                {
                  transform: [
                    { translateY: floatY1 },
                  ],
                },
              ]}
            >
              <Ionicons name="water" size={18} color="#64B5F6" />
            </Animated.View>

            {/* CENTER PLANT & ENERGY CORE */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handlePlantTap}
              style={styles.plantTouchTarget}
              accessibilityLabel="Tap the plant to trigger growth pulse"
            >
              {/* Concentric Bio-Waves */}
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: ring1Scale }],
                    opacity: ring1Opacity,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: ring2Scale }],
                    opacity: ring2Opacity,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: ring3Scale }],
                    opacity: ring3Opacity,
                  },
                ]}
              />

              {/* Glowing Halo Core */}
              <View style={styles.haloGlow} />

              {/* The Interactive Plant Sprout */}
              <Animated.View
                style={[
                  styles.plantWrapper,
                  {
                    transform: [
                      { scale: Animated.multiply(sproutGrowth, tapSurge) },
                    ],
                  },
                ]}
              >
                {/* Sunburst Crown */}
                <Animated.View
                  style={[
                    styles.crownSun,
                    { transform: [{ rotate: sunSpin }] },
                  ]}
                >
                  <Ionicons name="sunny" size={26} color="#F59E0B" />
                </Animated.View>

                {/* Central Vitality Sprout Node */}
                <View style={styles.sproutStem}>
                  {/* Stem Core Line */}
                  <View style={styles.stemLine} />

                  {/* Left Swaying Leaf */}
                  <Animated.View
                    style={[
                      styles.leftLeafContainer,
                      { transform: [{ rotate: leftLeafRotate }] },
                    ]}
                  >
                    <View style={styles.leafShapeLeft}>
                      <Ionicons name="leaf" size={38} color="#2E7D32" />
                    </View>
                  </Animated.View>

                  {/* Right Swaying Leaf */}
                  <Animated.View
                    style={[
                      styles.rightLeafContainer,
                      { transform: [{ rotate: rightLeafRotate }] },
                    ]}
                  >
                    <View style={styles.leafShapeRight}>
                      <Ionicons name="leaf" size={38} color="#388E3C" />
                    </View>
                  </Animated.View>

                  {/* Sprout Seed Base / Bio-Soil Pod */}
                  <View style={styles.seedPod}>
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                  </View>
                </View>
              </Animated.View>
            </TouchableOpacity>

            {/* Growth Surge Toast Feedback */}
            {tapMessage ? (
              <Animated.View
                style={[styles.growthToast, { opacity: toastFade }]}
              >
                <Text style={styles.growthToastText}>{tapMessage}</Text>
              </Animated.View>
            ) : null}

            {/* Interactive Hint */}
            <View style={styles.interactiveHint}>
              <Ionicons name="finger-print-outline" size={13} color="#5A6B63" />
              <Text style={styles.interactiveHintText}>
                Tap the seedling to energize growth
              </Text>
            </View>
          </View>

          {/* Hero Headlines */}
          <Animated.View
            style={[
              styles.heroTextSection,
              {
                opacity: entranceAnim,
                transform: [{ translateY: heroTranslateY }],
              },
            ]}
          >
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <Ionicons name="leaf" size={13} color="#1B5E20" />
                <Text style={styles.heroBadgeText}>PRECISION AGRONOMY</Text>
              </View>
              <View style={[styles.heroBadge, { backgroundColor: "#E3F2FD" }]}>
                <Ionicons name="flask-outline" size={13} color="#1565C0" />
                <Text style={[styles.heroBadgeText, { color: "#1565C0" }]}>
                  GENOMIC BREEDING
                </Text>
              </View>
            </View>

            <Text style={styles.heroHeadline}>
              Intelligence Rooted{"\n"}
              in Nature & Science.
            </Text>

            <Text style={styles.heroDescription}>
              Unify crop lifecycle stages, IoT field monitoring, irrigation
              metrics, and breeding trial genetics into one connected platform.
            </Text>
          </Animated.View>

          {/* Quick Dual-Pillar Showcase */}
          <Animated.View
            style={[
              styles.pillarsRow,
              {
                opacity: entranceAnim,
                transform: [{ translateY: heroTranslateY }],
              },
            ]}
          >
            {/* Farmer Card */}
            <TouchableOpacity
              style={styles.pillarCard}
              onPress={() => router.push(currentUser ? "/farmer/dashboard" : "/login")}
              activeOpacity={0.85}
            >
              <View style={[styles.pillarIconBox, { backgroundColor: "#E8F5E9" }]}>
                <Ionicons name="speedometer-outline" size={22} color="#1B5E20" />
              </View>
              <Text style={styles.pillarTitle}>Farmer Portal</Text>
              <Text style={styles.pillarDesc}>
                Field plots, daily stages, pest treatments & yield forecasting.
              </Text>
              <View style={styles.pillarArrow}>
                <Text style={styles.pillarArrowText}>Explore</Text>
                <Ionicons name="arrow-forward" size={14} color="#1B5E20" />
              </View>
            </TouchableOpacity>

            {/* Breeder Card */}
            <TouchableOpacity
              style={styles.pillarCard}
              onPress={() => router.push(currentUser ? "/breeder/dashboard" : "/login")}
              activeOpacity={0.85}
            >
              <View style={[styles.pillarIconBox, { backgroundColor: "#E3F2FD" }]}>
                <Ionicons name="git-network-outline" size={22} color="#0D47A1" />
              </View>
              <Text style={styles.pillarTitle}>Breeder Lab</Text>
              <Text style={styles.pillarDesc}>
                Cross experiments, trial blocks, phenotypic traits & pedigrees.
              </Text>
              <View style={styles.pillarArrow}>
                <Text style={[styles.pillarArrowText, { color: "#0D47A1" }]}>Explore</Text>
                <Ionicons name="arrow-forward" size={14} color="#0D47A1" />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* CTA Actions */}
          <Animated.View
            style={[
              styles.actionsContainer,
              {
                opacity: entranceAnim,
                transform: [{ translateY: heroTranslateY }],
              },
            ]}
          >
            {currentUser ? (
              <TouchableOpacity
                style={styles.primaryCta}
                onPress={() =>
                  router.push(
                    currentUser.role === "breeder"
                      ? "/breeder/dashboard"
                      : "/farmer/dashboard"
                  )
                }
                activeOpacity={0.88}
              >
                <Text style={styles.primaryCtaText}>
                  Continue to {currentUser.role === "breeder" ? "Breeder Lab" : "Farmer Portal"}
                </Text>
                <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.primaryCta}
                  onPress={() => router.push("/register")}
                  activeOpacity={0.88}
                >
                  <Text style={styles.primaryCtaText}>Get Started with ZyGENE</Text>
                  <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryCta}
                  onPress={() => router.push("/login")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryCtaText}>Sign In to Account</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>

          {/* Footer Note */}
          <Text style={styles.footerNote}>
            ZyGENE Agritech Intelligence • Version 2.0 • Secured Enterprise Platform
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F8F4",
  },
  scrollContainer: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
  },
  contentWrapper: {
    width: "100%",
    maxWidth: 860,
  },

  /* Header */
  headerArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2ECE2",
    marginBottom: 16,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#1B5E20",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      web: {
        boxShadow: "0 4px 12px rgba(27, 94, 32, 0.25)",
      },
      default: {
        ...SHADOWS.subtle,
      },
    }),
  },
  brandTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandName: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#1B5E20",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2E7D32",
  },
  liveText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#2E7D32",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: "#5A6B63",
    fontWeight: "500",
    marginTop: 2,
  },
  activeUserPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    ...Platform.select({
      web: {
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      },
    }),
  },
  activeUserPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B5E20",
  },

  /* ANIMATED STAGE */
  stageContainer: {
    height: 310,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#D8E6D8",
    marginVertical: 12,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    ...Platform.select({
      web: {
        boxShadow: "0 10px 30px rgba(27, 94, 32, 0.08)",
      },
    }),
  },
  stageGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
  },
  gridHLine1: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "30%",
    height: 1,
    backgroundColor: "#E8EFE8",
  },
  gridHLine2: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "70%",
    height: 1,
    backgroundColor: "#E8EFE8",
  },
  gridVLine1: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "25%",
    width: 1,
    backgroundColor: "#E8EFE8",
  },
  gridVLine2: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "75%",
    width: 1,
    backgroundColor: "#E8EFE8",
  },

  /* Floating Telemetry Badges */
  floatingBadgeLeft: {
    position: "absolute",
    top: 24,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D2E4D2",
    zIndex: 10,
    ...Platform.select({
      web: {
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.06)",
        backdropFilter: "blur(6px)",
      },
    }),
  },
  floatingBadgeRight: {
    position: "absolute",
    bottom: 30,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D2E4D2",
    zIndex: 10,
    ...Platform.select({
      web: {
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.06)",
        backdropFilter: "blur(6px)",
      },
    }),
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F0F7F0",
    justifyContent: "center",
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7D74",
    textTransform: "uppercase",
  },
  metricVal: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#1C2526",
  },

  driftingLeafTop: {
    position: "absolute",
    top: 28,
    right: 36,
    zIndex: 5,
  },
  driftingWaterDrop: {
    position: "absolute",
    bottom: 40,
    left: 36,
    zIndex: 5,
  },

  /* Plant Touch Target & Pulse Rings */
  plantTouchTarget: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  pulseRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: "#4CAF50",
    backgroundColor: "rgba(76, 175, 80, 0.06)",
  },
  haloGlow: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(200, 230, 201, 0.5)",
  },

  /* Plant Visual Architecture */
  plantWrapper: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  crownSun: {
    marginBottom: -4,
  },
  sproutStem: {
    alignItems: "center",
    position: "relative",
    width: 80,
    height: 90,
    justifyContent: "center",
  },
  stemLine: {
    width: 5,
    height: 52,
    backgroundColor: "#2E7D32",
    borderRadius: 3,
  },
  leftLeafContainer: {
    position: "absolute",
    top: 14,
    left: -8,
    transformOrigin: "bottom right",
  },
  leafShapeLeft: {
    transform: [{ scaleX: -1 }],
  },
  rightLeafContainer: {
    position: "absolute",
    top: 14,
    right: -8,
    transformOrigin: "bottom left",
  },
  leafShapeRight: {},
  seedPod: {
    width: 38,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1B5E20",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -4,
    ...Platform.select({
      web: {
        boxShadow: "0 4px 10px rgba(27, 94, 32, 0.4)",
      },
    }),
  },

  growthToast: {
    position: "absolute",
    top: 14,
    backgroundColor: "#1B5E20",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    zIndex: 30,
    ...Platform.select({
      web: {
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
      },
    }),
  },
  growthToastText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  interactiveHint: {
    position: "absolute",
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  interactiveHintText: {
    fontSize: 11,
    color: "#5A6B63",
    fontWeight: "600",
  },

  /* Hero Text Section */
  heroTextSection: {
    marginVertical: 12,
  },
  heroBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1B5E20",
    letterSpacing: 0.5,
  },
  heroHeadline: {
    fontSize: 32,
    fontWeight: "900",
    color: "#1C2526",
    lineHeight: 40,
    letterSpacing: -0.6,
  },
  heroDescription: {
    fontSize: 15,
    color: "#5A6B63",
    lineHeight: 24,
    marginTop: 10,
  },

  /* Dual Pillars */
  pillarsRow: {
    flexDirection: "row",
    gap: 14,
    marginVertical: 12,
  },
  pillarCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCE6DC",
    justifyContent: "space-between",
    ...Platform.select({
      web: {
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        transition: "all 0.2s ease-in-out",
      },
    }),
  },
  pillarIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  pillarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1C2526",
    marginBottom: 4,
  },
  pillarDesc: {
    fontSize: 12.5,
    color: "#5A6B63",
    lineHeight: 18,
    marginBottom: 12,
  },
  pillarArrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pillarArrowText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B5E20",
  },

  /* Action Buttons */
  actionsContainer: {
    gap: 12,
    marginVertical: 16,
  },
  primaryCta: {
    backgroundColor: "#1B5E20",
    height: 54,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: "0 6px 18px rgba(27, 94, 32, 0.28)",
      },
    }),
  },
  primaryCtaText: {
    color: "#FFFFFF",
    fontSize: 16.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  secondaryCta: {
    backgroundColor: "#FFFFFF",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#CFDBCF",
  },
  secondaryCtaText: {
    color: "#1C2526",
    fontSize: 15.5,
    fontWeight: "700",
  },
  footerNote: {
    textAlign: "center",
    fontSize: 11.5,
    color: "#8A9A91",
    marginTop: 8,
    marginBottom: 20,
    fontWeight: "500",
  },
});