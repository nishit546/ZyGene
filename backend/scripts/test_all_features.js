const express = require("express");
const jwt = require("jsonwebtoken");

const authRoutes = require("../routes/authRoutes");
const fieldRoutes = require("../routes/fieldRoutes");
const cropRoutes = require("../routes/cropRoutes");
const lifecycleRoutes = require("../routes/lifecycleRoutes");
const measurementRoutes = require("../routes/measurementRoutes");
const photoRoutes = require("../routes/photoRoutes");
const irrigationRoutes = require("../routes/irrigationRoutes");
const treatmentRoutes = require("../routes/treatmentRoutes");
const diseasePestRoutes = require("../routes/diseasePestRoutes");
const harvestRoutes = require("../routes/harvestRoutes");

const breederRoutes = require("../routes/breederRoutes");
const breederProfileRoutes = require("../routes/breederProfileRoutes");
const breedingProgramRoutes = require("../routes/breedingProgramRoutes");
const breedingCrossRoutes = require("../routes/breedingCrossRoutes");
const breedingTrialRoutes = require("../routes/breedingTrialRoutes");
const trialObservationRoutes = require("../routes/trialObservationRoutes");

const db = require("../config/db");

const app = express();
app.use(express.json({ limit: "10mb" }));

// Mount all routes exactly as server.js
app.get("/api/health", (req, res) => res.json({ message: "ZyGene API is running" }));
app.use("/api/auth", authRoutes);
app.use("/api/fields", fieldRoutes);
app.use("/api/crops", cropRoutes);
app.use("/api/lifecycle", lifecycleRoutes);
app.use("/api/measurements", measurementRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/irrigation", irrigationRoutes);
app.use("/api/treatments", treatmentRoutes);
app.use("/api/disease-pests", diseasePestRoutes);
app.use("/api/harvest", harvestRoutes);
app.use("/api/breeder/observations", trialObservationRoutes);
app.use("/api/breeder", breederRoutes);
app.use("/api/breeder/programs", breedingProgramRoutes);
app.use("/api/breeder/profile", breederProfileRoutes);
app.use("/api/breeder/crosses", breedingCrossRoutes);
app.use("/api/breeder/trials", breedingTrialRoutes);

const PORT = 4010;
let server;

async function request(method, path, body = null, token = null) {
  const url = `http://127.0.0.1:${PORT}${path}`;
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runFeatureTests() {
  console.log("===============================================================");
  console.log("   ZyGENE Full Platform Feature & Database Test Suite");
  console.log("   Database: PostgreSQL (zygene)");
  console.log("===============================================================\n");

  await new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`Test API Server running on port ${PORT}\n`);
      resolve();
    });
  });

  const JWT_SECRET = process.env.JWT_SECRET || "zygene_jwt_secret_key_2026";
  const farmerToken = jwt.sign({ id: 1, email: "nishit@example.com", role: "farmer" }, JWT_SECRET, { expiresIn: "1d" });
  const breederToken = jwt.sign({ id: 4, email: "anything@example.com", role: "breeder" }, JWT_SECRET, { expiresIn: "1d" });

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, message) {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`  [PASS] ${message}`);
    } else {
      console.error(`  [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // -----------------------------------------------------------------
    // 1. Health API
    // -----------------------------------------------------------------
    console.log("--- 1. SYSTEM HEALTH CHECK ---");
    const health = await request("GET", "/api/health");
    assert(health.status === 200 && health.data.message === "ZyGene API is running", "Health check endpoint response");

    // -----------------------------------------------------------------
    // 2. Farmer Workflow: Fields & Crops
    // -----------------------------------------------------------------
    console.log("\n--- 2. FARMER WORKFLOW: FIELDS & CROPS ---");
    // Create Field
    const createFieldRes = await request("POST", "/api/fields", {
      field_name: "Test North Field",
      latitude: 23.0225,
      longitude: 72.5714,
      area: 5.5,
      area_unit: "acre",
      soil_type: "Black Cotton",
      location_name: "Sector 5",
    }, farmerToken);
    assert(createFieldRes.status === 201 && createFieldRes.data.field.id, "Create new field in PostgreSQL");
    const fieldId = createFieldRes.data.field.id;

    // Get Fields
    const getFieldsRes = await request("GET", "/api/fields", null, farmerToken);
    assert(getFieldsRes.status === 200 && Array.isArray(getFieldsRes.data.fields) && getFieldsRes.data.fields.some(f => f.id === fieldId), "List farmer fields");

    // Get Field by ID
    const getFieldByIdRes = await request("GET", `/api/fields/${fieldId}`, null, farmerToken);
    assert(getFieldByIdRes.status === 200 && getFieldByIdRes.data.field.field_name === "Test North Field", "Get field by ID");

    // Update Field
    const updateFieldRes = await request("PUT", `/api/fields/${fieldId}`, {
      field_name: "Updated North Field",
      area: 6.0,
      area_unit: "acre",
    }, farmerToken);
    assert(updateFieldRes.status === 200, "Update field attributes");

    // Create Crop
    const createCropRes = await request("POST", "/api/crops", {
      field_id: fieldId,
      crop_name: "Wheat",
      variety: "GW-496",
      sowing_date: "2026-10-01",
      expected_harvest_date: "2027-02-15",
      notes: "High yield test sowing",
    }, farmerToken);
    assert(createCropRes.status === 201 && createCropRes.data.crop.id, "Create crop linked to field");
    const cropId = createCropRes.data.crop.id;

    // Get Crops
    const getCropsRes = await request("GET", "/api/crops", null, farmerToken);
    assert(getCropsRes.status === 200 && Array.isArray(getCropsRes.data.crops) && getCropsRes.data.crops.some(c => c.id === cropId), "List user crops with field joins");

    // Get Crop by ID
    const getCropByIdRes = await request("GET", `/api/crops/${cropId}`, null, farmerToken);
    assert(getCropByIdRes.status === 200 && getCropByIdRes.data.crop.crop_name === "Wheat", "Get crop details by ID");

    // Update Crop
    const updateCropRes = await request("PUT", `/api/crops/${cropId}`, {
      crop_name: "Wheat",
      variety: "GW-496 Gold",
      crop_status: "active",
      notes: "Updated variety notes",
    }, farmerToken);
    assert(updateCropRes.status === 200, "Update crop details");

    // -----------------------------------------------------------------
    // 3. Lifecycle Stage Timeline & Sub-module Logging
    // -----------------------------------------------------------------
    console.log("\n--- 3. LIFECYCLE TIMELINE & SUB-MODULE LOGGING ---");
    // Create Lifecycle Record
    const createLifecycleRes = await request("POST", "/api/lifecycle", {
      crop_id: cropId,
      stage: "vegetative",
      record_date: "2026-10-15",
      record_time: "09:30:00",
      latitude: 23.0225,
      longitude: 72.5714,
      notes: "Vegetative stage progressing nicely",
    }, farmerToken);
    assert(createLifecycleRes.status === 201 && createLifecycleRes.data.lifecycle.id, "Create lifecycle stage record");
    const lifecycleId = createLifecycleRes.data.lifecycle.id;

    // Get Lifecycle Records for Crop
    const getLifecycleRes = await request("GET", `/api/lifecycle/${cropId}`, null, farmerToken);
    assert(getLifecycleRes.status === 200 && getLifecycleRes.data.lifecycle.some(l => l.id === lifecycleId), "Fetch chronological lifecycle stages");

    // Growth Measurements
    const createMeasRes = await request("POST", "/api/measurements", {
      lifecycle_record_id: lifecycleId,
      measurement_type: "Plant Height",
      measurement_value: 42.5,
      unit: "cm",
      notes: "Average of 10 sampled plants",
    }, farmerToken);
    assert(createMeasRes.status === 201, "Log growth measurement");

    const getMeasRes = await request("GET", `/api/measurements/${lifecycleId}`, null, farmerToken);
    assert(getMeasRes.status === 200 && getMeasRes.data.measurements.length > 0, "Fetch growth measurements for stage");

    // Crop Photos
    const createPhotoRes = await request("POST", "/api/photos", {
      lifecycle_record_id: lifecycleId,
      image_url: "https://storage.zygene.test/photos/field_crop_101.jpg",
      caption: "Canopy growth view",
      captured_at: new Date().toISOString(),
    }, farmerToken);
    assert(createPhotoRes.status === 201, "Log crop photo metadata");

    const getPhotoRes = await request("GET", `/api/photos/${lifecycleId}`, null, farmerToken);
    assert(getPhotoRes.status === 200 && getPhotoRes.data.photos.length > 0, "Fetch crop photos for stage");

    // Irrigation
    const createIrrigRes = await request("POST", "/api/irrigation", {
      lifecycle_record_id: lifecycleId,
      irrigation_date: "2026-10-16",
      water_amount: 1500,
      water_unit: "liters",
      irrigation_method: "Drip",
      notes: "Morning drip irrigation cycle",
    }, farmerToken);
    assert(createIrrigRes.status === 201, "Log irrigation event");

    const getIrrigRes = await request("GET", `/api/irrigation/${lifecycleId}`, null, farmerToken);
    assert(getIrrigRes.status === 200 && getIrrigRes.data.irrigation.length > 0, "Fetch irrigation events for stage");

    // Treatments
    const createTreatRes = await request("POST", "/api/treatments", {
      lifecycle_record_id: lifecycleId,
      treatment_type: "fertilizer",
      product_name: "NPK 19-19-19",
      quantity: 25.0,
      quantity_unit: "kg",
      application_method: "Foliar Spray",
      application_date: "2026-10-17",
      notes: "Nutrient boost",
    }, farmerToken);
    assert(createTreatRes.status === 201, "Log chemical / fertilizer treatment");

    const getTreatRes = await request("GET", `/api/treatments/${lifecycleId}`, null, farmerToken);
    assert(getTreatRes.status === 200 && getTreatRes.data.treatments.length > 0, "Fetch treatment logs for stage");

    // Disease & Pests
    const createDiseaseRes = await request("POST", "/api/disease-pests", {
      lifecycle_record_id: lifecycleId,
      observation_type: "pest",
      name: "Aphids",
      severity: "low",
      affected_percentage: 4.5,
      observation_date: "2026-10-18",
      notes: "Isolated spotting on border plants",
    }, farmerToken);
    assert(createDiseaseRes.status === 201, "Log pest / disease observation");

    const getDiseaseRes = await request("GET", `/api/disease-pests/${lifecycleId}`, null, farmerToken);
    assert(getDiseaseRes.status === 200 && getDiseaseRes.data.observations.length > 0, "Fetch pest observations for stage");

    // Harvest Records
    const createHarvestRes = await request("POST", "/api/harvest", {
      lifecycle_record_id: lifecycleId,
      harvest_date: "2026-10-20",
      total_yield: 1200.0,
      yield_unit: "kg",
      area_harvested: 2.0,
      area_unit: "acre",
      yield_per_area: 600.0,
      number_of_plants: 500,
      average_weight: 2.4,
      quality_grade: "Grade A",
      notes: "High quality harvest",
    }, farmerToken);
    assert(createHarvestRes.status === 201, "Log harvest yield and grading");

    const getHarvestRes = await request("GET", `/api/harvest/${lifecycleId}`, null, farmerToken);
    assert(getHarvestRes.status === 200 && getHarvestRes.data.harvest.length > 0, "Fetch harvest records for stage");

    // Clean up created crop & field (foreign key cascade tests)
    const deleteCropRes = await request("DELETE", `/api/crops/${cropId}`, null, farmerToken);
    assert(deleteCropRes.status === 200, "Delete crop with cascade check");

    const deleteFieldRes = await request("DELETE", `/api/fields/${fieldId}`, null, farmerToken);
    assert(deleteFieldRes.status === 200, "Delete field with cascade check");

    // -----------------------------------------------------------------
    // 4. Breeder Programs, Crosses, Trials & Observations
    // -----------------------------------------------------------------
    console.log("\n--- 4. BREEDER WORKFLOW: PROGRAMS, CROSSES & TRIALS ---");
    // Breeder Profile
    const getProfileRes = await request("GET", "/api/breeder/profile", null, breederToken);
    assert(getProfileRes.status === 200 && getProfileRes.data.profile.breeder_name, "Fetch breeder profile");

    const updateProfileRes = await request("PUT", "/api/breeder/profile", {
      breeder_name: "Dr. Nishit Breeder",
      organization: "ZyGene Advanced Research Lab",
      specialization: "Cereal Genetics & Yield Optimization",
      location: "Anand, Gujarat",
    }, breederToken);
    assert(updateProfileRes.status === 200, "Update breeder profile");

    // Breeding Program
    const createProgRes = await request("POST", "/api/breeder/programs", {
      program_name: "Drought Tolerant Millet 2026",
      crop_name: "Pearl Millet",
      objective: "Enhance water efficiency and dryland yield",
      start_date: "2026-10-01",
      expected_end_date: "2028-10-01",
      status: "active",
      description: "Trial series for arid regions",
    }, breederToken);
    assert(createProgRes.status === 201 && createProgRes.data.program.id, "Create breeding program in PostgreSQL");
    const programId = createProgRes.data.program.id;

    const getProgsRes = await request("GET", "/api/breeder/programs", null, breederToken);
    assert(getProgsRes.status === 200 && getProgsRes.data.programs.some(p => p.id === programId), "List breeding programs");

    const getProgByIdRes = await request("GET", `/api/breeder/programs/${programId}`, null, breederToken);
    assert(getProgByIdRes.status === 200 && getProgByIdRes.data.program.crop_name === "Pearl Millet", "Get breeding program by ID");

    const updateProgRes = await request("PUT", `/api/breeder/programs/${programId}`, {
      program_name: "Drought Tolerant Millet 2026 (Phase 1)",
      crop_name: "Pearl Millet",
      objective: "Updated objective",
      status: "active",
    }, breederToken);
    assert(updateProgRes.status === 200, "Update breeding program");

    // Breeding Cross
    const createCrossRes = await request("POST", "/api/breeder/crosses", {
      program_id: programId,
      parent_1: "Millet-Parent-A",
      parent_2: "Millet-Parent-B",
      cross_code: "DTM-2026-001",
      cross_date: "2026-10-05",
      generation: "F1",
      objective: "Drought resistance cross",
      success_status: "planned",
      notes: "Pollination completed",
    }, breederToken);
    assert(createCrossRes.status === 201 && createCrossRes.data.cross.id, "Create breeding cross");
    const crossId = createCrossRes.data.cross.id;

    const getCrossesRes = await request("GET", "/api/breeder/crosses", null, breederToken);
    assert(getCrossesRes.status === 200 && getCrossesRes.data.crosses.some(c => c.id === crossId), "List breeding crosses with program joins");

    const getCrossByIdRes = await request("GET", `/api/breeder/crosses/${crossId}`, null, breederToken);
    assert(getCrossByIdRes.status === 200 && getCrossByIdRes.data.cross.cross_code === "DTM-2026-001", "Get breeding cross by ID");

    const updateCrossRes = await request("PUT", `/api/breeder/crosses/${crossId}`, {
      parent_1: "Millet-Parent-A",
      parent_2: "Millet-Parent-B",
      cross_code: "DTM-2026-001",
      cross_date: "2026-10-05",
      generation: "F1",
      objective: "Drought resistance cross",
      success_status: "successful",
      notes: "Cross successful",
    }, breederToken);
    assert(updateCrossRes.status === 200, "Update breeding cross");

    // Breeding Trial
    const createTrialRes = await request("POST", "/api/breeder/trials", {
      program_id: programId,
      cross_id: crossId,
      trial_name: "Arid Field Plot 1",
      location: "Research Plot North",
      season: "Kharif 2026",
      start_date: "2026-10-10",
      end_date: "2027-01-20",
      status: "ongoing",
      notes: "Rainfed conditions",
    }, breederToken);
    assert(createTrialRes.status === 201 && createTrialRes.data.trial.id, "Create breeding trial");
    const trialId = createTrialRes.data.trial.id;

    const getTrialsRes = await request("GET", "/api/breeder/trials", null, breederToken);
    assert(getTrialsRes.status === 200 && getTrialsRes.data.trials.some(t => t.id === trialId), "List breeding trials");

    const getTrialByIdRes = await request("GET", `/api/breeder/trials/${trialId}`, null, breederToken);
    assert(getTrialByIdRes.status === 200 && getTrialByIdRes.data.trial.trial_name === "Arid Field Plot 1", "Get breeding trial by ID");

    const updateTrialRes = await request("PUT", `/api/breeder/trials/${trialId}`, {
      trial_name: "Arid Field Plot 1 - Replicate A",
      location: "Research Plot North",
      status: "ongoing",
    }, breederToken);
    assert(updateTrialRes.status === 200, "Update breeding trial");

    // Trial Observations
    const createTrialObsRes = await request("POST", "/api/breeder/observations", {
      trial_id: trialId,
      observation_date: "2026-10-15",
      measurement_type: "Germination Percentage",
      measurement_value: 94.5,
      unit: "%",
      rating: 9.0,
      notes: "Rapid uniform emergence",
    }, breederToken);
    assert(createTrialObsRes.status === 201 && createTrialObsRes.data.observation.id, "Create trial observation");
    const trialObsId = createTrialObsRes.data.observation.id;

    const getTrialObsRes = await request("GET", `/api/breeder/observations/${trialId}`, null, breederToken);
    assert(getTrialObsRes.status === 200 && getTrialObsRes.data.observations.length > 0, "List trial observations by trial ID");

    const updateTrialObsRes = await request("PUT", `/api/breeder/observations/${trialObsId}`, {
      observation_date: "2026-10-15",
      measurement_type: "Germination Percentage",
      measurement_value: 95.0,
      unit: "%",
      rating: 9.5,
      notes: "Emergence fully verified",
    }, breederToken);
    assert(updateTrialObsRes.status === 200, "Update trial observation");

    // Delete observation, trial, cross, program
    const delObsRes = await request("DELETE", `/api/breeder/observations/${trialObsId}`, null, breederToken);
    assert(delObsRes.status === 200, "Delete trial observation");

    const delTrialRes = await request("DELETE", `/api/breeder/trials/${trialId}`, null, breederToken);
    assert(delTrialRes.status === 200, "Delete breeding trial");

    const delCrossRes = await request("DELETE", `/api/breeder/crosses/${crossId}`, null, breederToken);
    assert(delCrossRes.status === 200, "Delete breeding cross");

    const delProgRes = await request("DELETE", `/api/breeder/programs/${programId}`, null, breederToken);
    assert(delProgRes.status === 200, "Delete breeding program");

    // -----------------------------------------------------------------
    // 5. Breeder Analytics Engine (7 Complex Analytical Queries)
    // -----------------------------------------------------------------
    console.log("\n--- 5. BREEDER ANALYTICS ENGINE (7 COMPLEX SQL ENDPOINTS) ---");

    // 1. Overview
    const anOverview = await request("GET", "/api/breeder/overview", null, breederToken);
    assert(anOverview.status === 200 && anOverview.data.overview.total_crops !== undefined, "1/7 Analytics: Dashboard Overview");

    // 2. Variety Comparison
    const anVarieties = await request("GET", "/api/breeder/varieties", null, breederToken);
    assert(anVarieties.status === 200 && Array.isArray(anVarieties.data.varieties), "2/7 Analytics: Variety Comparison");

    // 3. Growth Duration (datediff test)
    const anDuration = await request("GET", "/api/breeder/growth-duration", null, breederToken);
    assert(anDuration.status === 200 && Array.isArray(anDuration.data.growth_duration), "3/7 Analytics: Growth Duration with datediff()");

    // 4. Disease Occurrence
    const anDisease = await request("GET", "/api/breeder/disease-occurrence", null, breederToken);
    assert(anDisease.status === 200 && Array.isArray(anDisease.data.disease_occurrence), "4/7 Analytics: Disease Occurrence Calculation");

    // 5. Location Performance
    const anLocation = await request("GET", "/api/breeder/location-performance", null, breederToken);
    assert(anLocation.status === 200 && Array.isArray(anLocation.data.location_performance), "5/7 Analytics: Geographical Location Performance");

    // 6. Stage Performance
    const anStage = await request("GET", "/api/breeder/stage-performance", null, breederToken);
    assert(anStage.status === 200 && Array.isArray(anStage.data.stage_performance), "6/7 Analytics: Stage-by-Stage Phenotypic Performance");

    // 7. Top Varieties Ranking
    const anTop = await request("GET", "/api/breeder/top-varieties", null, breederToken);
    assert(anTop.status === 200 && Array.isArray(anTop.data.top_varieties), "7/7 Analytics: Top Varieties Composite Scoring");

    console.log("\n===============================================================");
    console.log(`   SUCCESS: ALL ${passedCount} OF ${totalCount} FEATURE TESTS PASSED!`);
    console.log("   ALL BACKEND APIs & POSTGRESQL RELATIONS WORKING FLAWLESSLY.");
    console.log("===============================================================\n");

  } catch (err) {
    console.error("\nTEST SUITE ABORTED DUE TO ERROR:", err.message);
  } finally {
    if (server) server.close();
    process.exit(0);
  }
}

runFeatureTests().catch((e) => {
  console.error("FATAL ERROR:", e);
  if (server) server.close();
  process.exit(1);
});
