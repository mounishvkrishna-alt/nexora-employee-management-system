const bcrypt = require("bcryptjs");
const db = require("./database/database");

const hash = (password) => bcrypt.hashSync(password, 10);

// Departments
const insertDepartment = db.prepare(`
    INSERT OR IGNORE INTO departments (name)
    VALUES (?)
`);

insertDepartment.run("Engineering");
insertDepartment.run("Human Resources");
insertDepartment.run("Finance");
insertDepartment.run("Marketing");

// Get department IDs
const engineering = db
  .prepare("SELECT id FROM departments WHERE name = ?")
  .get("Engineering");

const hr = db
  .prepare("SELECT id FROM departments WHERE name = ?")
  .get("Human Resources");

// Employees
const insertEmployee = db.prepare(`
    INSERT OR IGNORE INTO employees
    (emp_code, name, email, phone, department_id, designation, salary, join_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertEmployee.run(
  "EMP001",
  "HR Administrator",
  "hr@company.com",
  "9000000001",
  hr.id,
  "HR Administrator",
  60000,
  "2026-01-10",
  "Active",
);

insertEmployee.run(
  "EMP002",
  "Engineering Manager",
  "manager@company.com",
  "9000000002",
  engineering.id,
  "Engineering Manager",
  85000,
  "2026-01-15",
  "Active",
);

insertEmployee.run(
  "EMP003",
  "Demo Employee",
  "employee@company.com",
  "9000000003",
  engineering.id,
  "Software Developer",
  50000,
  "2026-02-01",
  "Active",
);

// Get employee IDs
const hrEmployee = db
  .prepare("SELECT id FROM employees WHERE email = ?")
  .get("hr@company.com");

const managerEmployee = db
  .prepare("SELECT id FROM employees WHERE email = ?")
  .get("manager@company.com");

const employeeEmployee = db
  .prepare("SELECT id FROM employees WHERE email = ?")
  .get("employee@company.com");

// Users
const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users
    (employee_id, email, password_hash, role)
    VALUES (?, ?, ?, ?)
`);

insertUser.run(hrEmployee.id, "hr@company.com", hash("hr12345"), "HR Admin");

insertUser.run(
  managerEmployee.id,
  "manager@company.com",
  hash("manager123"),
  "Manager",
);

insertUser.run(
  employeeEmployee.id,
  "employee@company.com",
  hash("employee123"),
  "Employee",
);

console.log("Database seeded successfully!");
console.log("HR Admin  : hr@company.com / hr12345");
console.log("Manager   : manager@company.com / manager123");
console.log("Employee  : employee@company.com / employee123");
