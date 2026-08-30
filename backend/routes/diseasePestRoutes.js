const express = require("express");

const router = express.Router();

const {
  createDiseasePestObservation,
} = require("../controllers/diseasePestController");

const authenticateUser = require(
  "../middleware/authMiddleware"
);

router.post(
  "/",
  authenticateUser,
  createDiseasePestObservation
);

module.exports = router;