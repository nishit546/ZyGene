const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

require("./config/db");

const authRoutes = require("./routes/authRoutes");
const fieldRoutes = require("./routes/fieldRoutes");
const cropRoutes = require("./routes/cropRoutes");
const lifecycleRoutes = require("./routes/lifecycleRoutes");
const measurementRoutes = require("./routes/measurementRoutes");
const photoRoutes = require("./routes/photoRoutes");
const irrigationRoutes = require("./routes/irrigationRoutes");
const treatmentRoutes = require("./routes/treatmentRoutes");
const diseasePestRoutes = require("./routes/diseasePestRoutes");
const harvestRoutes = require("./routes/harvestRoutes");
const taskRoutes = require("./routes/taskRoutes");

const breederRoutes = require("./routes/breederRoutes");
const breederProfileRoutes = require("./routes/breederProfileRoutes");
const breedingProgramRoutes = require("./routes/breedingProgramRoutes");
const breedingCrossRoutes = require("./routes/breedingCrossRoutes");
const breedingTrialRoutes = require("./routes/breedingTrialRoutes");
const trialObservationRoutes = require("./routes/trialObservationRoutes");
const app = express();

// Middleware

app.use(cors());

app.use(express.json({
    limit: "10mb"
}));

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

app.use("/api/disease-pests", diseasePestRoutes);
app.use("/api/disease-pest", diseasePestRoutes);

app.use("/api/harvest", harvestRoutes);

app.use("/api/tasks", taskRoutes);
app.use("/api/breeder/observations",trialObservationRoutes);

// Breeder routes

app.use("/api/breeder", breederRoutes);
app.use("/api/breeder/programs",breedingProgramRoutes);

app.use("/api/breeder/profile",breederProfileRoutes);
app.use("/api/breeder/crosses",breedingCrossRoutes);
app.use("/api/breeder/trials",breedingTrialRoutes);

// 404 Handler for undefined routes
app.use((req, res) => {
    res.status(404).json({
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled API Error:", err);
    res.status(500).json({
        message: "Internal server error",
        error: err.message,
    });
});

// Server

const PORT = process.env.PORT || 4000;

if (require.main === module) {
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on ${PORT}`);
    });
}

module.exports = app;