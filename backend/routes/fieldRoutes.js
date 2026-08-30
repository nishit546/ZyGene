const express = require("express");

const router = express.Router();

const {
  createField,
  getFields,
  getFieldById,
  updateField,
  deleteField,
} = require("../controllers/fieldController");

const authenticateUser = require("../middleware/authMiddleware");

router.post("/", authenticateUser, createField);

router.get("/", authenticateUser, getFields);

router.get("/:id", authenticateUser, getFieldById);

router.put("/:id", authenticateUser, updateField);

router.delete("/:id", authenticateUser, deleteField);

module.exports = router;