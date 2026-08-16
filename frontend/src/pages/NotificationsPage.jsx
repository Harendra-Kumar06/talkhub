import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptFriendRequest, getFriendRequests } from "../lib/api";
import {
  BellIcon,
  ClockIcon,
  MessageSquareIcon,
  UserCheckIcon,
  CheckIcon,
  SparklesIcon,
  GlobeIcon,
} from "lucide-react";
import NoNotificationsFound from "../components/NoNotificationsFound";

const NotificationsPage = () => {
  const queryClient = useQueryClient();

  const { data: friendRequests, isLoading } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  });

  const { mutate: acceptRequestMutation, isPending } = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const incomingRequests = friendRequests?.incomingReqs || [];
  const acceptedRequests = friendRequests?.acceptedReqs || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-secondary/10 to-transparent p-6 rounded-2xl border border-base-300 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary text-primary-content rounded-xl shadow-md relative">
            <BellIcon className="size-6" />
            {incomingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full size-5 flex items-center justify-center ring-2 ring-base-100">
                {incomingRequests.length > 99 ? '99+' : incomingRequests.length}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm opacity-70">
              {incomingRequests.length} pending {incomingRequests.length === 1 ? "request" : "requests"}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <>
          {incomingRequests.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold flex items-center gap-2 px-1">
                <UserCheckIcon className="size-5 text-primary" />
                Friend Requests
                <span className="badge badge-primary badge-sm">{incomingRequests.length}</span>
              </h2>

              <div className="space-y-3">
                {incomingRequests.map((request) => (
                  <div
                    key={request._id}
                    className="card bg-base-200 border border-base-300 hover:border-primary hover:shadow-lg transition-all duration-300"
                  >
                    <div className="card-body p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="avatar flex-shrink-0">
                            <div className="w-14 h-14 rounded-full ring-2 ring-primary/30">
                              <img src={request.sender.profilePic} alt={request.sender.fullName} />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base truncate">
                              {request.sender.fullName}
                            </h3>
                            {request.sender.country && (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                <span className="badge badge-sm badge-primary gap-1 border-none">
                                  <GlobeIcon className="size-3" />
                                  {request.sender.country}
                                </span>
                                {request.sender.location && (
                                  <span className="badge badge-sm badge-outline">
                                    {request.sender.location}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          className="btn btn-primary btn-sm gap-2 shadow-md w-full sm:w-auto"
                          onClick={() => acceptRequestMutation(request._id)}
                          disabled={isPending}
                        >
                          <CheckIcon className="size-4" />
                          Accept
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {acceptedRequests.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold flex items-center gap-2 px-1">
                <SparklesIcon className="size-5 text-success" />
                New Connections
              </h2>

              <div className="space-y-3">
                {acceptedRequests.map((notification) => (
                  <div
                    key={notification._id}
                    className="card bg-gradient-to-r from-success/5 to-transparent border border-success/20 hover:shadow-md transition-all"
                  >
                    <div className="card-body p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="avatar flex-shrink-0">
                          <div className="w-12 h-12 rounded-full ring-2 ring-success/30">
                            <img
                              src={notification.recipient.profilePic}
                              alt={notification.recipient.fullName}
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base">
                            {notification.recipient.fullName}
                          </h3>
                          <p className="text-sm opacity-80 mt-0.5">
                            accepted your friend request 🎉
                          </p>
                          <p className="text-xs flex items-center opacity-60 mt-1">
                            <ClockIcon className="size-3 mr-1" />
                            Recently
                          </p>
                        </div>
                        <div className="badge badge-success gap-1 py-3 hidden sm:flex">
                          <MessageSquareIcon className="size-3" />
                          New Friend
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {incomingRequests.length === 0 && acceptedRequests.length === 0 && (
            <NoNotificationsFound />
          )}
        </>
      )}
    </div>
  );
};

export default NotificationsPage;