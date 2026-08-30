require("dotenv").config();

const express = require("express");
const cors = require("cors");

require("./config/db");

const authRoutes = require("./routes/authRoutes");
const fieldRoutes = require("./routes/fieldRoutes");
const cropRoutes = require("./routes/cropRoutes");
const lifecycleRoutes = require("./routes/lifecycleRoutes")
const measurementRoutes = require("./routes/measurementRoutes")
const photoRoutes = require("./routes/photoRoutes");
const irrigationRoutes = require("./routes/irrigationRoutes");
const treatmentRoutes = require("./routes/treatmentRoutes");
const diseasePestRoutes = require("./routes/diseasePestRoutes");
const harvestRoutes = require("./routes/harvestRoutes");
const breederRoutes = require("./routes/breederRoutes");
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        message: "ZyGene API is running",
    });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/fields", fieldRoutes);
app.use("/api/crops", cropRoutes);
app.use("/api/lifecycle", lifecycleRoutes);
app.use("/api/measurements", measurementRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/irrigation", irrigationRoutes);
app.use("/api/treatments", treatmentRoutes);
app.use("/api/disease-pests",diseasePestRoutes);
app.use("/api/harvest", harvestRoutes);
app.use("/api/breeder", breederRoutes);
// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on ${PORT}`);
});
