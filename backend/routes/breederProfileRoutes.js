const express = require("express");

const router = express.Router();

const {
  getBreederProfile,
  createBreederProfile,
  updateBreederProfile,
} = require("../controllers/breederProfileController");

const authenticateUser = require(
  "../middleware/authMiddleware"
);


// Get breeder profile
router.get(
  "/",
  authenticateUser,
  getBreederProfile
);


// Create breeder profile
router.post(
  "/",
  authenticateUser,
  createBreederProfile
);


// Update breeder profile
router.put(
  "/",
  authenticateUser,
  updateBreederProfile
);


module.exports = router;

