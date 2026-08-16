import { StreamChat } from "stream-chat";
import { getStreamToken } from "./api";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

// Use getInstance so all files share ONE client
const client = StreamChat.getInstance(STREAM_API_KEY);

let connectPromise = null;
let currentUserId = null;

const getSafeImageForStream = (imageUrl) => {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("data:")) return "";
  return imageUrl;
};

export const getStreamClient = () => client;

export const connectStreamUser = async (authUser) => {
  if (!authUser?._id) throw new Error("authUser is required");

  // Already connected as this user
  if (client.userID === authUser._id && client.wsConnection?.isHealthy) {
    return client;
  }

  // Already connected as same user (even if wsConnection check fails)
  if (client.userID === authUser._id) {
    return client;
  }

  // A connect is in progress — wait for it
  if (connectPromise) {
    try { await connectPromise; } catch {}
    if (client.userID === authUser._id) return client;
  }

  connectPromise = (async () => {
    // Disconnect previous user if different
    if (client.userID && client.userID !== authUser._id) {
      console.log(`🔄 Disconnecting user ${client.userID} to connect ${authUser._id}`);
      try {
        await client.disconnectUser();
      } catch (e) {
        console.warn("disconnect failed:", e.message);
      }
    }

    const { token } = await getStreamToken();

    await client.connectUser(
      {
        id: authUser._id,
        name: authUser.fullName,
        image: getSafeImageForStream(authUser.profilePic),
      },
      token
    );

    currentUserId = authUser._id;
    console.log(`✅ Stream connected as ${authUser._id}`);
    return client;
  })();

  try {
    return await connectPromise;
  } finally {
    connectPromise = null;
  }
};

// Detect if this browser tab lost connection (another tab took over)
if (typeof window !== "undefined") {
  window.addEventListener("focus", () => {
    if (currentUserId && client.userID !== currentUserId) {
      console.warn("⚠️ Stream connection lost — another tab took over");
      // Force reconnect on focus if we lost the connection
      window.location.reload();
    }
  });
}