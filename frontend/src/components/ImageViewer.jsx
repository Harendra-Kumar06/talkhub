import { XIcon, DownloadIcon } from "lucide-react";
import { useEffect, useState } from "react";

const ImageViewer = ({ imageUrl, userName, isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Reset states when opening
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(false);
    }
  }, [isOpen, imageUrl]);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const extension = imageUrl.includes(".svg") || imageUrl.includes("svg") ? "svg" : "jpg";
      link.download = `${userName || "profile"}-picture.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent z-10">
        <div className="text-white">
          <p className="font-semibold">{userName || "Profile Picture"}</p>
          <p className="text-xs opacity-70">Click outside to close</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="btn btn-sm btn-circle bg-white/10 hover:bg-white/20 border-none text-white backdrop-blur-md"
            title="Download image"
          >
            <DownloadIcon className="size-4" />
          </button>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle bg-white/10 hover:bg-white/20 border-none text-white backdrop-blur-md"
            title="Close (ESC)"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div
        className="relative flex items-center justify-center animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="loading loading-spinner loading-lg text-white" />
          </div>
        )}

        {error ? (
          <div className="text-center text-white bg-white/10 backdrop-blur-md rounded-2xl p-8">
            <p className="text-lg font-semibold">Failed to load image</p>
            <p className="text-sm opacity-70 mt-1">The image might be broken or unavailable</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6">
            <img
              src={imageUrl}
              alt={userName || "Profile"}
              className="w-[80vw] sm:w-96 h-[80vw] sm:h-96 max-w-[500px] max-h-[500px] rounded-xl object-contain"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
              style={{ display: loading ? "none" : "block" }}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        .animate-scale-in { animation: scaleIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default ImageViewer;