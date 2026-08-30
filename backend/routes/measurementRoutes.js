const express = require("express");

const router = express.Router();

const {
  createMeasurement,getMeasurements
} = require("../controllers/measurementController");

const authenticateUser = require("../middleware/authMiddleware");

router.post("/",authenticateUser,createMeasurement);
router.get("/:lifecycleRecordId",authenticateUser,getMeasurements);

module.exports = router;