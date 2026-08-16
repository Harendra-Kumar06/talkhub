import { useQuery } from "@tanstack/react-query";
import { getUserFriends, getMyGroups } from "../lib/api";
import NoFriendsFound from "../components/NoFriendsFound";
import FriendListItem from "../components/FriendListItem";
import { UsersIcon, SearchIcon, MessageCircleIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { useUnreadCounts } from "../hooks/useUnreadCounts";
import { useChatChannels } from "../hooks/useChatChannels";
import { useOnlinePresence } from "../hooks/useOnlinePresence";
import { formatChatTime } from "../lib/utils";
import { Link } from "react-router";

const FriendsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  const { data: groupsData } = useQuery({
    queryKey: ["myGroups"],
    queryFn: getMyGroups,
  });
  const groups = groupsData?.groups || [];

  const { totalUnread, channelUnreadMap } = useUnreadCounts();
  const { channelsByUserId, channelsByGroupId } = useChatChannels();

  // 🟢 Real-time online presence
  const friendIds = useMemo(() => friends.map((f) => f._id), [friends]);
  const { isOnline } = useOnlinePresence(friendIds);

  // Sort by last message time
  const sortedFriends = useMemo(() => {
    const arr = [...friends];
    arr.sort((a, b) => {
      const aTime = channelsByUserId[a._id]?.lastMessageAt || 0;
      const bTime = channelsByUserId[b._id]?.lastMessageAt || 0;
      return bTime - aTime;
    });
    return arr;
  }, [friends, channelsByUserId]);

  const sortedGroups = useMemo(() => {
    const arr = [...groups];
    arr.sort((a, b) => {
      const aTime = channelsByGroupId[a.streamChannelId]?.lastMessageAt || 0;
      const bTime = channelsByGroupId[b.streamChannelId]?.lastMessageAt || 0;
      return bTime - aTime;
    });
    return arr;
  }, [groups, channelsByGroupId]);

  const filteredFriends = sortedFriends.filter((friend) =>
    friend.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = sortedGroups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalChats = friends.length + groups.length;

  return (
    <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] -m-4 sm:-m-6 lg:-m-8 bg-base-100">
      <div className="w-full lg:w-96 border-r border-base-300 flex flex-col bg-base-200">
        <div className="p-4 border-b border-base-300 bg-base-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary text-primary-content rounded-xl shadow-md">
              <UsersIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">My Chats</h1>
              <p className="text-xs opacity-70">
                {totalChats} {totalChats === 1 ? "chat" : "chats"} • {totalUnread} unread
              </p>
            </div>
          </div>
          {totalChats > 0 && (
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-50" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input input-bordered input-sm w-full pl-10 bg-base-200"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : totalChats === 0 ? (
            <div className="p-6">
              <NoFriendsFound />
            </div>
          ) : (
            <>
              {filteredGroups.length > 0 && (
                <>
                  <p className="text-xs uppercase opacity-50 font-semibold px-3 pt-3 pb-1">
                    Groups
                  </p>
                  {filteredGroups.map((group) => {
                    const unread = channelUnreadMap[group.streamChannelId] || 0;
                    const groupMeta = channelsByGroupId[group.streamChannelId];
                    const hasUnread = unread > 0;
                    const time = groupMeta?.lastMessageAt
                      ? formatChatTime(groupMeta.lastMessageAt)
                      : "";

                    return (
                      <Link
                        key={group._id}
                        to={`/chat/group-${group._id}`}
                        className="flex items-center gap-3 p-3 hover:bg-base-300 transition-colors border-b border-base-300"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 ring-2 ring-secondary/20 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {group.avatar ? (
                            <img
                              src={group.avatar}
                              alt={group.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UsersIcon className="size-6 opacity-60" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3
                              className={`text-sm truncate ${
                                hasUnread ? "font-bold" : "font-semibold"
                              }`}
                            >
                              {group.name}
                            </h3>
                            {time && (
                              <span
                                className={`text-xs flex-shrink-0 ${
                                  hasUnread ? "text-primary font-semibold" : "opacity-50"
                                }`}
                              >
                                {time}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            {groupMeta?.lastMessageText ? (
                              <p
                                className={`text-xs truncate ${
                                  hasUnread ? "opacity-90 font-medium" : "opacity-60"
                                }`}
                              >
                                {groupMeta.lastMessageBy && (
                                  <span className="opacity-70">
                                    {groupMeta.lastMessageBy}:{" "}
                                  </span>
                                )}
                                {groupMeta.lastMessageText}
                              </p>
                            ) : (
                              <p className="text-xs opacity-50">
                                {group.members.length} members
                              </p>
                            )}
                            {hasUnread && (
                              <span className="badge badge-error badge-sm flex-shrink-0 min-w-[1.5rem]">
                                {unread > 99 ? "99+" : unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </>
              )}

              {filteredFriends.length > 0 && (
                <>
                  <p className="text-xs uppercase opacity-50 font-semibold px-3 pt-3 pb-1">
                    Direct Messages
                  </p>
                  {filteredFriends.map((friend) => (
                    <FriendListItem
                      key={friend._id}
                      friend={friend}
                      unreadCount={channelUnreadMap[friend._id] || 0}
                      lastMessage={channelsByUserId[friend._id]}
                      isOnlineLive={isOnline(friend._id)}
                    />
                  ))}
                </>
              )}

              {filteredFriends.length === 0 && filteredGroups.length === 0 && (
                <div className="text-center py-10 px-4">
                  <p className="text-sm opacity-70">No chats match "{searchQuery}"</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-base-200 to-base-300">
        <div className="text-center space-y-4 max-w-md p-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto">
            <MessageCircleIcon className="size-12 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Select a chat</h2>
            <p className="text-sm opacity-70">
              Choose a friend or group from the list to start chatting
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;