import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import {
  LogOutIcon,
  MoreVerticalIcon,
  UsersIcon,
  CheckCheckIcon,
  CompassIcon,
} from "lucide-react";
import ThemeSelector from "./ThemeSelector";
import useLogout from "../hooks/useLogout";
import CreateGroupModal from "./CreateGroupModal";
import { connectStreamUser } from "../lib/streamClient";
import toast from "react-hot-toast";
import Logo from "./Logo";

const Navbar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const navigate = useNavigate();
  const isChatPage = location.pathname?.startsWith("/chat");
  const { logoutMutation } = useLogout();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleNewGroup = () => {
    setMenuOpen(false);
    setShowCreateGroup(true);
  };

  const handleReadAll = async () => {
    setMenuOpen(false);
    if (!authUser || markingRead) return;

    setMarkingRead(true);
    const loadingToast = toast.loading("Marking all as read...");

    try {
      const client = await connectStreamUser(authUser);

      const channels = await client.queryChannels(
        {
          type: "messaging",
          members: { $in: [authUser._id] },
        },
        { last_message_at: -1 },
        { watch: true, state: true, limit: 100 }
      );

      let totalMarked = 0;
      for (const ch of channels) {
        const unread = ch.countUnread();
        if (unread > 0) {
          try {
            await ch.markRead();
            totalMarked += unread;
          } catch (e) {
            console.warn("Failed to mark channel read:", ch.id, e);
          }
        }
      }

      toast.dismiss(loadingToast);
      if (totalMarked > 0) {
        toast.success(`Marked ${totalMarked} messages as read`);
      } else {
        toast.success("All caught up!");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Mark all read failed:", error);
      toast.error("Failed to mark as read");
    } finally {
      setMarkingRead(false);
    }
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logoutMutation();
  };

  return (
    <>
      <nav className="bg-base-200/80 backdrop-blur-md border-b border-base-300 sticky top-0 z-30 h-16 flex items-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between w-full">
            <div className={`${isChatPage ? "flex" : "flex lg:hidden"} items-center gap-2`}>
              <Link to="/friends" className="group">
                <div className="group-hover:scale-105 transition-transform">
                  <Logo size="size-8" textSize="text-xl" />
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
              <ThemeSelector />

              {!isChatPage && (
                <Link to="/profile" className="avatar hidden sm:block hover:ring-4 transition-all">
                  <div className="w-9 h-9 rounded-full ring-2 ring-primary/30">
                    <img src={authUser?.profilePic} alt="User Avatar" />
                  </div>
                </Link>
              )}

              {!isChatPage && (
                <div className="relative">
                  <button
                    ref={btnRef}
                    onClick={() => setMenuOpen((o) => !o)}
                    className="btn btn-ghost btn-circle btn-sm"
                    title="More options"
                  >
                    <MoreVerticalIcon className="size-5" />
                  </button>

                  {menuOpen && (
                    <div
                      ref={menuRef}
                      className="absolute right-0 top-full mt-1 w-52 bg-base-100 rounded-xl shadow-2xl border border-base-300 py-2 z-50 animate-fade-in"
                    >
                      <button
                        onClick={handleNewGroup}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-base-200 transition-colors text-sm"
                      >
                        <UsersIcon className="size-4" />
                        New Group
                      </button>

                      <button
                        onClick={handleReadAll}
                        disabled={markingRead}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-base-200 transition-colors text-sm disabled:opacity-50"
                      >
                        {markingRead ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          <CheckCheckIcon className="size-4" />
                        )}
                        Read All
                      </button>

                      <Link
                        to="/discover"
                        onClick={() => setMenuOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-base-200 transition-colors text-sm"
                      >
                        <CompassIcon className="size-4" />
                        Discover
                      </Link>

                      <div className="border-t border-base-300 my-1" />

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-error/10 hover:text-error transition-colors text-sm"
                      >
                        <LogOutIcon className="size-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fadeIn 0.15s ease-out; }
        `}</style>
      </nav>

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />
    </>
  );
};

export default Navbar;