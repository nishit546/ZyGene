const express = require("express");

const router = express.Router();

const {
  createMeasurement,
  getMeasurements,
} = require("../controllers/measurementController");

const authenticateUser = require(
  "../middleware/authMiddleware"
);

// Create measurement
router.post(
  "/",
  authenticateUser,
  createMeasurement
);

// Get measurements for a lifecycle record
router.get(
  "/:lifecycleRecordId",
  authenticateUser,
  getMeasurements
);

module.exports = router;