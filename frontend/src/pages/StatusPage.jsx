import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStatuses,
  createStatus,
  uploadFile,
} from "../lib/api";
import { PlusIcon, CameraIcon, ImageIcon, VideoIcon, XIcon } from "lucide-react";
import toast from "react-hot-toast";
import useAuthUser from "../hooks/useAuthUser";
import StatusViewer from "../components/StatusViewer";

const StatusPage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [viewingIdx, setViewingIdx] = useState(null); // index in unified list
  const [viewingMine, setViewingMine] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null); // { file, url, type, caption }

  const { data, isLoading } = useQuery({
    queryKey: ["statuses"],
    queryFn: getStatuses,
    enabled: !!authUser,           // ✅ don't run until we're logged in
    refetchInterval: authUser ? 60000 : false,
  });

  const myStatuses = data?.myStatuses;
  const friendStatuses = data?.friendStatuses || [];

  const { mutate: createMutation, isPending: creating } = useMutation({
    mutationFn: createStatus,
    onSuccess: () => {
      toast.success("Status posted! Visible for 24 hours 🎉");
      queryClient.invalidateQueries({ queryKey: ["statuses"] });
      setPreview(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to post status");
    },
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error("Please select an image or video");
      return;
    }

    // Max: image 5MB, video 20MB
    const maxSize = isImage ? 5 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large (max ${isImage ? "5MB" : "20MB"})`);
      return;
    }

    setUploading(true);
    const loadingToast = toast.loading("Uploading to cloud...");

    try {
      const result = await uploadFile(file);
      toast.dismiss(loadingToast);
      setPreview({
        url: result.url,
        type: isImage ? "image" : "video",
        caption: "",
      });
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Upload failed");
      console.error(error);
    } finally {
      setUploading(false);
    }

    e.target.value = ""; // Reset input
  };

  const handlePost = () => {
    if (!preview) return;
    createMutation({
      mediaUrl: preview.url,
      mediaType: preview.type,
      caption: preview.caption,
    });
  };

  const handleViewMine = () => {
    if (myStatuses) {
      setViewingMine(true);
      setViewingIdx(0);
    }
  };

  const handleViewFriend = (idx) => {
    setViewingMine(false);
    setViewingIdx(idx);
  };

  const handleCloseViewer = () => {
    setViewingIdx(null);
    setViewingMine(false);
  };

  const handleNextViewer = () => {
    if (viewingMine) {
      // After mine → first friend
      if (friendStatuses.length > 0) {
        setViewingMine(false);
        setViewingIdx(0);
      } else {
        handleCloseViewer();
      }
    } else {
      if (viewingIdx < friendStatuses.length - 1) {
        setViewingIdx(viewingIdx + 1);
      } else {
        handleCloseViewer();
      }
    }
  };

  const handlePrevViewer = () => {
    if (viewingMine) return; // nothing before
    if (viewingIdx > 0) {
      setViewingIdx(viewingIdx - 1);
    } else if (myStatuses) {
      setViewingMine(true);
      setViewingIdx(0);
    }
  };

  const currentViewingGroup = viewingMine
    ? myStatuses
    : friendStatuses[viewingIdx];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent p-6 sm:p-8 text-primary-content shadow-xl">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Status</h1>
          <p className="opacity-90 text-sm">
            Share moments with your friends — disappears in 24 hours
          </p>
        </div>
      </div>

      {/* HIDDEN FILE INPUT */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* MY STATUS + ADD */}
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body p-4">
          <p className="text-xs uppercase opacity-50 font-semibold mb-3">My Status</p>

          <div className="flex items-center gap-4">
            {/* Circle with + or ring */}
            <button
              onClick={() => (myStatuses ? handleViewMine() : fileInputRef.current?.click())}
              className="relative flex-shrink-0"
              disabled={uploading}
            >
              <div
                className={`relative w-16 h-16 rounded-full overflow-hidden ${
                  myStatuses
                    ? "ring-4 ring-primary p-0.5"
                    : "ring-2 ring-dashed ring-base-content/30"
                }`}
              >
                <img
                  src={authUser?.profilePic}
                  alt="Me"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              {!myStatuses && (
                <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1 ring-2 ring-base-200">
                  <PlusIcon className="size-3 text-white" />
                </div>
              )}
            </button>

            <div className="flex-1">
              <h3 className="font-semibold text-sm">My Status</h3>
              {myStatuses ? (
                <p className="text-xs opacity-70">
                  {myStatuses.statuses.length}{" "}
                  {myStatuses.statuses.length === 1 ? "update" : "updates"} • Tap to view
                </p>
              ) : (
                <p className="text-xs opacity-70">Tap to add status update</p>
              )}
            </div>

            {myStatuses && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-sm btn-circle btn-primary"
                title="Add another"
                disabled={uploading}
              >
                <PlusIcon className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FRIENDS' STATUSES */}
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body p-4">
          <p className="text-xs uppercase opacity-50 font-semibold mb-3">Recent Updates</p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : friendStatuses.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-base-300 flex items-center justify-center mx-auto mb-3">
                <CameraIcon className="size-8 opacity-40" />
              </div>
              <p className="text-sm opacity-70">No recent updates from friends</p>
              <p className="text-xs opacity-50 mt-1">
                When your friends post statuses, they'll appear here
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {friendStatuses.map((group, idx) => (
                <button
                  key={group.user._id}
                  onClick={() => handleViewFriend(idx)}
                  className="w-full flex items-center gap-4 p-2 hover:bg-base-300 rounded-xl transition-colors"
                >
                  <div
                    className={`relative w-14 h-14 rounded-full overflow-hidden p-0.5 ${
                      group.hasUnviewed
                        ? "ring-4 ring-primary bg-gradient-to-tr from-primary to-secondary"
                        : "ring-2 ring-base-content/20"
                    }`}
                  >
                    <img
                      src={group.user.profilePic}
                      alt={group.user.fullName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-semibold text-sm">{group.user.fullName}</h4>
                    <p className="text-xs opacity-60">
                      {group.statuses.length}{" "}
                      {group.statuses.length === 1 ? "update" : "updates"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FLOATING UPLOAD BUTTONS (Mobile-style) */}
      <div className="fixed bottom-20 lg:bottom-6 right-6 flex flex-col gap-2 z-30">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn btn-circle btn-lg bg-gradient-to-br from-primary to-secondary text-white border-none shadow-2xl hover:scale-110 transition-transform"
          title="Add status"
        >
          {uploading ? (
            <span className="loading loading-spinner" />
          ) : (
            <CameraIcon className="size-6" />
          )}
        </button>
      </div>

      {/* PREVIEW MODAL — Before posting */}
      {preview && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
            {/* Media preview */}
            <div className="relative bg-black aspect-square flex items-center justify-center">
              {preview.type === "image" ? (
                <img
                  src={preview.url}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <video
                  src={preview.url}
                  controls
                  className="max-h-full max-w-full object-contain"
                />
              )}
              <button
                onClick={() => setPreview(null)}
                className="absolute top-3 right-3 btn btn-sm btn-circle bg-black/60 hover:bg-black/80 border-none text-white"
              >
                <XIcon className="size-4" />
              </button>
              <div className="absolute top-3 left-3 badge badge-primary gap-1">
                {preview.type === "image" ? (
                  <ImageIcon className="size-3" />
                ) : (
                  <VideoIcon className="size-3" />
                )}
                {preview.type}
              </div>
            </div>

            {/* Caption input */}
            <div className="p-4 space-y-3">
              <input
                type="text"
                placeholder="Add a caption (optional)"
                value={preview.caption}
                onChange={(e) =>
                  setPreview({ ...preview, caption: e.target.value })
                }
                maxLength={200}
                className="input input-bordered w-full"
              />
              <p className="text-xs opacity-60 text-right">
                {preview.caption.length}/200
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setPreview(null)}
                  className="btn btn-outline flex-1"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePost}
                  disabled={creating}
                  className="btn btn-primary flex-1 gap-2 bg-gradient-to-r from-primary to-secondary border-none"
                >
                  {creating ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="size-4" />
                      Post Status
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN VIEWER */}
      {viewingIdx !== null && currentViewingGroup && (
        <StatusViewer
          userGroup={currentViewingGroup}
          onClose={handleCloseViewer}
          onNext={handleNextViewer}
          onPrev={handlePrevViewer}
        />
      )}
    </div>
  );
};

export default StatusPage;