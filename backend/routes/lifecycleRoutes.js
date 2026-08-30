const express = require("express");

const router = express.Router();

const {
  createLifecycleRecord,
  getLifecycleByCrop,
} = require("../controllers/lifecycleController");

const authenticateUser = require(
  "../middleware/authMiddleware"
);

// Create lifecycle record
router.post(
  "/",
  authenticateUser,
  createLifecycleRecord
);

// Get lifecycle records for a specific crop
router.get(
  "/:cropId",
  authenticateUser,
  getLifecycleByCrop
);

module.exports = router;
