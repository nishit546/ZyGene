const express = require("express");

const router = express.Router();

const {
  createPhoto,
  getPhotos,
} = require("../controllers/photoController");

const authenticateUser = require(
  "../middleware/authMiddleware"
);

// Create photo
router.post(
  "/",
  authenticateUser,
  createPhoto
);

// Get photos for lifecycle record
router.get(
  "/:lifecycleRecordId",
  authenticateUser,
  getPhotos
);

module.exports = router;