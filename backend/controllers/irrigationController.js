const { pool } = require("../config/db");

// ========================================
// CREATE IRRIGATION RECORD
// ========================================
const createIrrigation = async (req, res) => {
  try {
    const user_id = req.user.id;

    const {
      lifecycle_record_id,
      irrigation_date,
      water_amount,
      water_unit,
      irrigation_method,
      notes,
    } = req.body;

    if (!lifecycle_record_id || !irrigation_date) {
      return res.status(400).json({
        message: "Lifecycle record ID and irrigation date are required",
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
      INSERT INTO irrigation_records (
        lifecycle_record_id,
        irrigation_date,
        water_amount,
        water_unit,
        irrigation_method,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      lifecycle_record_id,
      irrigation_date,
      water_amount || null,
      water_unit || null,
      irrigation_method || null,
      notes || null,
    ]);

    return res.status(201).json({
      message: "Irrigation record created successfully",
      irrigation: result.rows[0],
    });
  } catch (error) {
    console.error("Create irrigation error:", error.message);
    return res.status(500).json({
      message: "Failed to create irrigation record",
    });
  }
};

// ========================================
// GET IRRIGATION RECORDS
// ========================================
const getIrrigationByLifecycle = async (req, res) => {
  try {
    const user_id = req.user.id;
    const lifecycle_record_id = req.params.lifecycleRecordId;

    const query = `
      SELECT irrigation_records.*
      FROM irrigation_records
      INNER JOIN lifecycle_records
        ON irrigation_records.lifecycle_record_id = lifecycle_records.id
      INNER JOIN crops
        ON lifecycle_records.crop_id = crops.id
      INNER JOIN fields
        ON crops.field_id = fields.id
      WHERE irrigation_records.lifecycle_record_id = $1
        AND fields.user_id = $2
      ORDER BY irrigation_records.irrigation_date ASC,
               irrigation_records.created_at ASC
    `;

    const result = await pool.query(query, [lifecycle_record_id, user_id]);

    return res.status(200).json({
      message: "Irrigation records fetched successfully",
      irrigation: result.rows,
    });
  } catch (error) {
    console.error("Get irrigation error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch irrigation records",
    });
  }
};

module.exports = {
  createIrrigation,
  getIrrigationByLifecycle,
};