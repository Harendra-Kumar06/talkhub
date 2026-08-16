import express from "express";
import multer from "multer";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getStreamToken,
  uploadFile,
  hideMessage,
  getHiddenMessages,
} from "../controllers/chat.controller.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.get("/token", protectRoute, getStreamToken);
router.post("/upload", protectRoute, upload.single("file"), uploadFile);

// Hidden messages ("Delete for me")
router.post("/hide-message", protectRoute, hideMessage);
router.get("/hidden-messages/:channelId", protectRoute, getHiddenMessages);

export default router;