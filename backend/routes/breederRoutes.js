const express = require("express");

const router = express.Router();

const {
  getDashboardOverview,
  getVarietyComparison,getGrowthDuration,getDiseaseOccurrence,getLocationPerformance,getStagePerformance,getTopVarieties
} = require("../controllers/breederController");

const authenticateUser = require(
  "../middleware/authMiddleware"
);

router.get("/overview",authenticateUser,getDashboardOverview);
router.get("/varieties",authenticateUser,getVarietyComparison);
router.get("/growth-duration",authenticateUser,getGrowthDuration);
router.get("/disease-occurrence",authenticateUser,getDiseaseOccurrence);    
router.get("/location-performance",authenticateUser,getLocationPerformance);
router.get("/stage-performance",authenticateUser,getStagePerformance);
router.get("/top-varieties",authenticateUser,getTopVarieties);


module.exports = router;