const express = require("express");

const router = express.Router();

const {
  createIrrigation,
  getIrrigationByLifecycle,
} = require(
  "../controllers/irrigationController"
);

const authenticateUser = require(
  "../middleware/authMiddleware"
);


// Create irrigation record

router.post(
  "/",
  authenticateUser,
  createIrrigation
);


// Get irrigation records

router.get(
  "/:lifecycleRecordId",
  authenticateUser,
  getIrrigationByLifecycle
);


module.exports = router;