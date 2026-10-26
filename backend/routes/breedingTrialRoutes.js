const express = require("express");

const router = express.Router();

const {
  createTrial,
  getTrials,
  getTrialById,
  updateTrial,
  deleteTrial,
} = require("../controllers/breedingTrialController");

const authenticateUser = require(
  "../middleware/authMiddleware"
);

router.post(
  "/",
  authenticateUser,
  createTrial
);

router.get(
  "/",
  authenticateUser,
  getTrials
);

router.get(
  "/:id",
  authenticateUser,
  getTrialById
);

router.put(
  "/:id",
  authenticateUser,
  updateTrial
);

router.delete(
  "/:id",
  authenticateUser,
  deleteTrial
);

module.exports = router;
