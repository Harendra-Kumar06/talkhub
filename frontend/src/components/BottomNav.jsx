import { Link, useLocation } from "react-router";
import { UserIcon, UsersIcon, CircleIcon, BellIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getFriendRequests } from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";
import { useUnreadCounts } from "../hooks/useUnreadCounts";

const BottomNav = () => {
  const location = useLocation();
  const { authUser } = useAuthUser();
  const currentPath = location.pathname;

  const { data: friendRequests } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
    enabled: !!authUser,
  });
  const pendingRequests = friendRequests?.incomingReqs?.length || 0;
  const { totalUnread } = useUnreadCounts();

  const navItems = [
    { path: "/profile", label: "Me", icon: UserIcon, badge: 0 },
    { path: "/friends", label: "Friends", icon: UsersIcon, badge: totalUnread },
    { path: "/status", label: "Status", icon: CircleIcon, badge: 0 },
    { path: "/alerts", label: "Alerts", icon: BellIcon, badge: pendingRequests },
  ];

  // Hide bottom nav on chat page (full-screen chat on mobile)
  if (currentPath.startsWith("/chat")) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-base-200 border-t border-base-300 z-40 shadow-lg">
      <div className="grid grid-cols-4">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors ${
                isActive ? "text-primary" : "opacity-60 hover:opacity-100"
              }`}
            >
              <div className="relative">
                <item.icon className={`size-5 ${isActive ? "text-primary" : ""}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center ring-1 ring-base-200">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] font-medium ${isActive ? "text-primary" : ""}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;