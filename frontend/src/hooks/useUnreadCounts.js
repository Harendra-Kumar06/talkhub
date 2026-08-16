import { useEffect, useState } from "react";
import useAuthUser from "./useAuthUser";
import { connectStreamUser } from "../lib/streamClient";

export const useUnreadCounts = () => {
  const { authUser } = useAuthUser();
  const [channelUnreadMap, setChannelUnreadMap] = useState({});
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!authUser?._id) return;

    let isMounted = true;
    let client;
    let subscriptions = [];

    const updateCounts = async () => {
      if (!isMounted || !client) return;

      const map = {};
      let total = 0;

      // ✅ Get ALL channels (DMs + groups) the user is in
      const allChannels = Object.values(client.activeChannels || {});

      for (const ch of allChannels) {
        try {
          const unread = ch.countUnread();
          if (unread > 0) total += unread;

          // For DM channels, map by other user's ID
          const members = Object.values(ch.state.members || {});
          const otherMember = members.find(
            (m) => (m.user?.id || m.user_id) !== authUser._id
          );
          const otherUserId = otherMember?.user?.id || otherMember?.user_id;

          if (otherUserId && members.length === 2) {
            // 1-on-1 chat
            map[otherUserId] = unread;
          } else {
            // Group chat — map by channel id
            map[ch.id] = unread;
          }
        } catch (e) {
          console.warn("countUnread failed for channel", ch.id, e);
        }
      }

      setChannelUnreadMap(map);
      setTotalUnread(total);
    };

    const init = async () => {
      try {
        client = await connectStreamUser(authUser);

        // ✅ Query ALL channels the user is a member of (DMs + groups)
        await client.queryChannels(
          {
            type: "messaging",
            members: { $in: [authUser._id] },
          },
          { last_message_at: -1 },
          { watch: true, state: true, limit: 100 }
        );

        await updateCounts();

        // ✅ Listen to all message events (including notifications for channels not yet loaded)
        subscriptions = [
          client.on("message.new", updateCounts),
          client.on("message.read", updateCounts),
          client.on("notification.message_new", async (event) => {
            // New message in a channel we may not have loaded yet
            if (event.channel_type && event.channel_id) {
              try {
                const newCh = client.channel(event.channel_type, event.channel_id);
                await newCh.watch();
              } catch (e) {
                console.warn("Failed to watch new channel", e);
              }
            }
            await updateCounts();
          }),
          client.on("notification.mark_read", updateCounts),
          client.on("notification.added_to_channel", async (event) => {
            // Added to a new group
            if (event.channel) {
              try {
                const newCh = client.channel(
                  event.channel.type,
                  event.channel.id
                );
                await newCh.watch();
              } catch (e) {
                console.warn(e);
              }
            }
            await updateCounts();
          }),
        ];
      } catch (error) {
        console.error("Error in useUnreadCounts:", error);
      }
    };

    init();

    return () => {
      isMounted = false;
      subscriptions.forEach((sub) => sub?.unsubscribe?.());
    };
  }, [authUser?._id]);

  return { totalUnread, channelUnreadMap };
};