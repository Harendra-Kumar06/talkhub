import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import path from "path";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import statusRoutes from "./routes/status.route.js";
import groupRoutes from "./routes/group.route.js";
import callRoutes from "./routes/call.route.js";

import { connectDB } from "./lib/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

// 🚀 Gzip compression (60-80% smaller responses)
app.use(compression());

// ✅ CORS Configuration (works for both dev & production)
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

// ✅ Health check endpoint (REQUIRED for Render!)
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development"
  });
});

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/calls", callRoutes);

// ✅ Serve frontend in production (only if deployed together)
if (process.env.NODE_ENV === "production") {
  // 🚀 Cache static assets for 1 year (huge performance boost!)
  app.use(
    express.static(path.join(__dirname, "../frontend/dist"), {
      maxAge: "1y",
      etag: true,
      lastModified: true,
    })
  );

  // Serve index.html for all non-API routes (SPA support)
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// ✅ Global Error Handler (helpful for debugging)
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  connectDB();
});
