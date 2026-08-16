import { useEffect, useState, useRef } from "react";
import { XIcon, ChevronLeftIcon, ChevronRightIcon, Trash2Icon } from "lucide-react";
import { markStatusViewed, deleteStatus } from "../lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import useAuthUser from "../hooks/useAuthUser";

const STORY_DURATION = 5000; // 5 seconds for images

const StatusViewer = ({ userGroup, onClose, onNext, onPrev }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef(null);
  const intervalRef = useRef(null);
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();

  const current = userGroup?.statuses[currentIdx];
  const isOwner = current?.user?._id === authUser?._id;

  const { mutate: viewMutation } = useMutation({
    mutationFn: markStatusViewed,
  });

  const { mutate: deleteMutation } = useMutation({
    mutationFn: deleteStatus,
    onSuccess: () => {
      toast.success("Status deleted");
      queryClient.invalidateQueries({ queryKey: ["statuses"] });
      handleNext();
    },
    onError: () => toast.error("Failed to delete"),
  });

  // Mark as viewed
  useEffect(() => {
    if (current && !isOwner) {
      viewMutation(current._id);
    }
  }, [current?._id]);

  // Progress bar
  useEffect(() => {
    if (!current) return;
    setProgress(0);

    if (paused) return;

    // For video: sync with video duration
    if (current.mediaType === "video" && videoRef.current) {
      videoRef.current.play().catch(() => {});
      return;
    }

    // For image: fixed 5-second timer
    const step = 100 / (STORY_DURATION / 50);
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(intervalRef.current);
          handleNext();
          return 100;
        }
        return p + step;
      });
    }, 50);

    return () => clearInterval(intervalRef.current);
  }, [currentIdx, paused, current?._id]);

  const handleNext = () => {
    if (currentIdx < userGroup.statuses.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      onNext?.();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    } else {
      onPrev?.();
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(pct);
    }
  };

  const handleVideoEnded = () => {
    handleNext();
  };

  const handleDelete = () => {
    if (window.confirm("Delete this status?")) {
      deleteMutation(current._id);
    }
  };

  const formatTime = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return "Just now";
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
        {userGroup.statuses.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all"
              style={{
                width: `${idx < currentIdx ? 100 : idx === currentIdx ? progress : 0}%`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="w-10 h-10 rounded-full ring-2 ring-white/50">
              <img src={current.user?.profilePic} alt={current.user?.fullName} />
            </div>
          </div>
          <div className="text-white">
            <p className="font-semibold text-sm">{current.user?.fullName}</p>
            <p className="text-xs opacity-75">{formatTime(current.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={handleDelete}
              className="btn btn-sm btn-circle bg-black/40 hover:bg-red-500 border-none text-white"
              title="Delete"
            >
              <Trash2Icon className="size-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle bg-black/40 hover:bg-black/60 border-none text-white"
          >
            <XIcon className="size-5" />
          </button>
        </div>
      </div>

      {/* Media */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        {current.mediaType === "image" ? (
          <img
            src={current.mediaUrl}
            alt="Status"
            className="max-h-full max-w-full object-contain select-none"
            draggable={false}
          />
        ) : (
          <video
            ref={videoRef}
            src={current.mediaUrl}
            className="max-h-full max-w-full object-contain"
            autoPlay
            playsInline
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleVideoEnded}
          />
        )}

        {/* Caption */}
        {current.caption && (
          <div className="absolute bottom-20 left-0 right-0 px-4">
            <p className="text-white text-center text-lg bg-black/50 backdrop-blur-sm rounded-2xl p-3 max-w-md mx-auto">
              {current.caption}
            </p>
          </div>
        )}
      </div>

      {/* Left/Right tap zones */}
      <button
        onClick={handlePrev}
        className="absolute left-0 top-16 bottom-16 w-1/3 flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity"
      >
        <ChevronLeftIcon className="size-8 text-white/70" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-0 top-16 bottom-16 w-1/3 flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity"
      >
        <ChevronRightIcon className="size-8 text-white/70" />
      </button>

      {/* Viewer count for owner */}
      {isOwner && current.viewers && (
        <div className="absolute bottom-4 left-4 text-white text-xs opacity-75">
          👁 {current.viewers.length} {current.viewers.length === 1 ? "view" : "views"}
        </div>
      )}
    </div>
  );
};

export default StatusViewer;