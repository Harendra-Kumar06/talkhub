import { StreamChat } from "stream-chat";
import { Readable } from "stream";
import "dotenv/config";

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error("Stream API key or Secret is missing");
}

const streamClient = StreamChat.getInstance(apiKey, apiSecret);

export const upsertStreamUser = async (userData) => {
  try {
    await streamClient.upsertUsers([userData]);
    return userData;
  } catch (error) {
    console.error("Error upserting Stream user:", error);
  }
};

export const generateStreamToken = (userId) => {
  try {
    const userIdStr = userId.toString();
    // Token with extended expiry — works for both Chat AND Video
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24h
    return streamClient.createToken(userIdStr, exp);
  } catch (error) {
    console.error("Error generating Stream token:", error);
  }
};

/**
 * Upload a file/image to Stream CDN
 * Uses a dedicated per-user upload channel
 * Returns the CDN URL string
 */
export const uploadFileToStream = async ({ fileBuffer, fileName, mimeType, userId }) => {
  const userIdStr = userId.toString();

  try {
    // Ensure user exists in Stream
    await streamClient.upsertUsers([{ id: userIdStr, name: "uploader" }]);

    // Create/reuse an upload channel for this user
    const channelId = `uploads-${userIdStr}`;
    const channel = streamClient.channel("messaging", channelId, {
      created_by_id: userIdStr,
      members: [userIdStr],
    });

    try {
      await channel.create();
    } catch (e) {
      // Channel might already exist — that's fine
    }

    // Convert Buffer to Readable Stream (Stream SDK needs this in Node)
    const readableStream = Readable.from(fileBuffer);

    const isImage = mimeType.startsWith("image/");

    let response;
    if (isImage) {
      response = await channel.sendImage(
        readableStream,
        fileName,
        mimeType,
        { id: userIdStr }
      );
    } else {
      response = await channel.sendFile(
        readableStream,
        fileName,
        mimeType,
        { id: userIdStr }
      );
    }

    if (!response || !response.file) {
      throw new Error("Stream did not return a file URL");
    }

    return response.file;
  } catch (error) {
    console.error("❌ Stream upload error:", error.message);
    console.error("Full error:", error);
    throw error;
  }
};

export { streamClient };