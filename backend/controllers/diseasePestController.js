const { pool } = require("../config/db");

// ========================================
// CREATE DISEASE / PEST OBSERVATION
// ========================================
const createObservation = async (req, res) => {
  try {
    const user_id = req.user.id;

    const {
      lifecycle_record_id,
      observation_type,
      name,
      severity,
      affected_percentage,
      observation_date,
      notes,
    } = req.body;

    if (
      !lifecycle_record_id ||
      !observation_type ||
      !name ||
      !observation_date
    ) {
      return res.status(400).json({
        message:
          "Lifecycle record ID, observation type, name and observation date are required",
      });
    }

    const checkQuery = `
      SELECT lifecycle_records.id
      FROM lifecycle_records
      INNER JOIN crops
        ON lifecycle_records.crop_id = crops.id
      INNER JOIN fields
        ON crops.field_id = fields.id
      WHERE lifecycle_records.id = $1
        AND fields.user_id = $2
    `;

    const checkResult = await pool.query(checkQuery, [lifecycle_record_id, user_id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        message: "Lifecycle record not found or unauthorized",
      });
    }

    const insertQuery = `
      INSERT INTO disease_pest_observations (
        lifecycle_record_id,
        observation_type,
        name,
        severity,
        affected_percentage,
        observation_date,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      lifecycle_record_id,
      observation_type,
      name,
      severity || null,
      affected_percentage || null,
      observation_date,
      notes || null,
    ]);

    return res.status(201).json({
      message: "Disease/pest observation created successfully",
      observation: result.rows[0],
    });
  } catch (error) {
    console.error("Create observation error:", error.message);
    return res.status(500).json({
      message: "Failed to create disease/pest observation",
    });
  }
};

// ========================================
// GET DISEASE / PEST OBSERVATIONS
// ========================================
const getObservationsByLifecycle = async (req, res) => {
  try {
    const user_id = req.user.id;
    const lifecycle_record_id = req.params.lifecycleRecordId;

    const query = `
      SELECT disease_pest_observations.*
      FROM disease_pest_observations
      INNER JOIN lifecycle_records
        ON disease_pest_observations.lifecycle_record_id = lifecycle_records.id
      INNER JOIN crops
        ON lifecycle_records.crop_id = crops.id
      INNER JOIN fields
        ON crops.field_id = fields.id
      WHERE disease_pest_observations.lifecycle_record_id = $1
        AND fields.user_id = $2
      ORDER BY
        disease_pest_observations.observation_date ASC,
        disease_pest_observations.created_at ASC
    `;

    const result = await pool.query(query, [lifecycle_record_id, user_id]);

    return res.status(200).json({
      message: "Disease/pest observations fetched successfully",
      observations: result.rows,
    });
  } catch (error) {
    console.error("Get observations error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch disease/pest observations",
    });
  }
};

module.exports = {
  createObservation,
  getObservationsByLifecycle,
};