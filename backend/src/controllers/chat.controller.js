import { generateStreamToken, uploadFileToStream } from "../lib/stream.js";
import HiddenMessage from "../models/HiddenMessage.js";

export async function getStreamToken(req, res) {
  try {
    const token = generateStreamToken(req.user.id);
    res.status(200).json({ token });
  } catch (error) {
    console.log("Error in getStreamToken controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const { buffer, originalname, mimetype, size } = req.file;

    console.log("📤 Upload request:", {
      user: req.user.id,
      name: originalname,
      type: mimetype,
      size: `${(size / 1024).toFixed(1)} KB`,
    });

    if (size > 20 * 1024 * 1024) {
      return res.status(400).json({ message: "File size must be less than 20MB" });
    }

    const url = await uploadFileToStream({
      fileBuffer: buffer,
      fileName: originalname,
      mimeType: mimetype,
      userId: req.user.id,
    });

    console.log("✅ Upload success:", url);

    res.status(200).json({
      success: true,
      url,
      fileName: originalname,
      mimeType: mimetype,
    });
  } catch (error) {
    console.error("❌ Upload controller error:", error.message);
    res.status(500).json({
      message: "File upload failed",
      error: error.message,
    });
  }
}

// ==================== HIDDEN MESSAGES ====================

/**
 * Hide a message for current user only ("Delete for me")
 * Body: { messageId, channelId }
 */
export async function hideMessage(req, res) {
  try {
    const { messageId, channelId } = req.body;
    if (!messageId || !channelId) {
      return res.status(400).json({ message: "messageId and channelId required" });
    }

    await HiddenMessage.findOneAndUpdate(
      { user: req.user._id, messageId },
      { user: req.user._id, messageId, channelId },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error hiding message:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Get all hidden message IDs for a channel
 */
export async function getHiddenMessages(req, res) {
  try {
    const { channelId } = req.params;
    const hidden = await HiddenMessage.find({
      user: req.user._id,
      channelId,
    }).select("messageId");
    res.status(200).json({ hidden: hidden.map((h) => h.messageId) });
  } catch (error) {
    console.error("Error getting hidden messages:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}