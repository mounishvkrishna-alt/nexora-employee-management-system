const express = require("express");

const db = require("../database/database");
const authenticateToken = require("../middleware/authmiddleware");

const router = express.Router();

// Get logged-in user's profile
router.get("/", authenticateToken, (req, res) => {
  try {
    const user = db
      .prepare(
        `
            SELECT
                users.id AS user_id,
                users.email AS login_email,
                users.role,
                employees.id AS employee_id,
                employees.emp_code,
                employees.name,
                employees.email,
                employees.phone,
                departments.name AS department,
                employees.designation,
                employees.salary,
                employees.join_date,
                employees.status
            FROM users
            LEFT JOIN employees
                ON users.employee_id = employees.id
            LEFT JOIN departments
                ON employees.department_id = departments.id
            WHERE users.id = ?
        `,
      )
      .get(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User profile not found.",
      });
    }

    res.json({
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch profile.",
    });
  }
});

// Update logged-in user's profile
router.put("/", authenticateToken, (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        message: "Name and email are required.",
      });
    }

    const employeeId = req.user.employeeId;

    if (!employeeId) {
      return res.status(400).json({
        message: "This user is not linked to an employee profile.",
      });
    }

    // Check whether the email is already used by another employee
    const existingEmployee = db
      .prepare(
        `
            SELECT id
            FROM employees
            WHERE email = ?
            AND id != ?
        `,
      )
      .get(email, employeeId);

    if (existingEmployee) {
      return res.status(409).json({
        message: "Email is already being used by another employee.",
      });
    }

    db.prepare(
      `
            UPDATE employees
            SET name = ?,
                email = ?,
                phone = ?
            WHERE id = ?
        `,
    ).run(name.trim(), email.trim(), phone || null, employeeId);

    // Keep the login email in users table synchronized
    db.prepare(
      `
            UPDATE users
            SET email = ?
            WHERE employee_id = ?
        `,
    ).run(email.trim(), employeeId);

    res.json({
      message: "Profile updated successfully.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update profile.",
    });
  }
});

module.exports = router;
