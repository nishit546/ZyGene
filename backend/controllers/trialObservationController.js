const { pool } = require("../config/db");

// Create observation
const createObservation = async (req, res) => {
  try {
    const user_id = req.user.id;

    const {
      trial_id,
      observation_date,
      measurement_type,
      measurement_value,
      unit,
      rating,
      notes,
    } = req.body;

    if (
      !trial_id ||
      !observation_date ||
      !measurement_type
    ) {
      return res.status(400).json({
        message:
          "Trial ID, observation date and measurement type are required",
      });
    }

    const checkQuery = `
      SELECT breeding_trials.id
      FROM breeding_trials
      INNER JOIN breeding_programs
        ON breeding_trials.program_id = breeding_programs.id
      INNER JOIN breeder_profiles
        ON breeding_programs.breeder_id = breeder_profiles.id
      WHERE breeding_trials.id = $1
        AND breeder_profiles.user_id = $2
    `;

    const checkResult = await pool.query(checkQuery, [trial_id, user_id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        message: "Trial not found or unauthorized",
      });
    }

    const insertQuery = `
      INSERT INTO trial_observations (
        trial_id,
        observation_date,
        measurement_type,
        measurement_value,
        unit,
        rating,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      trial_id,
      observation_date,
      measurement_type,
      measurement_value || null,
      unit || null,
      rating || null,
      notes || null,
    ]);

    return res.status(201).json({
      message: "Trial observation created successfully",
      observation: result.rows[0],
    });
  } catch (error) {
    console.error("Create observation error:", error.message);
    return res.status(500).json({
      message: "Failed to create trial observation",
    });
  }
};

// Get observations by trial
const getObservationsByTrial = async (req, res) => {
  try {
    const user_id = req.user.id;
    const trial_id = req.params.trialId;

    const query = `
      SELECT
        trial_observations.*,
        breeding_trials.trial_name,
        breeding_programs.program_name
      FROM trial_observations
      INNER JOIN breeding_trials
        ON trial_observations.trial_id = breeding_trials.id
      INNER JOIN breeding_programs
        ON breeding_trials.program_id = breeding_programs.id
      INNER JOIN breeder_profiles
        ON breeding_programs.breeder_id = breeder_profiles.id
      WHERE trial_observations.trial_id = $1
        AND breeder_profiles.user_id = $2
      ORDER BY
        trial_observations.observation_date DESC,
        trial_observations.created_at DESC
    `;

    const result = await pool.query(query, [trial_id, user_id]);

    return res.status(200).json({
      message: "Trial observations fetched successfully",
      observations: result.rows,
    });
  } catch (error) {
    console.error("Get observations error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch trial observations",
    });
  }
};

// Update observation
const updateObservation = async (req, res) => {
  try {
    const user_id = req.user.id;
    const observation_id = req.params.id;

    const {
      observation_date,
      measurement_type,
      measurement_value,
      unit,
      rating,
      notes,
    } = req.body;

    if (
      !observation_date ||
      !measurement_type
    ) {
      return res.status(400).json({
        message:
          "Observation date and measurement type are required",
      });
    }

    const query = `
      UPDATE trial_observations
      SET
        observation_date = $1,
        measurement_type = $2,
        measurement_value = $3,
        unit = $4,
        rating = $5,
        notes = $6
      WHERE id = $7
        AND trial_id IN (
          SELECT breeding_trials.id
          FROM breeding_trials
          INNER JOIN breeding_programs
            ON breeding_trials.program_id = breeding_programs.id
          INNER JOIN breeder_profiles
            ON breeding_programs.breeder_id = breeder_profiles.id
          WHERE breeder_profiles.user_id = $8
        )
      RETURNING *
    `;

    const result = await pool.query(query, [
      observation_date,
      measurement_type,
      measurement_value || null,
      unit || null,
      rating || null,
      notes || null,
      observation_id,
      user_id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Trial observation not found",
      });
    }

    return res.status(200).json({
      message: "Trial observation updated successfully",
      observation: result.rows[0],
    });
  } catch (error) {
    console.error("Update observation error:", error.message);
    return res.status(500).json({
      message: "Failed to update trial observation",
    });
  }
};

// Delete observation
const deleteObservation = async (req, res) => {
  try {
    const user_id = req.user.id;
    const observation_id = req.params.id;

    const query = `
      DELETE FROM trial_observations
      WHERE id = $1
        AND trial_id IN (
          SELECT breeding_trials.id
          FROM breeding_trials
          INNER JOIN breeding_programs
            ON breeding_trials.program_id = breeding_programs.id
          INNER JOIN breeder_profiles
            ON breeding_programs.breeder_id = breeder_profiles.id
          WHERE breeder_profiles.user_id = $2
        )
    `;

    const result = await pool.query(query, [observation_id, user_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Trial observation not found",
      });
    }

    return res.status(200).json({
      message: "Trial observation deleted successfully",
    });
  } catch (error) {
    console.error("Delete observation error:", error.message);
    return res.status(500).json({
      message: "Failed to delete trial observation",
    });
  }
};

module.exports = {
  createObservation,
  getObservationsByTrial,
  updateObservation,
  deleteObservation,
};

