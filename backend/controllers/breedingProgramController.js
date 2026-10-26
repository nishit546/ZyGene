const { pool } = require("../config/db");

// Create breeding program
const createProgram = async (req, res) => {
  try {
    const user_id = req.user.id;

    const {
      program_name,
      crop_name,
      objective,
      start_date,
      expected_end_date,
      status,
      description,
    } = req.body;

    if (!program_name || !crop_name) {
      return res.status(400).json({
        message: "Program name and crop name are required",
      });
    }

    // Find breeder profile
    const breederQuery = `
      SELECT id
      FROM breeder_profiles
      WHERE user_id = $1
    `;

    const breederResult = await pool.query(breederQuery, [user_id]);

    if (breederResult.rows.length === 0) {
      return res.status(404).json({
        message: "Breeder profile not found",
      });
    }

    const breeder_id = breederResult.rows[0].id;

    const insertQuery = `
      INSERT INTO breeding_programs (
        breeder_id,
        program_name,
        crop_name,
        objective,
        start_date,
        expected_end_date,
        status,
        description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      breeder_id,
      program_name,
      crop_name,
      objective || null,
      start_date || null,
      expected_end_date || null,
      status || "planned",
      description || null,
    ]);

    return res.status(201).json({
      message: "Breeding program created successfully",
      program: result.rows[0],
    });
  } catch (error) {
    console.error("Create program error:", error.message);
    return res.status(500).json({
      message: "Failed to create breeding program",
    });
  }
};

// Get all programs of logged-in breeder
const getPrograms = async (req, res) => {
  try {
    const user_id = req.user.id;

    const query = `
      SELECT
        breeding_programs.*
      FROM breeding_programs
      INNER JOIN breeder_profiles
        ON breeding_programs.breeder_id = breeder_profiles.id
      WHERE breeder_profiles.user_id = $1
      ORDER BY breeding_programs.created_at DESC
    `;

    const result = await pool.query(query, [user_id]);

    return res.status(200).json({
      message: "Breeding programs fetched successfully",
      programs: result.rows,
    });
  } catch (error) {
    console.error("Get programs error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch breeding programs",
    });
  }
};

// Get single program
const getProgramById = async (req, res) => {
  try {
    const user_id = req.user.id;
    const program_id = req.params.id;

    const query = `
      SELECT
        breeding_programs.*
      FROM breeding_programs
      INNER JOIN breeder_profiles
        ON breeding_programs.breeder_id = breeder_profiles.id
      WHERE breeding_programs.id = $1
        AND breeder_profiles.user_id = $2
    `;

    const result = await pool.query(query, [program_id, user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Breeding program not found",
      });
    }

    return res.status(200).json({
      message: "Breeding program fetched successfully",
      program: result.rows[0],
    });
  } catch (error) {
    console.error("Get program error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch breeding program",
    });
  }
};

// Update program
const updateProgram = async (req, res) => {
  try {
    const user_id = req.user.id;
    const program_id = req.params.id;

    const {
      program_name,
      crop_name,
      objective,
      start_date,
      expected_end_date,
      status,
      description,
    } = req.body;

    if (!program_name || !crop_name) {
      return res.status(400).json({
        message: "Program name and crop name are required",
      });
    }

    const query = `
      UPDATE breeding_programs
      SET
        program_name = $1,
        crop_name = $2,
        objective = $3,
        start_date = $4,
        expected_end_date = $5,
        status = $6,
        description = $7
      WHERE id = $8
        AND breeder_id IN (
          SELECT id FROM breeder_profiles WHERE user_id = $9
        )
      RETURNING *
    `;

    const result = await pool.query(query, [
      program_name,
      crop_name,
      objective || null,
      start_date || null,
      expected_end_date || null,
      status || "planned",
      description || null,
      program_id,
      user_id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Breeding program not found",
      });
    }

    return res.status(200).json({
      message: "Breeding program updated successfully",
      program: result.rows[0],
    });
  } catch (error) {
    console.error("Update program error:", error.message);
    return res.status(500).json({
      message: "Failed to update breeding program",
    });
  }
};

// Delete program
const deleteProgram = async (req, res) => {
  try {
    const user_id = req.user.id;
    const program_id = req.params.id;

    const query = `
      DELETE FROM breeding_programs
      WHERE id = $1
        AND breeder_id IN (
          SELECT id FROM breeder_profiles WHERE user_id = $2
        )
    `;

    const result = await pool.query(query, [program_id, user_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Breeding program not found",
      });
    }

    return res.status(200).json({
      message: "Breeding program deleted successfully",
    });
  } catch (error) {
    console.error("Delete program error:", error.message);
    return res.status(500).json({
      message: "Failed to delete breeding program",
    });
  }
};

module.exports = {
  createProgram,
  getPrograms,
  getProgramById,
  updateProgram,
  deleteProgram,
};