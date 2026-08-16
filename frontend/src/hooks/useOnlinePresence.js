import { useEffect, useState, useCallback } from "react";
import useAuthUser from "./useAuthUser";
import { connectStreamUser } from "../lib/streamClient";

/**
 * Real-time online presence tracker using Stream Chat's WebSocket.
 *
 * Returns:
 *   onlineUserIds: Set<string>  — user IDs currently online
 *   isOnline: (userId) => boolean
 */
export const useOnlinePresence = (friendIds = []) => {
  const { authUser } = useAuthUser();
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());

  // Stable key so useEffect doesn't loop
  const friendIdsKey = friendIds.slice().sort().join(",");

  const markOnline = useCallback((userId) => {
    setOnlineUserIds((prev) => {
      if (prev.has(userId)) return prev;
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
  }, []);

  const markOffline = useCallback((userId) => {
    setOnlineUserIds((prev) => {
      if (!prev.has(userId)) return prev;
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!authUser?._id || !friendIdsKey) return;

    let cancelled = false;
    let client;
    let subs = [];

    (async () => {
      try {
        client = await connectStreamUser(authUser);
        if (cancelled) return;

        const ids = friendIdsKey.split(",").filter(Boolean);
        if (ids.length === 0) return;

        // Fetch initial presence for all friends
        const response = await client.queryUsers(
          { id: { $in: ids } },
          { last_active: -1 },
          { presence: true, limit: 100 }
        );

        if (cancelled) return;

        const initialOnline = new Set();
        response.users.forEach((u) => {
          if (u.online) initialOnline.add(u.id);
        });
        setOnlineUserIds(initialOnline);

        // Subscribe to real-time presence changes
        subs.push(
          client.on("user.presence.changed", (event) => {
            const uid = event.user?.id;
            if (!uid) return;
            if (event.user.online) {
              markOnline(uid);
            } else {
              markOffline(uid);
            }
          })
        );

        // Also listen to connection changes
        subs.push(
          client.on("user.watching.start", (event) => {
            const uid = event.user?.id;
            if (uid && event.user.online) markOnline(uid);
          })
        );

        subs.push(
          client.on("user.watching.stop", (event) => {
            const uid = event.user?.id;
            if (uid) markOffline(uid);
          })
        );
      } catch (e) {
        console.error("useOnlinePresence error:", e);
      }
    })();

    return () => {
      cancelled = true;
      subs.forEach((s) => s?.unsubscribe?.());
    };
  }, [authUser?._id, friendIdsKey, markOnline, markOffline]);

  const isOnline = useCallback(
    (userId) => onlineUserIds.has(userId),
    [onlineUserIds]
  );

  return { onlineUserIds, isOnline };
};

export default useOnlinePresence;