const { pool } = require("../config/db");

const createMeasurement = async (req, res) => {
  try {
    const user_id = req.user.id;

    const {
      lifecycle_record_id,
      measurement_type,
      measurement_value,
      unit,
      notes,
    } = req.body;

    if (
      !lifecycle_record_id ||
      !measurement_type ||
      measurement_value === undefined
    ) {
      return res.status(400).json({
        message:
          "Lifecycle record ID, measurement type and value are required",
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
      INSERT INTO growth_measurements (
        lifecycle_record_id,
        measurement_type,
        measurement_value,
        unit,
        notes
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      lifecycle_record_id,
      measurement_type,
      measurement_value,
      unit || null,
      notes || null,
    ]);

    return res.status(201).json({
      message: "Measurement created successfully",
      measurement: result.rows[0],
    });
  } catch (error) {
    console.error("Create measurement error:", error.message);
    return res.status(500).json({
      message: "Failed to create measurement",
    });
  }
};

const getMeasurements = async (req, res) => {
  try {
    const user_id = req.user.id;
    const lifecycle_record_id = req.params.lifecycleRecordId;

    const query = `
      SELECT growth_measurements.*
      FROM growth_measurements
      INNER JOIN lifecycle_records
        ON growth_measurements.lifecycle_record_id = lifecycle_records.id
      INNER JOIN crops
        ON lifecycle_records.crop_id = crops.id
      INNER JOIN fields
        ON crops.field_id = fields.id
      WHERE growth_measurements.lifecycle_record_id = $1
        AND fields.user_id = $2
      ORDER BY growth_measurements.created_at ASC
    `;

    const result = await pool.query(query, [lifecycle_record_id, user_id]);

    return res.status(200).json({
      message: "Measurements fetched successfully",
      measurements: result.rows,
    });
  } catch (error) {
    console.error("Get measurements error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch measurements",
    });
  }
};

module.exports = {
  createMeasurement,
  getMeasurements,
};