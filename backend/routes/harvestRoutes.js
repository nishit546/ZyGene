const express = require("express");

const router = express.Router();

const {
  createHarvest,
  getHarvestByLifecycle,
} = require("../controllers/harvestController");

const authenticateUser = require(
  "../middleware/authMiddleware"
);


// Create harvest
router.post(
  "/",
  authenticateUser,
  createHarvest
);


// Get harvest records
router.get(
  "/:lifecycleRecordId",
  authenticateUser,
  getHarvestByLifecycle
);


module.exports = router;