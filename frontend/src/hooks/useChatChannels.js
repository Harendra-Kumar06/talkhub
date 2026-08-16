import { useEffect, useState, useCallback } from "react";
import useAuthUser from "./useAuthUser";
import { connectStreamUser } from "../lib/streamClient";

/**
 * Fetches all Stream channels the user is in, sorted by last message time.
 * Returns:
 *   - channelsByUserId: { [otherUserId]: { lastMessageAt, lastMessageText, lastMessageBy } }
 *   - channelsByGroupId: { [streamChannelId]: { lastMessageAt, lastMessageText, lastMessageBy } }
 *   - isLoading
 */
export const useChatChannels = () => {
  const { authUser } = useAuthUser();
  const [channelsByUserId, setChannelsByUserId] = useState({});
  const [channelsByGroupId, setChannelsByGroupId] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const buildMaps = useCallback(
    (channels) => {
      const userMap = {};
      const groupMap = {};

      for (const ch of channels) {
        try {
          const members = Object.values(ch.state.members || {});
          const messages = ch.state.messages || [];
          const lastMsg = messages[messages.length - 1];

          const lastMessageAt = lastMsg?.created_at
            ? new Date(lastMsg.created_at).getTime()
            : ch.data?.last_message_at
            ? new Date(ch.data.last_message_at).getTime()
            : 0;

          let lastMessageText = "";
          let lastMessageBy = "";

          if (lastMsg) {
            const isMine = lastMsg.user?.id === authUser._id;
            lastMessageBy = isMine ? "You" : lastMsg.user?.name?.split(" ")[0] || "";

            if (lastMsg.text) {
              lastMessageText = lastMsg.text;
            } else if (lastMsg.attachments?.length > 0) {
              const att = lastMsg.attachments[0];
              if (att.type === "image") lastMessageText = "📷 Photo";
              else if (att.type === "video") lastMessageText = "🎥 Video";
              else if (att.type === "audio") lastMessageText = "🎵 Audio";
              else if (att.type === "file") lastMessageText = "📎 File";
              else lastMessageText = "📎 Attachment";
            } else if (lastMsg.call_system) {
              lastMessageText = "📞 Call";
            } else {
              lastMessageText = "Message";
            }
          }

          const meta = { lastMessageAt, lastMessageText, lastMessageBy };

          if (members.length === 2) {
            // 1-on-1 DM → key by other user's ID
            const otherMember = members.find(
              (m) => (m.user?.id || m.user_id) !== authUser._id
            );
            const otherUserId = otherMember?.user?.id || otherMember?.user_id;
            if (otherUserId) userMap[otherUserId] = meta;
          } else {
            // Group → key by channel ID
            groupMap[ch.id] = meta;
          }
        } catch (e) {
          console.warn("buildMaps failed for", ch.id, e);
        }
      }

      setChannelsByUserId(userMap);
      setChannelsByGroupId(groupMap);
    },
    [authUser?._id]
  );

  useEffect(() => {
    if (!authUser?._id) return;

    let isMounted = true;
    let client;
    let subs = [];

    const refresh = async () => {
      if (!isMounted || !client) return;
      const channels = Object.values(client.activeChannels || {});
      buildMaps(channels);
    };

    (async () => {
      try {
        client = await connectStreamUser(authUser);

        const channels = await client.queryChannels(
          { type: "messaging", members: { $in: [authUser._id] } },
          { last_message_at: -1 },
          { watch: true, state: true, limit: 100, message_limit: 1 }
        );

        if (!isMounted) return;
        buildMaps(channels);
        setIsLoading(false);

        subs = [
          client.on("message.new", refresh),
          client.on("message.updated", refresh),
          client.on("message.deleted", refresh),
          client.on("notification.message_new", async (event) => {
            if (event.channel_type && event.channel_id) {
              try {
                const newCh = client.channel(event.channel_type, event.channel_id);
                await newCh.watch();
              } catch (e) {
                console.warn("watch failed", e);
              }
            }
            await refresh();
          }),
          client.on("notification.added_to_channel", async (event) => {
            if (event.channel) {
              try {
                const newCh = client.channel(event.channel.type, event.channel.id);
                await newCh.watch();
              } catch (e) {
                console.warn(e);
              }
            }
            await refresh();
          }),
        ];
      } catch (error) {
        console.error("useChatChannels error:", error);
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
      subs.forEach((s) => s?.unsubscribe?.());
    };
  }, [authUser?._id, buildMaps]);

  return { channelsByUserId, channelsByGroupId, isLoading };
};

export default useChatChannels;