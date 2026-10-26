const express = require("express");

const router = express.Router();

const {
  createCross,
  getCrosses,
  getCrossById,
  updateCross,
  deleteCross,
} = require("../controllers/breedingCrossController");

const authenticateUser = require(
  "../middleware/authMiddleware"
);

router.post(
  "/",
  authenticateUser,
  createCross
);

router.get(
  "/",
  authenticateUser,
  getCrosses
);

router.get(
  "/:id",
  authenticateUser,
  getCrossById
);

router.put(
  "/:id",
  authenticateUser,
  updateCross
);

router.delete(
  "/:id",
  authenticateUser,
  deleteCross
);

module.exports = router;