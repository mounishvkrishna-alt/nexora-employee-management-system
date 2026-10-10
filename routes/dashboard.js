const express = require("express");

const db = require("../database/database");
const authenticateToken = require("../middleware/authmiddleware");
const authorizeRoles = require("../middleware/rolemiddleware");

const router = express.Router();

// Dashboard statistics
router.get(
  "/",
  authenticateToken,
  authorizeRoles("HR Admin", "Manager"),
  (req, res) => {
    try {
      let employeeCondition = "";
      const params = [];

      // Managers can see only their own department
      if (req.user.role === "Manager") {
        employeeCondition = "WHERE employees.department_id = ?";
        params.push(req.user.departmentId);
      }

      const total = db
        .prepare(
          `
                SELECT COUNT(*) AS count
                FROM employees
                ${employeeCondition}
            `,
        )
        .get(...params).count;

      const active = db
        .prepare(
          `
                SELECT COUNT(*) AS count
                FROM employees
                ${employeeCondition}
                ${employeeCondition ? "AND" : "WHERE"} employees.status = 'Active'
            `,
        )
        .get(...params).count;

      const inactive = db
        .prepare(
          `
                SELECT COUNT(*) AS count
                FROM employees
                ${employeeCondition}
                ${employeeCondition ? "AND" : "WHERE"} employees.status = 'Inactive'
            `,
        )
        .get(...params).count;

      let departmentQuery = `
                SELECT
                    departments.id,
                    departments.name,
                    COUNT(employees.id) AS headcount
                FROM departments
                LEFT JOIN employees
                    ON departments.id = employees.department_id
            `;

      if (req.user.role === "Manager") {
        departmentQuery += `
                    WHERE departments.id = ?
                `;
      }

      departmentQuery += `
                GROUP BY departments.id
                ORDER BY departments.id ASC
            `;

      const departmentParams =
        req.user.role === "Manager" ? [req.user.departmentId] : [];

      const departments = db.prepare(departmentQuery).all(...departmentParams);

      res.json({
        totalEmployees: total,
        activeEmployees: active,
        inactiveEmployees: inactive,
        departments,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to fetch dashboard data.",
      });
    }
  },
);

module.exports = router;
