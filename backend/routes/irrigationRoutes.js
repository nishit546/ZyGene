const express = require("express");

const router = express.Router();

const {
  createIrrigation,
} = require("../controllers/irrigationController");

const authenticateUser = require(
  "../middleware/authMiddleware"
);

router.post(
  "/",
  authenticateUser,
  createIrrigation
);

module.exports = router;