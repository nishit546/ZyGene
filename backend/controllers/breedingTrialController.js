const { pool } = require("../config/db");

// Create trial
const createTrial = async (req, res) => {
  try {
    const user_id = req.user.id;

    const {
      program_id,
      cross_id,
      trial_name,
      location,
      season,
      start_date,
      end_date,
      status,
      notes,
    } = req.body;

    if (!program_id || !trial_name) {
      return res.status(400).json({
        message: "Program ID and trial name are required",
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

    const progCheck = await pool.query(checkQuery, [program_id, user_id]);

    if (progCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Breeding program not found or unauthorized",
      });
    }

    if (cross_id) {
      const crossQuery = `
        SELECT breeding_crosses.id
        FROM breeding_crosses
        INNER JOIN breeding_programs
          ON breeding_crosses.program_id = breeding_programs.id
        INNER JOIN breeder_profiles
          ON breeding_programs.breeder_id = breeder_profiles.id
        WHERE breeding_crosses.id = $1
          AND breeding_crosses.program_id = $2
          AND breeder_profiles.user_id = $3
      `;

      const crossCheck = await pool.query(crossQuery, [cross_id, program_id, user_id]);

      if (crossCheck.rows.length === 0) {
        return res.status(404).json({
          message:
            "Breeding cross not found or does not belong to this program",
        });
      }
    }

    const insertQuery = `
      INSERT INTO breeding_trials (
        program_id,
        cross_id,
        trial_name,
        location,
        season,
        start_date,
        end_date,
        status,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      program_id,
      cross_id || null,
      trial_name,
      location || null,
      season || null,
      start_date || null,
      end_date || null,
      status || "planned",
      notes || null,
    ]);

    return res.status(201).json({
      message: "Breeding trial created successfully",
      trial: result.rows[0],
    });
  } catch (error) {
    console.error("Create trial error:", error.message);
    return res.status(500).json({
      message: "Failed to create breeding trial",
    });
  }
};

// Get all trials
const getTrials = async (req, res) => {
  try {
    const user_id = req.user.id;

    const query = `
      SELECT
        breeding_trials.*,
        breeding_programs.program_name,
        breeding_programs.crop_name,
        breeding_crosses.cross_code
      FROM breeding_trials
      INNER JOIN breeding_programs
        ON breeding_trials.program_id = breeding_programs.id
      INNER JOIN breeder_profiles
        ON breeding_programs.breeder_id = breeder_profiles.id
      LEFT JOIN breeding_crosses
        ON breeding_trials.cross_id = breeding_crosses.id
      WHERE breeder_profiles.user_id = $1
      ORDER BY breeding_trials.created_at DESC
    `;

    const result = await pool.query(query, [user_id]);

    return res.status(200).json({
      message: "Breeding trials fetched successfully",
      trials: result.rows,
    });
  } catch (error) {
    console.error("Get trials error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch breeding trials",
    });
  }
};

// Get single trial
const getTrialById = async (req, res) => {
  try {
    const user_id = req.user.id;
    const trial_id = req.params.id;

    const query = `
      SELECT
        breeding_trials.*,
        breeding_programs.program_name,
        breeding_programs.crop_name,
        breeding_crosses.cross_code
      FROM breeding_trials
      INNER JOIN breeding_programs
        ON breeding_trials.program_id = breeding_programs.id
      INNER JOIN breeder_profiles
        ON breeding_programs.breeder_id = breeder_profiles.id
      LEFT JOIN breeding_crosses
        ON breeding_trials.cross_id = breeding_crosses.id
      WHERE breeding_trials.id = $1
        AND breeder_profiles.user_id = $2
    `;

    const result = await pool.query(query, [trial_id, user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Breeding trial not found",
      });
    }

    return res.status(200).json({
      message: "Breeding trial fetched successfully",
      trial: result.rows[0],
    });
  } catch (error) {
    console.error("Get trial error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch breeding trial",
    });
  }
};

// Update trial
const updateTrial = async (req, res) => {
  try {
    const user_id = req.user.id;
    const trial_id = req.params.id;

    const {
      cross_id,
      trial_name,
      location,
      season,
      start_date,
      end_date,
      status,
      notes,
    } = req.body;

    if (!trial_name) {
      return res.status(400).json({
        message: "Trial name is required",
      });
    }

    const query = `
      UPDATE breeding_trials
      SET
        cross_id = $1,
        trial_name = $2,
        location = $3,
        season = $4,
        start_date = $5,
        end_date = $6,
        status = $7,
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
      cross_id || null,
      trial_name,
      location || null,
      season || null,
      start_date || null,
      end_date || null,
      status || "planned",
      notes || null,
      trial_id,
      user_id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Breeding trial not found",
      });
    }

    return res.status(200).json({
      message: "Breeding trial updated successfully",
      trial: result.rows[0],
    });
  } catch (error) {
    console.error("Update trial error:", error.message);
    return res.status(500).json({
      message: "Failed to update breeding trial",
    });
  }
};

// Delete trial
const deleteTrial = async (req, res) => {
  try {
    const user_id = req.user.id;
    const trial_id = req.params.id;

    const query = `
      DELETE FROM breeding_trials
      WHERE id = $1
        AND program_id IN (
          SELECT breeding_programs.id
          FROM breeding_programs
          INNER JOIN breeder_profiles
            ON breeding_programs.breeder_id = breeder_profiles.id
          WHERE breeder_profiles.user_id = $2
        )
    `;

    const result = await pool.query(query, [trial_id, user_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Breeding trial not found",
      });
    }

    return res.status(200).json({
      message: "Breeding trial deleted successfully",
    });
  } catch (error) {
    console.error("Delete trial error:", error.message);
    return res.status(500).json({
      message: "Failed to delete breeding trial",
    });
  }
};

module.exports = {
  createTrial,
  getTrials,
  getTrialById,
  updateTrial,
  deleteTrial,
};