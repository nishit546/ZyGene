const express = require("express");

const router = express.Router();

const {
  createObservation,
  getObservationsByLifecycle,
} = require(
  "../controllers/diseasePestController"
);

const authenticateUser = require(
  "../middleware/authMiddleware"
);


// Create observation

router.post(
  "/",
  authenticateUser,
  createObservation
);


// Get observations for lifecycle record

router.get(
  "/:lifecycleRecordId",
  authenticateUser,
  getObservationsByLifecycle
);


module.exports = router;