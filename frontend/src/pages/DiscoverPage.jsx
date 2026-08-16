import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import {
  SearchIcon,
  CompassIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
  ArrowLeftIcon,
  GlobeIcon,
  PlusIcon,
  MessageCircleIcon,
  UserMinusIcon,
  CheckIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getRecommendedUsers,
  getUserFriends,
  sendFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getOutgoingFriendReqs,
  getMyGroups,
} from "../lib/api";
import CreateGroupModal from "../components/CreateGroupModal";

const DiscoverPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getRecommendedUsers,
  });

  const { data: friends = [] } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  const { data: outgoing = [] } = useQuery({
    queryKey: ["outgoingFriendReqs"],
    queryFn: getOutgoingFriendReqs,
  });

  const { data: groupsData } = useQuery({
    queryKey: ["myGroups"],
    queryFn: getMyGroups,
  });
  const groups = groupsData?.groups || [];

  // Map: recipientId -> requestId (so we know which request to cancel)
  const outgoingMap = useMemo(() => {
    const map = new Map();
    outgoing.forEach((r) => map.set(r.recipient._id, r._id));
    return map;
  }, [outgoing]);

  const friendIds = useMemo(
    () => new Set(friends.map((f) => f._id)),
    [friends]
  );

  const { mutate: sendRequest, isPending: sending } = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
      toast.success("Friend request sent!");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed"),
  });

  const { mutate: cancelRequest, isPending: canceling } = useMutation({
    mutationFn: cancelFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
      toast.success("Friend request canceled");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to cancel"),
  });

  const { mutate: unfriend, isPending: removing } = useMutation({
    mutationFn: removeFriend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Friend removed");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to remove"),
  });

  // Combine recommended users + friends into one list for display
  const allDisplayUsers = useMemo(() => {
    const combined = [...users];
    friends.forEach((f) => {
      if (!combined.find((u) => u._id === f._id)) combined.push(f);
    });
    return combined;
  }, [users, friends]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return allDisplayUsers;
    const q = searchQuery.toLowerCase();
    return allDisplayUsers.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.country?.toLowerCase().includes(q) ||
        u.location?.toLowerCase().includes(q)
    );
  }, [searchQuery, allDisplayUsers]);

  const handleUnfriend = (userId, name) => {
    if (window.confirm(`Remove ${name} from your friends?`)) {
      unfriend(userId);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-circle btn-sm">
          <ArrowLeftIcon className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-md">
            <CompassIcon className="size-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Discover</h1>
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 opacity-50" />
        <input
          type="text"
          placeholder="Search users by name or country..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input input-bordered w-full pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
          >
            <XIcon className="size-5" />
          </button>
        )}
      </div>

      {/* PEOPLE */}
      <section>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <UsersIcon className="size-5 text-primary" />
          People
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="card bg-base-200 border border-base-300 p-6 text-center">
            <p className="text-sm opacity-70">
              {searchQuery
                ? `No people found matching "${searchQuery}"`
                : "No users found"}
            </p>
          </div>
        ) : (
          <div className="bg-base-200 rounded-2xl border border-base-300 overflow-hidden">
            {filteredUsers.map((user, idx) => {
              const isFriend = friendIds.has(user._id);
              const requestId = outgoingMap.get(user._id);
              const requested = !!requestId;

              return (
                <div
                  key={user._id}
                  className={`flex items-center gap-3 p-3 hover:bg-base-300/50 transition-colors ${
                    idx !== filteredUsers.length - 1 ? "border-b border-base-300" : ""
                  }`}
                >
                  <div className="avatar">
                    <div className="w-12 h-12 rounded-full ring-2 ring-primary/20 bg-base-100">
                      <img src={user.profilePic} alt={user.fullName} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{user.fullName}</h3>
                    {user.country && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs opacity-70">
                        <GlobeIcon className="size-3" />
                        <span>{user.country}</span>
                        {user.location && (
                          <span className="opacity-60"> • {user.location}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {isFriend ? (
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/chat/${user._id}`}
                        className="btn btn-sm btn-primary gap-1"
                        title="Message"
                      >
                        <MessageCircleIcon className="size-4" />
                        <span className="hidden sm:inline">Message</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleUnfriend(user._id, user.fullName)}
                        disabled={removing}
                        className="btn btn-sm btn-error btn-outline gap-1"
                        title="Remove friend"
                      >
                        <UserMinusIcon className="size-4" />
                      </button>
                    </div>
                  ) : requested ? (
                    <button
                      type="button"
                      onClick={() => cancelRequest(requestId)}
                      disabled={canceling}
                      className="btn btn-sm btn-outline btn-warning gap-1"
                      title="Cancel request"
                    >
                      <XIcon className="size-4" />
                      Cancel
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => sendRequest(user._id)}
                      disabled={sending}
                      className="btn btn-sm btn-primary gap-1"
                    >
                      <UserPlusIcon className="size-4" />
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MY GROUPS */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UsersIcon className="size-5 text-secondary" />
            My Groups ({groups.length})
          </h2>
          <button
            onClick={() => setShowCreateGroup(true)}
            disabled={friends.length === 0}
            className="btn btn-sm btn-primary gap-1 bg-gradient-to-r from-primary to-secondary border-none"
          >
            <PlusIcon className="size-4" />
            New Group
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="card bg-base-200 border border-base-300 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-3">
              <UsersIcon className="size-8 text-secondary" />
            </div>
            <p className="text-sm opacity-70 mb-2">
              {friends.length === 0
                ? "Add friends first to create groups"
                : "No groups yet"}
            </p>
            {friends.length > 0 && (
              <button
                onClick={() => setShowCreateGroup(true)}
                className="btn btn-primary btn-sm mt-2 gap-1 mx-auto"
              >
                <PlusIcon className="size-4" />
                Create your first group
              </button>
            )}
          </div>
        ) : (
          <div className="bg-base-200 rounded-2xl border border-base-300 overflow-hidden">
            {groups.map((group, idx) => (
              <Link
                key={group._id}
                to={`/chat/group-${group._id}`}
                className={`flex items-center gap-3 p-3 hover:bg-base-300/50 transition-colors ${
                  idx !== groups.length - 1 ? "border-b border-base-300" : ""
                }`}
              >
                <div className="avatar">
                  <div className="w-12 h-12 rounded-full ring-2 ring-secondary/20 bg-base-100 flex items-center justify-center overflow-hidden">
                    {group.avatar ? (
                      <img src={group.avatar} alt={group.name} />
                    ) : (
                      <UsersIcon className="size-6 opacity-40" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{group.name}</h3>
                  <p className="text-xs opacity-60">
                    {group.members.length} members
                    {group.creator?._id && ` • by ${group.creator.fullName}`}
                  </p>
                </div>
                <MessageCircleIcon className="size-4 opacity-40" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />
    </div>
  );
};

export default DiscoverPage;