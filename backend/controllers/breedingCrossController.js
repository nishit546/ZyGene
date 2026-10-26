const { pool } = require("../config/db");

// Create breeding cross
const createCross = async (req, res) => {
  try {
    const user_id = req.user.id;

    const {
      program_id,
      parent_1,
      parent_2,
      cross_code,
      cross_date,
      generation,
      objective,
      success_status,
      notes,
    } = req.body;

    if (
      !program_id ||
      !parent_1 ||
      !parent_2 ||
      !cross_code ||
      !cross_date
    ) {
      return res.status(400).json({
        message:
          "Program ID, parents, cross code and cross date are required",
      });
    }

    const checkQuery = `
      SELECT breeding_programs.id
      FROM breeding_programs
      INNER JOIN breeder_profiles
        ON breeding_programs.breeder_id = breeder_profiles.id
      WHERE breeding_programs.id = $1
        AND breeder_profiles.user_id = $2
    `;

    const checkResult = await pool.query(checkQuery, [program_id, user_id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        message: "Breeding program not found or unauthorized",
      });
    }

    const insertQuery = `
      INSERT INTO breeding_crosses (
        program_id,
        parent_1,
        parent_2,
        cross_code,
        cross_date,
        generation,
        objective,
        success_status,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      program_id,
      parent_1,
      parent_2,
      cross_code,
      cross_date,
      generation || null,
      objective || null,
      success_status || "planned",
      notes || null,
    ]);

    return res.status(201).json({
      message: "Breeding cross created successfully",
      cross: result.rows[0],
    });
  } catch (error) {
    console.error("Create cross error:", error.message);
    return res.status(500).json({
      message: "Failed to create breeding cross",
    });
  }
};

// Get all crosses
const getCrosses = async (req, res) => {
  try {
    const user_id = req.user.id;

    const query = `
      SELECT
        breeding_crosses.*,
        breeding_programs.program_name,
        breeding_programs.crop_name
      FROM breeding_crosses
      INNER JOIN breeding_programs
        ON breeding_crosses.program_id = breeding_programs.id
      INNER JOIN breeder_profiles
        ON breeding_programs.breeder_id = breeder_profiles.id
      WHERE breeder_profiles.user_id = $1
      ORDER BY breeding_crosses.created_at DESC
    `;

    const result = await pool.query(query, [user_id]);

    return res.status(200).json({
      message: "Breeding crosses fetched successfully",
      crosses: result.rows,
    });
  } catch (error) {
    console.error("Get crosses error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch breeding crosses",
    });
  }
};

// Get single cross
const getCrossById = async (req, res) => {
  try {
    const user_id = req.user.id;
    const cross_id = req.params.id;

    const query = `
      SELECT
        breeding_crosses.*,
        breeding_programs.program_name,
        breeding_programs.crop_name
      FROM breeding_crosses
      INNER JOIN breeding_programs
        ON breeding_crosses.program_id = breeding_programs.id
      INNER JOIN breeder_profiles
        ON breeding_programs.breeder_id = breeder_profiles.id
      WHERE breeding_crosses.id = $1
        AND breeder_profiles.user_id = $2
    `;

    const result = await pool.query(query, [cross_id, user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Breeding cross not found",
      });
    }

    return res.status(200).json({
      message: "Breeding cross fetched successfully",
      cross: result.rows[0],
    });
  } catch (error) {
    console.error("Get cross error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch breeding cross",
    });
  }
};

// Update cross
const updateCross = async (req, res) => {
  try {
    const user_id = req.user.id;
    const cross_id = req.params.id;

    const {
      parent_1,
      parent_2,
      cross_code,
      cross_date,
      generation,
      objective,
      success_status,
      notes,
    } = req.body;

    if (
      !parent_1 ||
      !parent_2 ||
      !cross_code ||
      !cross_date
    ) {
      return res.status(400).json({
        message:
          "Parents, cross code and cross date are required",
      });
    }

    const query = `
      UPDATE breeding_crosses
      SET
        parent_1 = $1,
        parent_2 = $2,
        cross_code = $3,
        cross_date = $4,
        generation = $5,
        objective = $6,
        success_status = $7,
        notes = $8
      WHERE id = $9
        AND program_id IN (
          SELECT breeding_programs.id
          FROM breeding_programs
          INNER JOIN breeder_profiles
            ON breeding_programs.breeder_id = breeder_profiles.id
          WHERE breeder_profiles.user_id = $10
        )
      RETURNING *
    `;

    const result = await pool.query(query, [
      parent_1,
      parent_2,
      cross_code,
      cross_date,
      generation || null,
      objective || null,
      success_status || "planned",
      notes || null,
      cross_id,
      user_id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Breeding cross not found",
      });
    }

    return res.status(200).json({
      message: "Breeding cross updated successfully",
      cross: result.rows[0],
    });
  } catch (error) {
    console.error("Update cross error:", error.message);
    return res.status(500).json({
      message: "Failed to update breeding cross",
    });
  }
};

// Delete cross
const deleteCross = async (req, res) => {
  try {
    const user_id = req.user.id;
    const cross_id = req.params.id;

    const query = `
      DELETE FROM breeding_crosses
      WHERE id = $1
        AND program_id IN (
          SELECT breeding_programs.id
          FROM breeding_programs
          INNER JOIN breeder_profiles
            ON breeding_programs.breeder_id = breeder_profiles.id
          WHERE breeder_profiles.user_id = $2
        )
    `;

    const result = await pool.query(query, [cross_id, user_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Breeding cross not found",
      });
    }

    return res.status(200).json({
      message: "Breeding cross deleted successfully",
    });
  } catch (error) {
    console.error("Delete cross error:", error.message);
    return res.status(500).json({
      message: "Failed to delete breeding cross",
    });
  }
};

module.exports = {
  createCross,
  getCrosses,
  getCrossById,
  updateCross,
  deleteCross,
};
