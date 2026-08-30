const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const register = async (req, res) => {
    try {
        const { name, email, password, role, phone } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required",
            });
        }

        // Check if user already exists
        const checkUser = "select id from users where email = ?";

        db.query(checkUser, [email], async (error, results) => {
            if (error) {
                return res.status(500).json({
                    message: "Database error",
                });
            }

            if (results.length > 0) {
                return res.status(400).json({
                    message: "User already exists",
                });
            }

            try {
                // Hash password
                const hashedPassword = await bcrypt.hash(password, 10);

                // Insert user
                const insertUser = `
                    insert into users (name, email, password, role, phone)
                    values (?, ?, ?, ?, ?)
                `;

                db.query(
                    insertUser,
                    [
                        name,
                        email,
                        hashedPassword,
                        role || "farmer",
                        phone || null,
                    ],
                    (error, result) => {
                        if (error) {
                            return res.status(500).json({
                                message: "Failed to register user",
                            });
                        }

                        return res.status(201).json({
                            message: "User registered successfully",
                            user: {
                                id: result.insertId,
                                name,
                                email,
                                role: role || "farmer",
                            },
                        });
                    }
                );
            } catch (error) {
                return res.status(500).json({
                    message: "Password hashing failed",
                });
            }
        });
    } catch (err) {
        return res.status(500).json({
            message: "Server error",
        });
    }
};


    const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }

        const findUser = "select * from users where email = ?";

        db.query(findUser, [email], async (error, results) => {
            if (error) {
                return res.status(500).json({
                    message: "Database error",
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    message: "Invalid email or password",
                });
            }

            const user = results[0];

            const isPasswordValid = await bcrypt.compare(
                password,
                user.password
            );

            if (!isPasswordValid) {
                return res.status(401).json({
                    message: "Invalid email or password",
                });
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "7d",
                }
            );

            return res.status(200).json({
                message: "Login successful",
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phone: user.phone,
                },
            });
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error",
        });
    }
};

 module.exports = {register,login};