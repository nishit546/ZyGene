const express = require("express");

const router = express.Router();

const {
  createTreatment,
  getTreatmentsByLifecycle,
} = require(
  "../controllers/treatmentController"
);

const authenticateUser = require(
  "../middleware/authMiddleware"
);


// ========================================
// CREATE TREATMENT
// ========================================

router.post(
  "/",
  authenticateUser,
  createTreatment
);


// ========================================
// GET TREATMENTS
// ========================================

router.get(
  "/:lifecycleRecordId",
  authenticateUser,
  getTreatmentsByLifecycle
);


module.exports = router;