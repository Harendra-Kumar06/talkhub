import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import compression from "compression";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import statusRoutes from "./routes/status.route.js";
import groupRoutes from "./routes/group.route.js";
import callRoutes from "./routes/call.route.js";

import { connectDB } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT || 5001;

// 🚀 Gzip compression
app.use(compression());

// ✅ CORS Configuration
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" 
      ? process.env.CLIENT_URL 
      : "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(cookieParser());

// ✅ Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    clientUrl: process.env.CLIENT_URL || "not set"
  });
});

// ✅ Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "TalkHub API is running! 🚀",
    frontend: process.env.CLIENT_URL,
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      users: "/api/users",
      chat: "/api/chat",
      groups: "/api/groups",
      calls: "/api/calls",
      status: "/api/status"
    }
  });
});

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/calls", callRoutes);

// ✅ 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    message: "Route not found",
    method: req.method,
    path: req.originalUrl
  });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  console.log(`✅ CORS enabled for: ${process.env.CLIENT_URL || "http://localhost:5173"}`);
  connectDB();
});
