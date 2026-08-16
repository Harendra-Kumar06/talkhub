import { useEffect, useRef } from "react";
import { PhoneOffIcon, VideoIcon } from "lucide-react";

const OutgoingCallModal = ({ call, onCancel }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    try {
      const dialtone = new Audio("/dialtone.mp3");
      dialtone.loop = true;
      dialtone.volume = 0.4;
      dialtone.play().catch((err) => {
        console.warn("Dialtone autoplay blocked:", err.message);
      });
      audioRef.current = dialtone;
    } catch (e) {
      console.warn("Dialtone failed:", e.message);
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

  const stopDialtone = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  };

  const handleCancel = () => {
    stopDialtone();
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-sm bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500/30 rounded-full blur-3xl animate-pulse" />

        <div className="relative z-10 p-8 flex flex-col items-center text-white">
          <p className="text-sm opacity-70 flex items-center gap-2 mb-1">
            <VideoIcon className="size-4" />
            Outgoing {call.type || "video"} call
          </p>

          <div className="relative my-8">
            <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
            <div className="relative avatar">
              <div className="w-32 h-32 rounded-full ring-4 ring-white/30 overflow-hidden bg-base-100">
                {call.recipient?.profilePic ? (
                  <img
                    src={call.recipient.profilePic}
                    alt={call.recipient.fullName}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary text-4xl font-bold">
                    {call.recipient?.fullName?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-1">
            {call.recipient?.fullName || "Contact"}
          </h2>
          <p className="text-sm opacity-70 mb-2">Calling...</p>

          <div className="flex gap-1 mb-8 h-4 items-end">
            <span className="w-1 bg-white/60 rounded-full animate-bounce" style={{ height: "40%", animationDelay: "0ms" }} />
            <span className="w-1 bg-white/60 rounded-full animate-bounce" style={{ height: "70%", animationDelay: "150ms" }} />
            <span className="w-1 bg-white/60 rounded-full animate-bounce" style={{ height: "100%", animationDelay: "300ms" }} />
            <span className="w-1 bg-white/60 rounded-full animate-bounce" style={{ height: "70%", animationDelay: "450ms" }} />
            <span className="w-1 bg-white/60 rounded-full animate-bounce" style={{ height: "40%", animationDelay: "600ms" }} />
          </div>

          <button
            onClick={handleCancel}
            className="group flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-xl transition-all group-hover:scale-110 group-active:scale-95">
              <PhoneOffIcon className="size-7 text-white" />
            </div>
            <span className="text-xs opacity-80">Cancel</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slide-up { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default OutgoingCallModal;