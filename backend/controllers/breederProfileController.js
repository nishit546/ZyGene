const { pool } = require("../config/db");

// Get breeder profile
const getBreederProfile = async (req, res) => {
  try {
    const user_id = req.user.id;

    const query = `
      SELECT
        breeder_profiles.id,
        breeder_profiles.user_id,
        breeder_profiles.breeder_name,
        breeder_profiles.organization,
        breeder_profiles.specialization,
        breeder_profiles.location,
        breeder_profiles.created_at,
        users.name,
        users.email,
        users.phone,
        users.role
      FROM breeder_profiles
      INNER JOIN users
        ON breeder_profiles.user_id = users.id
      WHERE breeder_profiles.user_id = $1
        AND users.role = 'breeder'
    `;

    const result = await pool.query(query, [user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Breeder profile not found",
      });
    }

    return res.status(200).json({
      message: "Breeder profile fetched successfully",
      profile: result.rows[0],
    });
  } catch (error) {
    console.error("Get breeder profile error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch breeder profile",
    });
  }
};

// Create breeder profile
const createBreederProfile = async (req, res) => {
  try {
    const user_id = req.user.id;

    const {
      breeder_name,
      organization,
      specialization,
      location,
    } = req.body;

    if (!breeder_name) {
      return res.status(400).json({
        message: "Breeder name is required",
      });
    }

    // Check user role
    const userQuery = `
      SELECT id, name, email, phone, role
      FROM users
      WHERE id = $1
    `;

    const userResult = await pool.query(userQuery, [user_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (userResult.rows[0].role !== "breeder") {
      return res.status(403).json({
        message: "Only breeders can create a breeder profile",
      });
    }

    // Check if profile already exists
    const checkQuery = `
      SELECT id
      FROM breeder_profiles
      WHERE user_id = $1
    `;

    const profileCheck = await pool.query(checkQuery, [user_id]);

    if (profileCheck.rows.length > 0) {
      return res.status(409).json({
        message: "Breeder profile already exists",
      });
    }

    const insertQuery = `
      INSERT INTO breeder_profiles (
        user_id,
        breeder_name,
        organization,
        specialization,
        location
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      user_id,
      breeder_name,
      organization || null,
      specialization || null,
      location || null,
    ]);

    return res.status(201).json({
      message: "Breeder profile created successfully",
      profile: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Breeder profile already exists",
      });
    }
    console.error("Create breeder profile error:", error.message);
    return res.status(500).json({
      message: "Failed to create breeder profile",
    });
  }
};

// Update breeder profile
const updateBreederProfile = async (req, res) => {
  try {
    const user_id = req.user.id;

    const {
      breeder_name,
      organization,
      specialization,
      location,
    } = req.body;

    if (!breeder_name) {
      return res.status(400).json({
        message: "Breeder name is required",
      });
    }

    const query = `
      UPDATE breeder_profiles
      SET
        breeder_name = $1,
        organization = $2,
        specialization = $3,
        location = $4
      WHERE user_id = $5
      RETURNING *
    `;

    const result = await pool.query(query, [
      breeder_name,
      organization || null,
      specialization || null,
      location || null,
      user_id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Breeder profile not found",
      });
    }

    return res.status(200).json({
      message: "Breeder profile updated successfully",
      profile: result.rows[0],
    });
  } catch (error) {
    console.error("Update breeder profile error:", error.message);
    return res.status(500).json({
      message: "Failed to update breeder profile",
    });
  }
};

module.exports = {
  getBreederProfile,
  createBreederProfile,
  updateBreederProfile,
};
