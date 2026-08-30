const express = require("express");

const router = express.Router();

const {
  createHarvest,
} = require("../controllers/harvestController");

const authenticateUser = require(
  "../middleware/authMiddleware"
);

router.post(
  "/",
  authenticateUser,
  createHarvest
);

module.exports = router;