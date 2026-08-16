import { useQuery } from "@tanstack/react-query";
import { getUserFriends, getMyGroups } from "../lib/api";
import { Link, useParams, useNavigate } from "react-router";
import { UsersIcon, SearchIcon, ArrowLeftIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { useUnreadCounts } from "../hooks/useUnreadCounts";
import { useChatChannels } from "../hooks/useChatChannels";
import { useOnlinePresence } from "../hooks/useOnlinePresence";
import { formatChatTime } from "../lib/utils";
import FriendListItem from "./FriendListItem";

const ChatSidebar = () => {
  const { id: currentChatId } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: friends = [] } = useQuery({
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

  const friendIds = useMemo(() => friends.map((f) => f._id), [friends]);
  const { isOnline } = useOnlinePresence(friendIds);

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

  const filteredFriends = sortedFriends.filter((f) =>
    f.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = sortedGroups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isCurrentGroup = (groupId) => currentChatId === `group-${groupId}`;
  const isCurrentFriend = (friendId) => currentChatId === friendId;

  return (
    <div className="h-full flex flex-col bg-base-200 border-r border-base-300">
      <div className="p-3 border-b border-base-300 bg-base-100 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => navigate("/friends")}
            className="btn btn-ghost btn-sm btn-circle"
            title="Back to Friends"
          >
            <ArrowLeftIcon className="size-4" />
          </button>
          <div className="p-1.5 bg-primary text-primary-content rounded-lg">
            <UsersIcon className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm">Chats</h2>
            <p className="text-xs opacity-60">
              {friends.length + groups.length} • {totalUnread} unread
            </p>
          </div>
        </div>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-50" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-bordered input-sm w-full pl-9 bg-base-200"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {friends.length + groups.length === 0 ? (
          <div className="p-6 text-center opacity-60 text-sm">No chats yet</div>
        ) : (
          <>
            {filteredGroups.length > 0 && (
              <>
                <p className="text-xs uppercase opacity-50 font-semibold px-3 pt-3 pb-1">
                  Groups
                </p>
                {filteredGroups.map((group) => {
                  const groupChannelId = group.streamChannelId;
                  const unread = channelUnreadMap[groupChannelId] || 0;
                  const groupMeta = channelsByGroupId[groupChannelId];
                  const hasUnread = unread > 0;
                  const time = groupMeta?.lastMessageAt
                    ? formatChatTime(groupMeta.lastMessageAt)
                    : "";

                  return (
                    <Link
                      key={group._id}
                      to={`/chat/group-${group._id}`}
                      className={`flex items-center gap-3 p-3 hover:bg-base-300 transition-colors border-b border-base-300 ${
                        isCurrentGroup(group._id) ? "bg-base-300" : ""
                      }`}
                    >
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 ring-2 ring-secondary/20 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {group.avatar ? (
                          <img
                            src={group.avatar}
                            alt={group.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UsersIcon className="size-5 opacity-60" />
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
                    isActive={isCurrentFriend(friend._id)}
                    unreadCount={channelUnreadMap[friend._id] || 0}
                    lastMessage={channelsByUserId[friend._id]}
                    isOnlineLive={isOnline(friend._id)}
                  />
                ))}
              </>
            )}

            {filteredFriends.length === 0 && filteredGroups.length === 0 && (
              <div className="p-6 text-center opacity-60 text-sm">
                No chats match "{searchQuery}"
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;