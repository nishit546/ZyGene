const express = require("express");

const router = express.Router();

const {
  createObservation,
  getObservationsByTrial,
  updateObservation,
  deleteObservation,
} = require("../controllers/trialObservationController");

const authenticateUser = require(
  "../middleware/authMiddleware"
);

router.post(
  "/",
  authenticateUser,
  createObservation
);

router.get(
  "/:trialId",
  authenticateUser,
  getObservationsByTrial
);

router.put(
  "/:id",
  authenticateUser,
  updateObservation
);

router.delete(
  "/:id",
  authenticateUser,
  deleteObservation
);

module.exports = router;

