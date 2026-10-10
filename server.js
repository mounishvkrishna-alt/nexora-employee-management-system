require("dotenv").config({
  path: require("path").join(__dirname, ".env"),
});
const express = require("express");
const cors = require("cors");

const db = require("./database/database");
const authRoutes = require("./routes/auth");
const authenticateToken = require("./middleware/authmiddleware");
const authorizeRoles = require("./middleware/rolemiddleware");
const employeeRoutes = require("./routes/employees");
const departmentRoutes = require("./routes/departments");
const meRoutes = require("./routes/me");
const dashboardRoutes = require("./routes/dashboard");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/me", meRoutes);
app.use("/api/dashboard", dashboardRoutes);
// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Employee Management API is running!",
  });
});

app.get("/api/test-protected", authenticateToken, (req, res) => {
  res.json({
    message: "Protected route accessed successfully.",
    user: req.user,
  });
});
app.get(
  "/api/test-hr",
  authenticateToken,
  authorizeRoles("HR Admin"),
  (req, res) => {
    res.json({
      message: "HR-only route accessed successfully!",
      user: req.user,
    });
  },
);

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
