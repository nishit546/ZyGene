const { pool } = require("../config/db");

const createLifecycleRecord = async (req, res) => {
  try {
    const user_id = req.user.id;

    const {
      crop_id,
      stage,
      record_date,
      record_time,
      latitude,
      longitude,
      notes,
    } = req.body;

    if (!crop_id || !stage || !record_date) {
      return res.status(400).json({
        message: "Crop ID, stage and record date are required",
      });
    }

    // Check that the crop belongs to the logged-in user
    const checkCropQuery = `
      SELECT crops.id
      FROM crops
      INNER JOIN fields
        ON crops.field_id = fields.id
      WHERE crops.id = $1
        AND fields.user_id = $2
    `;

    const cropCheck = await pool.query(checkCropQuery, [crop_id, user_id]);

    if (cropCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Crop not found or unauthorized",
      });
    }

    const insertQuery = `
      INSERT INTO lifecycle_records (
        crop_id,
        stage,
        record_date,
        record_time,
        latitude,
        longitude,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      crop_id,
      stage,
      record_date,
      record_time || null,
      latitude || null,
      longitude || null,
      notes || null,
    ]);

    return res.status(201).json({
      message: "Lifecycle record created successfully",
      lifecycle: result.rows[0],
    });
  } catch (error) {
    console.error("Create lifecycle error:", error.message);
    return res.status(500).json({
      message: "Failed to create lifecycle record",
    });
  }
};

const getLifecycleByCrop = async (req, res) => {
  try {
    const user_id = req.user.id;
    const crop_id = req.params.cropId;

    const query = `
      SELECT 
        lifecycle_records.*
      FROM lifecycle_records
      INNER JOIN crops
        ON lifecycle_records.crop_id = crops.id
      INNER JOIN fields
        ON crops.field_id = fields.id
      WHERE lifecycle_records.crop_id = $1
        AND fields.user_id = $2
      ORDER BY lifecycle_records.record_date ASC,
               lifecycle_records.record_time ASC
    `;

    const result = await pool.query(query, [crop_id, user_id]);

    return res.status(200).json({
      message: "Lifecycle records fetched successfully",
      lifecycle: result.rows,
    });
  } catch (error) {
    console.error("Get lifecycle error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch lifecycle records",
    });
  }
};

module.exports = {
  createLifecycleRecord,
  getLifecycleByCrop,
};