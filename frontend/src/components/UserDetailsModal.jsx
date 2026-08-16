import { useState } from "react";
import {
  XIcon,
  MapPinIcon,
  GlobeIcon,
  MessageCircleIcon,
  VideoIcon,
  CalendarIcon,
} from "lucide-react";
import ImageViewer from "./ImageViewer";

const UserDetailsModal = ({ user, isOpen, onClose, onVideoCall, isOnline }) => {
  const [showImage, setShowImage] = useState(false);

  if (!isOpen || !user) return null;

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  const handleClose = (e) => {
    e?.stopPropagation?.();
    onClose();
  };

  const handleVideoCallClick = (e) => {
    e?.stopPropagation?.();
    onVideoCall?.();
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ zIndex: 9999 }}
        onClick={handleClose}
      >
        <div
          className="bg-base-100 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in relative"
          style={{ zIndex: 10000 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative h-32 bg-gradient-to-br from-primary via-secondary to-accent">
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-3 right-3 btn btn-sm btn-circle bg-black/30 hover:bg-black/50 border-none text-white"
            >
              <XIcon className="size-4" />
            </button>

            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowImage(true);
                }}
                className="group relative"
                title="Click to view full image"
              >
                <div className="avatar">
                  <div className="w-24 h-24 rounded-full ring-4 ring-base-100 bg-base-100 shadow-xl overflow-hidden transition-transform group-hover:scale-105">
                    <img src={user.profilePic} alt={user.fullName} />
                  </div>
                </div>
                {/* ✅ NEW: Online indicator dot on avatar */}
                {isOnline && (
                  <div className="absolute bottom-1 right-1 size-5 rounded-full bg-green-500 ring-4 ring-base-100 animate-pulse" />
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                  <span className="text-white text-xs font-semibold">View</span>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-16 pb-6 px-6 space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold">{user.fullName}</h2>
              
              {/* ✅ NEW: Online status */}
              {isOnline !== undefined && (
                <p className="text-sm flex items-center justify-center gap-1.5 mt-1">
                  {isOnline ? (
                    <>
                      <span className="size-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-green-500 font-medium">Online</span>
                    </>
                  ) : (
                    <span className="opacity-60">Offline</span>
                  )}
                </p>
              )}
              
              {(user.country || user.location) && (
                <p className="text-sm opacity-70 flex items-center justify-center gap-1 mt-1">
                  <GlobeIcon className="size-4" />
                  {user.country}
                  {user.location && ` • ${user.location}`}
                </p>
              )}
            </div>

            {user.bio && (
              <div className="bg-base-200 rounded-xl p-4 border border-base-300">
                <p className="text-sm italic text-center opacity-80">"{user.bio}"</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs uppercase opacity-50 font-semibold px-1">Location</p>

              <div className="bg-base-200 rounded-xl p-3 border border-base-300 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <GlobeIcon className="size-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs opacity-60">Country</p>
                  <p className="font-semibold text-sm">
                    {user.country || "Not set"}
                  </p>
                </div>
              </div>

              {user.location && (
                <div className="bg-base-200 rounded-xl p-3 border border-base-300 flex items-center gap-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <MapPinIcon className="size-4 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs opacity-60">City</p>
                    <p className="font-semibold text-sm">{user.location}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs opacity-60 justify-center pt-2">
              <CalendarIcon className="size-3.5" />
              Joined {joinDate}
            </div>

            <div className="flex gap-2 pt-2 relative" style={{ zIndex: 10001 }}>
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-outline btn-sm flex-1 gap-2"
              >
                <MessageCircleIcon className="size-4" />
                Close
              </button>

              {onVideoCall && (
                <button
                  type="button"
                  onClick={handleVideoCallClick}
                  className="btn btn-sm flex-1 gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-none"
                >
                  <VideoIcon className="size-4" />
                  Video Call
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ImageViewer
        imageUrl={user.profilePic}
        userName={user.fullName}
        isOpen={showImage}
        onClose={() => setShowImage(false)}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default UserDetailsModal;