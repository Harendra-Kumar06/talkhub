import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  MoreVerticalIcon,
  UsersIcon,
  CheckCheckIcon,
  LogOutIcon,
  UserMinusIcon,
} from "lucide-react";
import useLogout from "../hooks/useLogout";
import toast from "react-hot-toast";

const ChatMenu = ({ channel, isGroup = false, onCreateGroup, onLeaveGroup }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { logoutMutation } = useLogout();

  // Position menu below button
  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const handleEsc = (e) => e.key === "Escape" && setOpen(false);

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const handleReadAll = async () => {
    setOpen(false);
    if (!channel) return;
    try {
      await channel.markRead();
      toast.success("Marked all as read");
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const handleNewGroup = () => {
    setOpen(false);
    if (onCreateGroup) {
      onCreateGroup();
    } else {
      navigate("/discover");
      toast("Group creation coming soon!");
    }
  };

  const handleRemoveMe = () => {
    setOpen(false);
    if (onLeaveGroup) onLeaveGroup();
  };

  const handleLogout = () => {
    setOpen(false);
    logoutMutation();
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="btn btn-ghost btn-circle btn-sm"
        title="More options"
      >
        <MoreVerticalIcon className="size-5" />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="fixed w-52 bg-base-100 rounded-xl shadow-2xl border border-base-300 py-2 animate-fade-in"
          style={{
            top: `${pos.top}px`,
            right: `${pos.right}px`,
            zIndex: 9999,
          }}
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
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-base-200 transition-colors text-sm"
          >
            <CheckCheckIcon className="size-4" />
            Read All
          </button>

          {isGroup && (
            <button
              onClick={handleRemoveMe}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-error/10 hover:text-error transition-colors text-sm"
            >
              <UserMinusIcon className="size-4" />
              Remove Me
            </button>
          )}

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

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.15s ease-out;
        }
      `}</style>
    </>
  );
};

export default ChatMenu;