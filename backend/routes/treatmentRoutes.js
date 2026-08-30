const express = require("express");

const router = express.Router();

const {
  createTreatment,
} = require("../controllers/treatmentController");

const authenticateUser = require(
  "../middleware/authMiddleware"
);

router.post(
  "/",
  authenticateUser,
  createTreatment
);

module.exports = router;