const { pool } = require("../config/db");

const createField = async (req, res) => {
  try {
    const {
      field_name,
      latitude,
      longitude,
      area,
      area_unit,
      soil_type,
      location_name,
    } = req.body;

    const user_id = req.user.id;

    if (!field_name) {
      return res.status(400).json({
        message: "Field name is required",
      });
    }

    const query = `
      INSERT INTO fields 
      (
        user_id,
        field_name,
        latitude,
        longitude,
        area,
        area_unit,
        soil_type,
        location_name
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pool.query(query, [
      user_id,
      field_name,
      latitude || null,
      longitude || null,
      area || null,
      area_unit || null,
      soil_type || null,
      location_name || null,
    ]);

    return res.status(201).json({
      message: "Field created successfully",
      field: result.rows[0],
    });
  } catch (error) {
    console.error("Create field error:", error.message);
    return res.status(500).json({
      message: "Failed to create field",
    });
  }
};

const getFields = async (req, res) => {
  try {
    const user_id = req.user.id;

    const query = `
      SELECT * FROM fields
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [user_id]);

    return res.status(200).json({
      message: "Fields fetched successfully",
      fields: result.rows,
    });
  } catch (error) {
    console.error("Get fields error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch fields",
    });
  }
};

const getFieldById = async (req, res) => {
  try {
    const user_id = req.user.id;
    const field_id = req.params.id;

    const query = `
      SELECT * FROM fields
      WHERE id = $1 AND user_id = $2
    `;

    const result = await pool.query(query, [field_id, user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Field not found",
      });
    }

    return res.status(200).json({
      message: "Field fetched successfully",
      field: result.rows[0],
    });
  } catch (error) {
    console.error("Get field by id error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch field",
    });
  }
};

const updateField = async (req, res) => {
  try {
    const user_id = req.user.id;
    const field_id = req.params.id;

    const {
      field_name,
      latitude,
      longitude,
      area,
      area_unit,
      soil_type,
      location_name,
    } = req.body;

    if (!field_name) {
      return res.status(400).json({
        message: "Field name is required",
      });
    }

    const query = `
      UPDATE fields
      SET
        field_name = $1,
        latitude = $2,
        longitude = $3,
        area = $4,
        area_unit = $5,
        soil_type = $6,
        location_name = $7
      WHERE id = $8 AND user_id = $9
      RETURNING *
    `;

    const result = await pool.query(query, [
      field_name,
      latitude || null,
      longitude || null,
      area || null,
      area_unit || null,
      soil_type || null,
      location_name || null,
      field_id,
      user_id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Field not found or unauthorized",
      });
    }

    return res.status(200).json({
      message: "Field updated successfully",
      field: result.rows[0],
    });
  } catch (error) {
    console.error("Update field error:", error.message);
    return res.status(500).json({
      message: "Failed to update field",
    });
  }
};

const deleteField = async (req, res) => {
  try {
    const user_id = req.user.id;
    const field_id = req.params.id;

    const query = `
      DELETE FROM fields
      WHERE id = $1 AND user_id = $2
    `;

    const result = await pool.query(query, [field_id, user_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Field not found or unauthorized",
      });
    }

    return res.status(200).json({
      message: "Field deleted successfully",
    });
  } catch (error) {
    console.error("Delete field error:", error.message);
    return res.status(500).json({
      message: "Failed to delete field",
    });
  }
};

module.exports = {
  createField,
  getFields,
  getFieldById,
  updateField,
  deleteField,
};