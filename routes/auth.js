const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../database/database");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from the .env file.");
}

// POST /api/auth/login
router.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = db
      .prepare(
        `
            SELECT
                users.id,
                users.email,
                users.password_hash,
                users.role,
                users.employee_id,
                employees.name,
                employees.department_id
            FROM users
            LEFT JOIN employees
                ON users.employee_id = employees.id
            WHERE users.email = ?
        `,
      )
      .get(email);

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        employeeId: user.employee_id,
        role: user.role,
        departmentId: user.department_id,
      },
      JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        employeeId: user.employee_id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.department_id,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error during login.",
    });
  }
});

module.exports = router;
