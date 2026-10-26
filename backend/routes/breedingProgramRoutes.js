const express = require("express");

const router = express.Router();

const {
  createProgram,
  getPrograms,
  getProgramById,
  updateProgram,
  deleteProgram,
} = require("../controllers/breedingProgramController");

const authenticateUser = require(
  "../middleware/authMiddleware"
);


// Create program
router.post(
  "/",
  authenticateUser,
  createProgram
);


// Get all programs
router.get(
  "/",
  authenticateUser,
  getPrograms
);


// Get one program
router.get(
  "/:id",
  authenticateUser,
  getProgramById
);


// Update program
router.put(
  "/:id",
  authenticateUser,
  updateProgram
);


// Delete program
router.delete(
  "/:id",
  authenticateUser,
  deleteProgram
);


module.exports = router;