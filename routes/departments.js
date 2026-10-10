const express = require("express");

const db = require("../database/database");
const authenticateToken = require("../middleware/authmiddleware");
const authorizeRoles = require("../middleware/rolemiddleware");

const router = express.Router();

// Get all departments
router.get(
  "/",
  authenticateToken,
  authorizeRoles("HR Admin", "Manager"),
  (req, res) => {
    try {
      const departments = db
        .prepare(
          `
                SELECT
                    departments.id,
                    departments.name,
                    COUNT(employees.id) AS headcount
                FROM departments
                LEFT JOIN employees
                    ON departments.id = employees.department_id
                GROUP BY departments.id
                ORDER BY departments.id ASC
            `,
        )
        .all();

      res.json({
        count: departments.length,
        departments,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to fetch departments.",
      });
    }
  },
);

// Create a new department - HR Admin only
router.post("/", authenticateToken, authorizeRoles("HR Admin"), (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Department name is required.",
      });
    }

    const departmentName = name.trim();

    // Check duplicate department
    const existingDepartment = db
      .prepare(
        `
                SELECT id
                FROM departments
                WHERE name = ?
            `,
      )
      .get(departmentName);

    if (existingDepartment) {
      return res.status(409).json({
        message: "Department already exists.",
      });
    }

    const result = db
      .prepare(
        `
                INSERT INTO departments (name)
                VALUES (?)
            `,
      )
      .run(departmentName);

    res.status(201).json({
      message: "Department created successfully.",
      department: {
        id: result.lastInsertRowid,
        name: departmentName,
        headcount: 0,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create department.",
    });
  }
});
module.exports = router;
