const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "employee_management.db");

const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        emp_code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        department_id INTEGER NOT NULL,
        designation TEXT NOT NULL,
        salary REAL NOT NULL DEFAULT 0,
        join_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active'
            CHECK(status IN ('Active', 'Inactive')),

        FOREIGN KEY (department_id)
            REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL
            CHECK(role IN ('HR Admin', 'Manager', 'Employee')),

        FOREIGN KEY (employee_id)
            REFERENCES employees(id)
            ON DELETE SET NULL
    );
`);

console.log("Database connected successfully.");
console.log("Tables checked/created successfully.");

module.exports = db;
