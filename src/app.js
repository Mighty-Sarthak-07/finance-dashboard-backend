require("dotenv").config();
const express = require("express");
const cors = require("cors");
const logger = require("./middleware/logger");
const prisma = require("./prisma");

const authRoutes = require("./routes/auth");
const recordRoutes = require("./routes/records");
const dashboardRoutes = require("./routes/dashboard");
const userRoutes = require("./routes/users");
const auditRoutes = require("./routes/audit");

const app = express();

app.use(cors());
app.use(express.json());
app.use(logger);

// Health check
app.get("/health", async (req, res) => {
  const start = Date.now();
  let dbStatus = "connected";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "disconnected";
  }
  const uptimeSeconds = process.uptime();
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);

  res.json({
    status: "ok",
    db: dbStatus,
    uptime: `${hours}h ${minutes}m ${seconds}s`,
    responseTime: `${Date.now() - start}ms`,
    memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Finance Backend API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/audit-logs", auditRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
});

module.exports = app;