import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import {
  cancelFriendRequest,
  getOutgoingFriendReqs,
  getRecommendedUsers,
  getUserFriends,
  sendFriendRequest,
} from "../lib/api";
import { Link } from "react-router";
import {
  CheckCircleIcon,
  MapPinIcon,
  UserPlusIcon,
  UsersIcon,
  BellIcon,
  SparklesIcon,
  TrendingUpIcon,
  GlobeIcon,
  InfoIcon,
  XIcon,
  SearchIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import useAuthUser from "../hooks/useAuthUser";

const HomePage = () => {
  const queryClient = useQueryClient();
  const [outgoingRequestsMap, setOutgoingRequestsMap] = useState(new Map());
  const [expandedUser, setExpandedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { authUser } = useAuthUser();

  const { data: friends = [] } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  const { data: recommendedUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: getRecommendedUsers,
  });

  const { data: outgoingFriendReqs = [] } = useQuery({
    queryKey: ["outgoingFriendReqs"],
    queryFn: getOutgoingFriendReqs,
  });

  const { mutate: sendRequestMutation, isPending: isSending } = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
      toast.success("Friend request sent!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to send request");
    },
  });

  const { mutate: cancelRequestMutation, isPending: isCanceling } = useMutation({
    mutationFn: cancelFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
      toast.success("Friend request canceled");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to cancel request");
    },
  });

  useEffect(() => {
    const map = new Map();
    if (outgoingFriendReqs && outgoingFriendReqs.length > 0) {
      outgoingFriendReqs.forEach((req) => {
        map.set(req.recipient._id, req._id);
      });
      setOutgoingRequestsMap(map);
    }
  }, [outgoingFriendReqs]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return recommendedUsers;
    return recommendedUsers.filter(
      (user) =>
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, recommendedUsers]);

  const stats = [
    {
      title: "Total Friends",
      value: friends.length,
      icon: UsersIcon,
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Requests Sent",
      value: outgoingFriendReqs.length,
      icon: UserPlusIcon,
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Suggestions",
      value: recommendedUsers.length,
      icon: SparklesIcon,
      color: "from-pink-500 to-pink-600",
    },
    {
      title: "Country",
      value: authUser?.country ? "🌍" : "—",
      icon: GlobeIcon,
      color: "from-green-500 to-green-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* WELCOME BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent p-6 sm:p-8 text-primary-content shadow-xl">
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm opacity-90 mb-1">Welcome back 👋</p>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              {authUser?.fullName || "Friend"}!
            </h1>
            <p className="text-sm sm:text-base opacity-90 max-w-lg">
              Ready to chat? You have <span className="font-bold">{friends.length}</span> friends on TalkHub.
            </p>
          </div>

          {authUser?.profilePic && (
            <div className="avatar hidden sm:block">
              <div className="w-20 h-20 rounded-full ring-4 ring-white/30 shadow-2xl">
                <img src={authUser.profilePic} alt={authUser.fullName} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="card bg-base-200 border border-base-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
          >
            <div className="card-body p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs opacity-70 font-medium">{stat.title}</p>
                  <h3 className="text-2xl sm:text-3xl font-bold mt-1">{stat.value}</h3>
                </div>
                <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.color} shadow-md`}>
                  <stat.icon className="size-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          to="/friends"
          className="card bg-base-200 border border-base-300 hover:border-primary hover:shadow-md transition-all group"
        >
          <div className="card-body p-3 flex-row items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <UsersIcon className="size-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">My Friends</h4>
              <p className="text-xs opacity-60">View all connections</p>
            </div>
          </div>
        </Link>

        <Link
          to="/notifications"
          className="card bg-base-200 border border-base-300 hover:border-secondary hover:shadow-md transition-all group"
        >
          <div className="card-body p-3 flex-row items-center gap-3">
            <div className="p-2.5 rounded-xl bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
              <BellIcon className="size-5 text-secondary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Notifications</h4>
              <p className="text-xs opacity-60">Check requests</p>
            </div>
          </div>
        </Link>

        <div className="card bg-base-200 border border-base-300 hover:border-accent hover:shadow-md transition-all group cursor-pointer">
          <div className="card-body p-3 flex-row items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/10 group-hover:bg-accent/20 transition-colors">
              <TrendingUpIcon className="size-5 text-accent" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Your Activity</h4>
              <p className="text-xs opacity-60">Coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* RECOMMENDED USERS */}
      <section>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <SparklesIcon className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Meet New People</h2>
              <p className="text-xs opacity-70">
                Discover users from around the world
              </p>
            </div>
          </div>

          {recommendedUsers.length > 0 && (
            <div className="relative w-full sm:w-72">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-50" />
              <input
                type="text"
                placeholder="Search by name, country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input input-bordered input-sm w-full pl-10 pr-9 bg-base-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {loadingUsers ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : recommendedUsers.length === 0 ? (
          <div className="card bg-base-200 border border-base-300 p-8 text-center">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <SparklesIcon className="size-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold">No recommendations yet</h3>
              <p className="text-sm opacity-70">
                As more people join, we'll show them here!
              </p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="card bg-base-200 border border-base-300 p-8 text-center">
            <SearchIcon className="size-10 mx-auto opacity-30 mb-2" />
            <p className="text-sm opacity-70">
              No people found matching "<span className="font-semibold">{searchQuery}</span>"
            </p>
            <button onClick={() => setSearchQuery("")} className="btn btn-ghost btn-sm mt-3 gap-1">
              <XIcon className="size-4" />
              Clear search
            </button>
          </div>
        ) : (
          <div className="bg-base-200 rounded-2xl border border-base-300 overflow-hidden">
            {filteredUsers.map((user, idx) => {
              const requestId = outgoingRequestsMap.get(user._id);
              const hasRequestBeenSent = Boolean(requestId);
              const isExpanded = expandedUser === user._id;

              return (
                <div
                  key={user._id}
                  className={`${
                    idx !== filteredUsers.length - 1 ? "border-b border-base-300" : ""
                  } hover:bg-base-300/50 transition-colors`}
                >
                  <div className="flex items-center gap-3 p-3 sm:p-4">
                    <div className="avatar flex-shrink-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full ring-2 ring-primary/20 bg-base-100">
                        <img src={user.profilePic} alt={user.fullName} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">
                        {user.fullName}
                      </h3>
                      {(user.country || user.location) && (
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs opacity-70">
                          <GlobeIcon className="size-3" />
                          <span>{user.country}</span>
                          {user.location && <span className="opacity-60">• {user.location}</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => setExpandedUser(isExpanded ? null : user._id)}
                        className="btn btn-ghost btn-sm btn-square"
                        title="View Details"
                      >
                        <InfoIcon className="size-4" />
                      </button>

                      {hasRequestBeenSent ? (
                        <button
                          className="btn btn-sm btn-outline btn-error gap-1"
                          onClick={() => cancelRequestMutation(requestId)}
                          disabled={isCanceling}
                          title="Cancel Request"
                        >
                          <XIcon className="size-4" />
                          <span className="hidden sm:inline">Cancel</span>
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary gap-1"
                          onClick={() => sendRequestMutation(user._id)}
                          disabled={isSending}
                          title="Send Friend Request"
                        >
                          <UserPlusIcon className="size-4" />
                          <span className="hidden sm:inline">Add</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-base-100/50 border-t border-base-300">
                      <div className="space-y-2 pl-16">
                        {user.location && (
                          <div className="flex items-center gap-2 text-xs opacity-70">
                            <MapPinIcon className="size-3.5" />
                            {user.location}
                          </div>
                        )}

                        {user.country && (
                          <div className="flex flex-wrap gap-1.5">
                            <span className="badge badge-sm badge-primary gap-1 border-none">
                              <GlobeIcon className="size-3" />
                              {user.country}
                            </span>
                          </div>
                        )}

                        {user.bio && (
                          <p className="text-xs opacity-70 italic">"{user.bio}"</p>
                        )}

                        {hasRequestBeenSent && (
                          <div className="flex items-center gap-2 text-xs text-success">
                            <CheckCircleIcon className="size-3.5" />
                            Friend request pending
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;