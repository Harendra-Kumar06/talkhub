import { useEffect, useRef } from "react";
import { PhoneIcon, PhoneOffIcon, VideoIcon, UsersIcon } from "lucide-react";

const IncomingCallModal = ({ call, onAccept, onReject }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    try {
      const ringtone = new Audio("/ringtone.mp3");
      ringtone.loop = true;
      ringtone.volume = 0.7;
      ringtone.play().catch((err) => {
        console.warn("Ringtone autoplay blocked:", err.message);
      });
      audioRef.current = ringtone;
    } catch (e) {
      console.warn("Ringtone failed:", e.message);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  if (!call) return null;

  const stopRingtone = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  };

  const handleAccept = () => {
    stopRingtone();
    onAccept();
  };

  const handleReject = () => {
    stopRingtone();
    onReject();
  };

  const isGroup = call.isGroupCall;
  const displayImage = isGroup ? call.groupAvatar : call.callerImage;
  const displayName = isGroup ? call.groupName : call.callerName;
  const subtitle = isGroup
    ? `${call.callerName} started a group call`
    : "is calling you...";

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative w-full max-w-sm bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary/30 rounded-full blur-3xl animate-pulse" />

        <div className="relative z-10 p-8 flex flex-col items-center text-white">
          <p className="text-sm opacity-70 flex items-center gap-2 mb-1">
            {isGroup ? (
              <>
                <UsersIcon className="size-4" />
                Incoming group {call.callType || "video"} call
                {call.memberCount ? ` · ${call.memberCount} members` : ""}
              </>
            ) : (
              <>
                <VideoIcon className="size-4" />
                Incoming {call.callType || "video"} call
              </>
            )}
          </p>

          <div className="relative my-8">
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping [animation-delay:0.5s]" />
            <div className="relative avatar">
              <div className="w-32 h-32 rounded-full ring-4 ring-white/30 overflow-hidden bg-base-100">
                {displayImage ? (
                  <img src={displayImage} alt={displayName} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary text-4xl font-bold">
                    {isGroup ? (
                      <UsersIcon className="size-14" />
                    ) : (
                      displayName?.[0]?.toUpperCase() || "?"
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-1">{displayName}</h2>
          <p className="text-sm opacity-70 mb-8 text-center px-4">{subtitle}</p>

          <div className="flex items-center justify-center gap-16 w-full">
            <button
              onClick={handleReject}
              className="group flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-xl transition-all group-hover:scale-110 group-active:scale-95">
                <PhoneOffIcon className="size-7 text-white" />
              </div>
              <span className="text-xs opacity-80">
                {isGroup ? "Dismiss" : "Decline"}
              </span>
            </button>

            <button
              onClick={handleAccept}
              className="group flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-xl transition-all group-hover:scale-110 group-active:scale-95 animate-wiggle">
                <PhoneIcon className="size-7 text-white" />
              </div>
              <span className="text-xs opacity-80">
                {isGroup ? "Join" : "Accept"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slide-up { animation: slideUp 0.3s ease-out; }

        @keyframes wiggle {
          0%,100% { transform: rotate(0deg); }
          25%     { transform: rotate(-10deg); }
          75%     { transform: rotate(10deg); }
        }
        .animate-wiggle { animation: wiggle 0.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default IncomingCallModal;