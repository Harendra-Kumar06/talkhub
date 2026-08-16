import { Link, useLocation } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, UserIcon, UsersIcon, CircleIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getFriendRequests } from "../lib/api";
import { useUnreadCounts } from "../hooks/useUnreadCounts";
import Logo from "./Logo";

const Sidebar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
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

  return (
    <aside className="w-64 bg-base-200 border-r border-base-300 hidden lg:flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-base-300">
        <Link to="/friends" className="group">
          <div className="group-hover:scale-105 transition-transform">
            <Logo size="size-10" textSize="text-2xl" />
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1.5">
        <p className="text-xs uppercase opacity-50 font-semibold px-3 mb-2">Menu</p>

        {navItems.map((item) => {
          const isActive =
            currentPath === item.path ||
            (item.path === "/friends" && currentPath.startsWith("/chat"));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? "bg-gradient-to-r from-primary to-secondary text-primary-content shadow-md"
                  : "hover:bg-base-300"
              }`}
            >
              <item.icon
                className={`size-5 ${isActive ? "text-white" : "opacity-70 group-hover:opacity-100"}`}
              />
              <span className={`font-medium text-sm ${isActive ? "text-white" : ""}`}>
                {item.label}
              </span>

              {item.badge > 0 && (
                <span className="absolute right-3 bg-red-500 text-white text-[10px] font-bold rounded-full size-5 flex items-center justify-center ring-2 ring-base-200">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}

              {isActive && item.badge === 0 && (
                <span className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-base-300">
        <Link
          to="/profile"
          className="flex items-center gap-3 p-2 rounded-xl bg-base-300/50 hover:bg-base-300 transition-colors cursor-pointer"
        >
          <div className="avatar">
            <div className="w-10 h-10 rounded-full ring-2 ring-primary/30">
              <img src={authUser?.profilePic} alt="User Avatar" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{authUser?.fullName}</p>
            <p className="text-xs opacity-60">View profile</p>
          </div>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;