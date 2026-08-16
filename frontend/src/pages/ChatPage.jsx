import "stream-chat-react/dist/css/v2/index.css";
import { useEffect, useState, useRef, useCallback, lazy } from "react";
import { useNavigate, useParams } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserById, getGroupById, removeFriend } from "../lib/api";
import { connectStreamUser } from "../lib/streamClient";

import {
  Channel,
  Chat,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import toast from "react-hot-toast";

import ChatLoader from "../components/ChatLoader";
import UserDetailsModal from "../components/UserDetailsModal";
import ChatSidebar from "../components/ChatSidebar";
import { ArrowLeftIcon, VideoIcon, UsersIcon, InfoIcon } from "lucide-react";
import { formatLastSeen } from "../lib/utils";
import { useOnlinePresence } from "../hooks/useOnlinePresence";

// 🚀 Lazy load emoji picker - only downloads when user opens emoji panel
const LazyEmojiPicker = lazy(async () => {
  const [emojiMod, emojiMart, emojiData] = await Promise.all([
    import("stream-chat-react/emojis"),
    import("emoji-mart"),
    import("@emoji-mart/data"),
  ]);
  emojiMart.init({ data: emojiData.default });
  return { default: emojiMod.EmojiPicker };
});

const SIDEBAR_KEY = "talkhub-sidebar-width";
const DEFAULT_WIDTH = 340;
const MIN_WIDTH = 260;
const MAX_WIDTH = 500;

const CUSTOM_MESSAGE_ACTIONS = ["react", "quote", "edit", "delete"];

const ChatPage = () => {
  const { id: rawId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const isGroupChat = rawId?.startsWith("group-");
  const groupId = isGroupChat ? rawId.replace("group-", "") : null;
  const targetUserId = !isGroupChat ? rawId : null;

  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [startingCall, setStartingCall] = useState(false);

  // ✅ NEW: Real-time online status from Stream Chat WebSocket
  const { isOnline: checkOnline } = useOnlinePresence(
    targetUserId ? [targetUserId] : []
  );
  const isFriendOnline = targetUserId ? checkOnline(targetUserId) : false;

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_KEY);
      return saved ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Number(saved))) : DEFAULT_WIDTH;
    } catch {
      return DEFAULT_WIDTH;
    }
  });
  const [isResizing, setIsResizing] = useState(false);

  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  const containerRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { data: friendDetails } = useQuery({
    queryKey: ["userDetails", targetUserId],
    queryFn: () => getUserById(targetUserId),
    enabled: !!targetUserId,
  });

  const { data: groupData } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroupById(groupId),
    enabled: !!groupId,
  });
  const group = groupData?.group;

  const { mutate: unfriend } = useMutation({
    mutationFn: removeFriend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Friend removed");
      setShowDetails(false);
      navigate("/friends");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to remove"),
  });

  useEffect(() => {
    const initChat = async () => {
      if (!authUser) return;

      try {
        const client = await connectStreamUser(authUser);
        let currChannel;

        if (isGroupChat && group) {
          currChannel = client.channel("messaging", group.streamChannelId);
          await currChannel.watch();
        } else if (targetUserId) {
          const channelId = [authUser._id, targetUserId].sort().join("-");
          currChannel = client.channel("messaging", channelId, {
            members: [authUser._id, targetUserId],
          });
          await currChannel.watch();
        }

        setChatClient(client);
        setChannel(currChannel);
      } catch (error) {
        console.error("Error initializing chat:", error);
        toast.error("Could not connect to chat. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (isGroupChat && !group) return;
    initChat();
  }, [authUser, targetUserId, isGroupChat, group]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, e.clientX - rect.left));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      try {
        localStorage.setItem(SIDEBAR_KEY, String(sidebarWidth));
      } catch {}
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, sidebarWidth]);

  const handleVideoCall = async () => {
    if (startingCall) return;

    try {
      setStartingCall(true);
      const api = await import("../lib/api");

      if (isGroupChat) {
        if (!group) return toast.error("Group info not loaded");

        const data = await api.initiateGroupCall({
          groupId: group._id,
          type: "video",
        });
        const c = data.call;

        if (data.alreadyActive) {
          toast("Joining ongoing group call", { icon: "📞" });
        }

        navigate(`/call/${c.callId}`);
      } else {
        if (!targetUserId || !friendDetails)
          return toast.error("Friend info not loaded");

        const { call } = await api.initiateCall({
          recipientId: targetUserId,
          type: "video",
        });

        window.__startOutgoingCall?.({
          callId: call.callId,
          type: call.type,
          recipient: {
            _id: friendDetails._id,
            fullName: friendDetails.fullName,
            profilePic: friendDetails.profilePic,
          },
        });
      }
    } catch (err) {
      console.error("Call error:", err);
      toast.error(err.response?.data?.message || "Could not start call");
    } finally {
      setStartingCall(false);
    }
  };

  const handleGroupInfo = () => {
    if (group) navigate(`/groups/${group._id}`);
  };

  const handleRemoveFriend = () => {
    if (!friendDetails) return;
    if (window.confirm(`Remove ${friendDetails.fullName} from your friends?`)) {
      unfriend(friendDetails._id);
    }
  };

  if (loading || !chatClient || !channel) return <ChatLoader />;

  const chatHeader = (
    <div className="flex items-center justify-between p-3 bg-base-200 border-b border-base-300 shadow-sm flex-shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={() => navigate("/friends")}
          className="btn btn-ghost btn-circle btn-sm lg:hidden"
          title="Back"
        >
          <ArrowLeftIcon className="size-5" />
        </button>

        {isGroupChat && group ? (
          <button
            onClick={handleGroupInfo}
            className="flex items-center gap-3 flex-1 min-w-0 hover:bg-base-300 rounded-xl p-1.5 -m-1.5 transition-colors text-left"
            title="Group info"
          >
            <div className="avatar">
              <div className="w-10 h-10 rounded-full ring-2 ring-primary/30 bg-base-100 overflow-hidden flex items-center justify-center">
                {group.avatar ? (
                  <img src={group.avatar} alt={group.name} loading="lazy" />
                ) : (
                  <UsersIcon className="size-5 opacity-60" />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{group.name}</h3>
              <p className="text-xs opacity-70 truncate">
                {group.members.length} members
              </p>
            </div>
          </button>
        ) : (
          friendDetails && (
            <button
              onClick={() => setShowDetails(true)}
              className="flex items-center gap-3 flex-1 min-w-0 hover:bg-base-300 rounded-xl p-1.5 -m-1.5 transition-colors text-left"
              title="View profile"
            >
              <div className="avatar">
                <div className="w-10 h-10 rounded-full ring-2 ring-primary/30">
                  {friendDetails.profilePic ? (
                    <img src={friendDetails.profilePic} alt={friendDetails.fullName} loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold">
                      {friendDetails.fullName?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {friendDetails.fullName}
                </h3>
                {/* ✅ FIXED: Now uses real-time isFriendOnline instead of stale friendDetails.isOnline */}
                <p className="text-xs truncate flex items-center gap-1">
                  {isFriendOnline ? (
                    <>
                      <span className="size-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-green-500 font-medium">Online</span>
                    </>
                  ) : (
                    <span className="opacity-60">
                      last seen {formatLastSeen(friendDetails.lastSeen)}
                    </span>
                  )}
                </p>
              </div>
            </button>
          )
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={handleVideoCall}
          disabled={startingCall}
          className="btn btn-sm gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-none shadow-md"
          title={isGroupChat ? "Start Group Video Call" : "Start Video Call"}
        >
          {startingCall ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <VideoIcon className="size-4" />
          )}
          <span className="hidden sm:inline">Call</span>
        </button>

        {isGroupChat && (
          <button
            onClick={handleGroupInfo}
            className="btn btn-ghost btn-circle btn-sm"
            title="Group Info"
          >
            <InfoIcon className="size-5" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="h-screen flex" ref={containerRef}>
        {isDesktop && (
          <>
            <div
              className="flex-shrink-0 overflow-hidden"
              style={{ width: `${sidebarWidth}px` }}
            >
              <ChatSidebar />
            </div>

            <div
              onMouseDown={handleMouseDown}
              className={`w-1.5 flex-shrink-0 cursor-col-resize transition-colors group relative ${
                isResizing ? "bg-primary/50" : "bg-base-300 hover:bg-primary/30"
              }`}
            >
              <div
                className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-1 h-8 rounded-full transition-colors ${
                  isResizing ? "bg-primary" : "bg-base-content/20 group-hover:bg-primary/50"
                }`}
              />
            </div>
          </>
        )}

        <div className="flex-1 min-w-0 overflow-hidden flex flex-col bg-base-100">
          {chatHeader}
          <div className="flex-1 overflow-hidden chat-messages-container">
            <Chat client={chatClient}>
              <Channel channel={channel} EmojiPicker={LazyEmojiPicker}>
                <Window>
                  <MessageList
                    messageActions={CUSTOM_MESSAGE_ACTIONS}
                    disableQuotedMessages={false}
                  />
                  <MessageInput focus />
                </Window>
                <Thread />
              </Channel>
            </Chat>
          </div>
        </div>
      </div>

      <UserDetailsModal
        user={friendDetails}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        onVideoCall={handleVideoCall}
        onRemoveFriend={handleRemoveFriend}
        showRemoveFriend={!!friendDetails && !isGroupChat}
        isOnline={isFriendOnline}
      />
    </>
  );
};

export default ChatPage;