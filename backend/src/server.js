import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import compression from "compression";
import path from "path";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import statusRoutes from "./routes/status.route.js";
import groupRoutes from "./routes/group.route.js";
import callRoutes from "./routes/call.route.js";

import { connectDB } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT;

const __dirname = path.resolve();

// 🚀 Gzip compression (60-80% smaller responses)
app.use(compression());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/calls", callRoutes);

if (process.env.NODE_ENV === "production") {
  // 🚀 Cache static assets for 1 year
  app.use(express.static(path.join(__dirname, "../frontend/dist"), {
    maxAge: "1y",
    etag: true,
  }));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});