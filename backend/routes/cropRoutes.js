const express = require("express");

const router = express.Router();

const { createCrop,getCrops, getCropById, updateCrop, deleteCrop } = require("../controllers/cropController");

const authenticateUser = require("../middleware/authMiddleware");

router.post("/", authenticateUser, createCrop);
router.get("/", authenticateUser, getCrops);
router.get("/:id", authenticateUser, getCropById);
router.put("/:id", authenticateUser, updateCrop);
router.delete("/:id", authenticateUser, deleteCrop);

module.exports = router;