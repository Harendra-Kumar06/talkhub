import { Link } from "react-router";
import { formatChatTime } from "../lib/utils";
import { useState } from "react";
import ImageViewer from "./ImageViewer";

const FriendListItem = ({
  friend,
  isActive,
  unreadCount = 0,
  lastMessage,
  isOnlineLive, // 🟢 real-time online status from Stream
}) => {
  const [imageError, setImageError] = useState(false);
  const [showImage, setShowImage] = useState(false);

  const getInitials = (name) => {
    return name
      ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "??";
  };

  // Use live status if provided, else fall back to DB field
  const online = isOnlineLive ?? friend.isOnline;

  const hasUnread = unreadCount > 0;
  const preview = lastMessage?.lastMessageText || "";
  const previewBy = lastMessage?.lastMessageBy || "";
  const time = lastMessage?.lastMessageAt
    ? formatChatTime(lastMessage.lastMessageAt)
    : "";

  return (
    <>
      <div
        className={`flex items-center gap-3 p-3 hover:bg-base-300 transition-colors border-b border-base-300 ${
          isActive ? "bg-base-300" : ""
        }`}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (friend.profilePic) setShowImage(true);
          }}
          className="relative flex-shrink-0 group"
          title="View profile picture"
        >
          <div className="avatar">
            <div className="w-12 h-12 rounded-full bg-base-100 overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all">
              {!imageError && friend.profilePic ? (
                <img
                  src={friend.profilePic}
                  alt={friend.fullName}
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-bold text-sm">
                  {getInitials(friend.fullName)}
                </div>
              )}
            </div>
          </div>
          {online && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-base-200 animate-pulse" />
          )}
        </button>

        <Link
          to={`/chat/${friend._id}`}
          className="flex-1 min-w-0 cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <h3
              className={`text-sm truncate ${
                hasUnread ? "font-bold" : "font-semibold"
              }`}
            >
              {friend.fullName}
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
            {preview ? (
              <p
                className={`text-xs truncate ${
                  hasUnread ? "opacity-90 font-medium" : "opacity-60"
                }`}
              >
                {previewBy && <span className="opacity-70">{previewBy}: </span>}
                {preview}
              </p>
            ) : (
              <p className={`text-xs italic ${online ? "text-green-500" : "opacity-50"}`}>
                {online ? "Online" : "Tap to chat"}
              </p>
            )}
            {hasUnread && (
              <span className="badge badge-error badge-sm flex-shrink-0 min-w-[1.5rem]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        </Link>
      </div>

      <ImageViewer
        imageUrl={friend.profilePic}
        userName={friend.fullName}
        isOpen={showImage}
        onClose={() => setShowImage(false)}
      />
    </>
  );
};

export default FriendListItem;