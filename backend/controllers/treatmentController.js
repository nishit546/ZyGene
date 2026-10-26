const { pool } = require("../config/db");

// ========================================
// CREATE TREATMENT RECORD
// ========================================
const createTreatment = async (req, res) => {
  try {
    const user_id = req.user.id;

    const {
      lifecycle_record_id,
      treatment_type,
      product_name,
      quantity,
      quantity_unit,
      application_method,
      application_date,
      notes,
    } = req.body;

    if (
      !lifecycle_record_id ||
      !treatment_type ||
      !application_date
    ) {
      return res.status(400).json({
        message:
          "Lifecycle record ID, treatment type and application date are required",
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
      INSERT INTO treatment_records (
        lifecycle_record_id,
        treatment_type,
        product_name,
        quantity,
        quantity_unit,
        application_method,
        application_date,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      lifecycle_record_id,
      treatment_type,
      product_name || null,
      quantity || null,
      quantity_unit || null,
      application_method || null,
      application_date,
      notes || null,
    ]);

    return res.status(201).json({
      message: "Treatment record created successfully",
      treatment: result.rows[0],
    });
  } catch (error) {
    console.error("Create treatment error:", error.message);
    return res.status(500).json({
      message: "Failed to create treatment record",
    });
  }
};

// ========================================
// GET TREATMENT RECORDS
// ========================================
const getTreatmentsByLifecycle = async (req, res) => {
  try {
    const user_id = req.user.id;
    const lifecycle_record_id = req.params.lifecycleRecordId;

    const query = `
      SELECT treatment_records.*
      FROM treatment_records
      INNER JOIN lifecycle_records
        ON treatment_records.lifecycle_record_id = lifecycle_records.id
      INNER JOIN crops
        ON lifecycle_records.crop_id = crops.id
      INNER JOIN fields
        ON crops.field_id = fields.id
      WHERE treatment_records.lifecycle_record_id = $1
        AND fields.user_id = $2
      ORDER BY treatment_records.application_date ASC,
               treatment_records.created_at ASC
    `;

    const result = await pool.query(query, [lifecycle_record_id, user_id]);

    return res.status(200).json({
      message: "Treatment records fetched successfully",
      treatments: result.rows,
    });
  } catch (error) {
    console.error("Get treatments error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch treatment records",
    });
  }
};

module.exports = {
  createTreatment,
  getTreatmentsByLifecycle,
};