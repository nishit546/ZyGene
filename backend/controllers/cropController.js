const { pool } = require("../config/db");

const createCrop = async (req, res) => {
  try {
    const user_id = req.user.id;

    const {
      field_id,
      crop_name,
      variety,
      sowing_date,
      expected_harvest_date,
      notes,
    } = req.body;

    if (!field_id || !crop_name) {
      return res.status(400).json({
        message: "Field ID and crop name are required",
      });
    }

    const checkFieldQuery = `
      SELECT id FROM fields
      WHERE id = $1 AND user_id = $2
    `;

    const fieldCheck = await pool.query(checkFieldQuery, [field_id, user_id]);

    if (fieldCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Field not found or unauthorized",
      });
    }

    const insertQuery = `
      INSERT INTO crops (
        field_id,
        crop_name,
        variety,
        sowing_date,
        expected_harvest_date,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      field_id,
      crop_name,
      variety || null,
      sowing_date || null,
      expected_harvest_date || null,
      notes || null,
    ]);

    return res.status(201).json({
      message: "Crop created successfully",
      crop: result.rows[0],
    });
  } catch (error) {
    console.error("Create crop error:", error.message);
    return res.status(500).json({
      message: "Failed to create crop",
    });
  }
};

const getCrops = async (req, res) => {
  try {
    const user_id = req.user.id;

    const query = `
      SELECT 
        crops.*,
        fields.field_name
      FROM crops
      INNER JOIN fields
        ON crops.field_id = fields.id
      WHERE fields.user_id = $1
      ORDER BY crops.created_at DESC
    `;

    const result = await pool.query(query, [user_id]);

    return res.status(200).json({
      message: "Crops fetched successfully",
      crops: result.rows,
    });
  } catch (error) {
    console.error("Get crops error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch crops",
    });
  }
};

const getCropById = async (req, res) => {
  try {
    const user_id = req.user.id;
    const crop_id = req.params.id;

    const query = `
      SELECT 
        crops.*,
        fields.field_name,
        fields.location_name
      FROM crops
      INNER JOIN fields
        ON crops.field_id = fields.id
      WHERE crops.id = $1
        AND fields.user_id = $2
    `;

    const result = await pool.query(query, [crop_id, user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Crop not found or unauthorized",
      });
    }

    return res.status(200).json({
      message: "Crop fetched successfully",
      crop: result.rows[0],
    });
  } catch (error) {
    console.error("Get crop by id error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch crop",
    });
  }
};

const updateCrop = async (req, res) => {
  try {
    const user_id = req.user.id;
    const crop_id = req.params.id;

    const {
      crop_name,
      variety,
      sowing_date,
      expected_harvest_date,
      crop_status,
      notes,
    } = req.body;

    if (!crop_name) {
      return res.status(400).json({
        message: "Crop name is required",
      });
    }

    const checkQuery = `
      SELECT crops.id
      FROM crops
      INNER JOIN fields
        ON crops.field_id = fields.id
      WHERE crops.id = $1
        AND fields.user_id = $2
    `;

    const checkResult = await pool.query(checkQuery, [crop_id, user_id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        message: "Crop not found or unauthorized",
      });
    }

    const updateQuery = `
      UPDATE crops
      SET
        crop_name = COALESCE($1, crop_name),
        variety = $2,
        sowing_date = COALESCE($3, sowing_date),
        expected_harvest_date = $4,
        crop_status = COALESCE($5, crop_status),
        notes = $6
      WHERE id = $7
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      crop_name || null,
      variety || null,
      sowing_date || null,
      expected_harvest_date || null,
      crop_status || null,
      notes || null,
      crop_id,
    ]);

    return res.status(200).json({
      message: "Crop updated successfully",
      crop: result.rows[0],
    });
  } catch (error) {
    console.error("Update crop error:", error.message);
    return res.status(500).json({
      message: "Failed to update crop",
    });
  }
};

const deleteCrop = async (req, res) => {
  try {
    const user_id = req.user.id;
    const crop_id = req.params.id;

    const query = `
      DELETE FROM crops
      WHERE id = $1
        AND field_id IN (SELECT id FROM fields WHERE user_id = $2)
    `;

    const result = await pool.query(query, [crop_id, user_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Crop not found or unauthorized",
      });
    }

    return res.status(200).json({
      message: "Crop deleted successfully",
    });
  } catch (error) {
    console.error("Delete crop error:", error.message);
    return res.status(500).json({
      message: "Failed to delete crop",
    });
  }
};

module.exports = {
  createCrop,
  getCrops,
  getCropById,
  updateCrop,
  deleteCrop,
};