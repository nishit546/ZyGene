const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "zygene_jwt_secret_key_2026";

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const normalizedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);
    const cleanPhone = phone ? String(phone).trim() : null;

    if (!normalizedName) {
      return res.status(400).json({
        message: "Name cannot be empty",
      });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    // Role validation: ('farmer', 'breeder', 'admin')
    const allowedRoles = ["farmer", "breeder", "admin"];
    let normalizedRole = "farmer";
    if (role && typeof role === "string") {
      const lowerRole = role.toLowerCase().trim();
      if (allowedRoles.includes(lowerRole)) {
        normalizedRole = lowerRole;
      }
    }

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    // Hash password (12 salt rounds)
    const hashedPassword = await bcrypt.hash(cleanPassword, 12);

    // Insert user into PostgreSQL using RETURNING
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, phone, created_at`,
      [normalizedName, normalizedEmail, hashedPassword, normalizedRole, cleanPhone]
    );

    const newUser = result.rows[0];

    // If registering as a breeder, ensure breeder_profiles record exists
    if (normalizedRole === "breeder") {
      try {
        await pool.query(
          `INSERT INTO breeder_profiles (user_id, breeder_name)
           VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET breeder_name = EXCLUDED.breeder_name`,
          [newUser.id, normalizedName]
        );
      } catch (profileErr) {
        console.error("Warning: Failed to auto-create breeder profile:", profileErr.message);
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: newUser,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * Log in an existing user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);

    // Find user by email in PostgreSQL
    const result = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = $1",
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(cleanPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // If role is breeder, ensure breeder_profiles record exists
    if (user.role === "breeder") {
      try {
        const profileResult = await pool.query(
          "SELECT id FROM breeder_profiles WHERE user_id = $1",
          [user.id]
        );

        if (profileResult.rows.length === 0) {
          await pool.query(
            "INSERT INTO breeder_profiles (user_id, breeder_name) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
            [user.id, user.name || "Breeder"]
          );
        }
      } catch (profileErr) {
        console.error("Warning: Failed to ensure breeder profile on login:", profileErr.message);
      }
    }

    // Sign JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || null,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      message: "Internal server error during login",
      error: error.message,
    });
  }
};

/**
 * Get current authenticated user details
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const result = await pool.query(
      "SELECT id, name, email, role, phone, created_at, updated_at FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Current user retrieved successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("GetMe error:", error.message);
    return res.status(500).json({
      message: "Internal server error fetching user profile",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  registerUser: register,
  login,
  getMe,
};