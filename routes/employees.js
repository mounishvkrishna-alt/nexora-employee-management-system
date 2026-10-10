const express = require("express");

const db = require("../database/database");
const authenticateToken = require("../middleware/authmiddleware");
const authorizeRoles = require("../middleware/rolemiddleware");

const router = express.Router();

// Get employees
// Get employees with search
router.get(
  "/",
  authenticateToken,
  authorizeRoles("HR Admin", "Manager"),
  (req, res) => {
    try {
      const search = req.query.search || "";
      const dept = req.query.dept || "";

      let query = `
                SELECT
                    employees.id,
                    employees.emp_code,
                    employees.name,
                    employees.email,
                    employees.phone,
                    departments.name AS department,
                    employees.designation,
                    employees.salary,
                    employees.join_date,
                    employees.status
                FROM employees
                JOIN departments
                    ON employees.department_id = departments.id
            `;

      const conditions = [];
      const params = [];

      // Manager can see only their department
      if (req.user.role === "Manager") {
        conditions.push("employees.department_id = ?");
        params.push(req.user.departmentId);
      }

      // Filter by department
      if (dept) {
        conditions.push("employees.department_id = ?");
        params.push(dept);
      }

      // Search by employee code, name, or email
      if (search) {
        conditions.push(`
                    (
                        employees.emp_code LIKE ?
                        OR employees.name LIKE ?
                        OR employees.email LIKE ?
                    )
                `);

        const searchValue = `%${search}%`;

        params.push(searchValue);
        params.push(searchValue);
        params.push(searchValue);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      const sortOptions = {
        name: "employees.name",
        salary: "employees.salary",
        join_date: "employees.join_date",
        emp_code: "employees.emp_code",
      };

      const sort = req.query.sort || "id";

      const sortColumn = sortOptions[sort] || "employees.id";

      query += ` ORDER BY ${sortColumn} ASC`;

      // Pagination
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.max(parseInt(req.query.limit) || 10, 1);
      const offset = (page - 1) * limit;

      // Get total number of matching employees
      let countQuery = `
        SELECT COUNT(*) AS total
        FROM employees
        JOIN departments
        ON employees.department_id = departments.id
      `;

      if (conditions.length > 0) {
        countQuery += " WHERE " + conditions.join(" AND ");
      }

      const total = db.prepare(countQuery).get(...params).total;

      // Get employees for current page
      query += " LIMIT ? OFFSET ?";

      const employees = db.prepare(query).all(...params, limit, offset);

      res.json({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        count: employees.length,
        employees,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to fetch employees.",
      });
    }
  },
);
// Add employee - HR Admin only
router.post("/", authenticateToken, authorizeRoles("HR Admin"), (req, res) => {
  try {
    const {
      emp_code,
      name,
      email,
      phone,
      department_id,
      designation,
      salary,
      join_date,
    } = req.body;

    if (
      !emp_code ||
      !name ||
      !email ||
      !department_id ||
      !designation ||
      salary === undefined ||
      !join_date
    ) {
      return res.status(400).json({
        message: "Required employee fields are missing.",
      });
    }

    const department = db
      .prepare("SELECT id FROM departments WHERE id = ?")
      .get(department_id);

    if (!department) {
      return res.status(400).json({
        message: "Invalid department.",
      });
    }

    const existingEmployee = db
      .prepare(
        `
                    SELECT id
                    FROM employees
                    WHERE emp_code = ? OR email = ?
                `,
      )
      .get(emp_code, email);

    if (existingEmployee) {
      return res.status(409).json({
        message: "Employee code or email already exists.",
      });
    }

    const result = db
      .prepare(
        `
                INSERT INTO employees
                (
                    emp_code,
                    name,
                    email,
                    phone,
                    department_id,
                    designation,
                    salary,
                    join_date,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')
            `,
      )
      .run(
        emp_code,
        name,
        email,
        phone || null,
        department_id,
        designation,
        salary,
        join_date,
      );

    const newEmployee = db
      .prepare(
        `
                SELECT
                    employees.id,
                    employees.emp_code,
                    employees.name,
                    employees.email,
                    employees.phone,
                    departments.name AS department,
                    employees.designation,
                    employees.salary,
                    employees.join_date,
                    employees.status
                FROM employees
                JOIN departments
                    ON employees.department_id = departments.id
                WHERE employees.id = ?
            `,
      )
      .get(result.lastInsertRowid);

    res.status(201).json({
      message: "Employee added successfully.",
      employee: newEmployee,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to add employee.",
    });
  }
});
// Export employees as CSV
router.get(
  "/export",
  authenticateToken,
  authorizeRoles("HR Admin"),
  (req, res) => {
    try {
      const employees = db
        .prepare(
          `
                SELECT
                    employees.emp_code,
                    employees.name,
                    employees.email,
                    employees.phone,
                    departments.name AS department,
                    employees.designation,
                    employees.salary,
                    employees.join_date,
                    employees.status
                FROM employees
                JOIN departments
                    ON employees.department_id = departments.id
                ORDER BY employees.id ASC
            `,
        )
        .all();

      const headers = [
        "Employee Code",
        "Name",
        "Email",
        "Phone",
        "Department",
        "Designation",
        "Salary",
        "Join Date",
        "Status",
      ];

      const rows = employees.map((employee) => [
        employee.emp_code,
        employee.name,
        employee.email,
        employee.phone || "",
        employee.department,
        employee.designation,
        employee.salary,
        employee.join_date,
        employee.status,
      ]);

      const csv = [headers, ...rows]
        .map((row) =>
          row
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=employees.csv",
      );

      res.send(csv);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to export employees.",
      });
    }
  },
);
// Update employee - HR Admin only
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("HR Admin"),
  (req, res) => {
    try {
      const employeeId = req.params.id;

      const {
        emp_code,
        name,
        email,
        phone,
        department_id,
        designation,
        salary,
        join_date,
      } = req.body;

      if (
        !emp_code ||
        !name ||
        !email ||
        !department_id ||
        !designation ||
        salary === undefined ||
        !join_date
      ) {
        return res.status(400).json({
          message: "Required employee fields are missing.",
        });
      }

      const employee = db
        .prepare("SELECT id FROM employees WHERE id = ?")
        .get(employeeId);

      if (!employee) {
        return res.status(404).json({
          message: "Employee not found.",
        });
      }

      const department = db
        .prepare("SELECT id FROM departments WHERE id = ?")
        .get(department_id);

      if (!department) {
        return res.status(400).json({
          message: "Invalid department.",
        });
      }

      const duplicate = db
        .prepare(
          `
                SELECT id
                FROM employees
                WHERE (emp_code = ? OR email = ?)
                AND id != ?
            `,
        )
        .get(emp_code, email, employeeId);

      if (duplicate) {
        return res.status(409).json({
          message: "Employee code or email already exists.",
        });
      }

      db.prepare(
        `
                UPDATE employees
                SET
                    emp_code = ?,
                    name = ?,
                    email = ?,
                    phone = ?,
                    department_id = ?,
                    designation = ?,
                    salary = ?,
                    join_date = ?
                WHERE id = ?
            `,
      ).run(
        emp_code,
        name,
        email,
        phone || null,
        department_id,
        designation,
        salary,
        join_date,
        employeeId,
      );

      const updatedEmployee = db
        .prepare(
          `
                SELECT
                    employees.id,
                    employees.emp_code,
                    employees.name,
                    employees.email,
                    employees.phone,
                    departments.name AS department,
                    employees.designation,
                    employees.salary,
                    employees.join_date,
                    employees.status
                FROM employees
                JOIN departments
                    ON employees.department_id = departments.id
                WHERE employees.id = ?
            `,
        )
        .get(employeeId);

      res.json({
        message: "Employee updated successfully.",
        employee: updatedEmployee,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to update employee.",
      });
    }
  },
);
// Deactivate employee - HR Admin only
router.put(
  "/:id/deactivate",
  authenticateToken,
  authorizeRoles("HR Admin"),
  (req, res) => {
    try {
      const employeeId = req.params.id;

      const employee = db
        .prepare("SELECT id, status FROM employees WHERE id = ?")
        .get(employeeId);

      if (!employee) {
        return res.status(404).json({
          message: "Employee not found.",
        });
      }

      if (employee.status === "Inactive") {
        return res.status(400).json({
          message: "Employee is already inactive.",
        });
      }

      db.prepare(
        `
                UPDATE employees
                SET status = 'Inactive'
                WHERE id = ?
            `,
      ).run(employeeId);

      res.json({
        message: "Employee deactivated successfully.",
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Failed to deactivate employee.",
      });
    }
  },
);

module.exports = router;
