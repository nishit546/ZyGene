const express = require("express");

const router = express.Router();

const {
  createPhoto,
} = require("../controllers/photoController");

const authenticateUser = require(
  "../middleware/authMiddleware"
);

router.post(
  "/",
  authenticateUser,
  createPhoto
);

module.exports = router;