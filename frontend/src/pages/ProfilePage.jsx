import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateProfile, uploadFile } from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";
import useLogout from "../hooks/useLogout";
import { COUNTRIES } from "../constants";
import ImageViewer from "../components/ImageViewer";
import {
  UserIcon,
  MapPinIcon,
  BookOpenIcon,
  GlobeIcon,
  ShuffleIcon,
  SaveIcon,
  EditIcon,
  LogOutIcon,
  MailIcon,
  CalendarIcon,
  XIcon,
  UploadIcon,
  CameraIcon,
  ImageIcon,
} from "lucide-react";

const ProfilePage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const { logoutMutation } = useLogout();
  const fileInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [formState, setFormState] = useState({
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
    country: authUser?.country || "",
    location: authUser?.location || "",
    profilePic: authUser?.profilePic || "",
  });

  const { mutate: updateMutation, isPending } = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast.success("Profile updated successfully! 🎉");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update profile");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation(formState);
  };

  const handleRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    const randomAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    setFormState({ ...formState, profilePic: randomAvatar });
    toast.success("New avatar generated!");
  };

  // ✅ NEW: Real upload to Stream CDN
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploading(true);
    const loadingToast = toast.loading("Uploading to cloud...");

    try {
      const result = await uploadFile(file);
      setFormState({ ...formState, profilePic: result.url });
      toast.dismiss(loadingToast);
      toast.success("Image uploaded! Click Save to apply.");
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.message || "Upload failed");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setFormState({
      fullName: authUser?.fullName || "",
      bio: authUser?.bio || "",
      country: authUser?.country || "",
      location: authUser?.location || "",
      profilePic: authUser?.profilePic || "",
    });
    setIsEditing(false);
  };

  const joinDate = authUser?.createdAt
    ? new Date(authUser.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  if (!authUser) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent p-8 text-primary-content shadow-xl">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <button
              type="button"
              onClick={() => !isEditing && setShowImageViewer(true)}
              className={`avatar ${!isEditing ? "cursor-pointer" : ""}`}
              disabled={isEditing}
            >
              <div className="w-28 h-28 rounded-full ring-4 ring-white/30 shadow-2xl bg-base-100 overflow-hidden hover:ring-white/50 transition-all">
                {uploading ? (
                  <div className="w-full h-full flex items-center justify-center bg-black/20">
                    <span className="loading loading-spinner loading-md text-white" />
                  </div>
                ) : (
                  <img
                    src={formState.profilePic || authUser.profilePic}
                    alt={authUser.fullName}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 w-28 h-28 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white"
                title="Upload image"
              >
                <CameraIcon className="size-6" />
                <span className="text-xs font-semibold">Upload</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-3xl font-bold">{authUser.fullName}</h1>
            <p className="text-sm opacity-90 flex items-center justify-center sm:justify-start gap-1 mt-1">
              <MailIcon className="size-4" />
              {authUser.email}
            </p>
            {authUser.country && !isEditing && (
              <p className="text-sm opacity-90 flex items-center justify-center sm:justify-start gap-1 mt-1">
                <GlobeIcon className="size-4" />
                {authUser.country}
                {authUser.location && ` • ${authUser.location}`}
              </p>
            )}
            <p className="text-xs opacity-75 flex items-center justify-center sm:justify-start gap-1 mt-2">
              <CalendarIcon className="size-3" />
              Joined {joinDate}
            </p>
          </div>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-sm bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-white/30 gap-2"
            >
              <EditIcon className="size-4" />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="card bg-base-200 border border-base-300 shadow-md">
        <div className="card-body p-6">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center justify-between border-b border-base-300 pb-3">
                <h2 className="text-xl font-bold">Edit Profile</h2>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-ghost btn-sm btn-circle"
                >
                  <XIcon className="size-5" />
                </button>
              </div>

              <div className="bg-base-100 rounded-xl p-4 border border-base-300">
                <p className="text-xs uppercase opacity-50 font-semibold mb-3 flex items-center gap-2">
                  <ImageIcon className="size-3.5" />
                  Profile Picture
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-sm flex-1 gap-2 bg-gradient-to-r from-primary to-secondary text-white border-none"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <span className="loading loading-spinner loading-xs" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadIcon className="size-4" />
                        Upload Photo
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleRandomAvatar}
                    className="btn btn-sm btn-outline flex-1 gap-2"
                  >
                    <ShuffleIcon className="size-4" />
                    Random Avatar
                  </button>
                </div>
                <p className="text-xs opacity-60 mt-2 text-center">
                  Upload JPG, PNG, or GIF (max 5MB) — stored on Stream CDN
                </p>
              </div>

              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium flex items-center gap-2">
                    <UserIcon className="size-4" />
                    Full Name
                  </span>
                </label>
                <input
                  type="text"
                  value={formState.fullName}
                  onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                  className="input input-bordered w-full focus:input-primary"
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium flex items-center gap-2">
                    <BookOpenIcon className="size-4" />
                    Bio
                  </span>
                </label>
                <textarea
                  value={formState.bio}
                  onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                  className="textarea textarea-bordered h-24 focus:textarea-primary"
                  placeholder="Tell others about yourself..."
                />
              </div>

              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium flex items-center gap-2">
                    <GlobeIcon className="size-4 text-primary" />
                    Country
                  </span>
                </label>
                <select
                  value={formState.country}
                  onChange={(e) => setFormState({ ...formState, country: e.target.value })}
                  className="select select-bordered w-full focus:select-primary"
                  required
                >
                  <option value="">Select your country</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium flex items-center gap-2">
                    <MapPinIcon className="size-4" />
                    City (Optional)
                  </span>
                </label>
                <input
                  type="text"
                  value={formState.location}
                  onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                  className="input input-bordered w-full focus:input-primary"
                  placeholder="Your city"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1 gap-2 bg-gradient-to-r from-primary to-secondary border-none shadow-md"
                  disabled={isPending || uploading}
                >
                  {isPending ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="size-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <h2 className="text-xl font-bold border-b border-base-300 pb-3">
                Profile Information
              </h2>

              <div>
                <p className="text-xs uppercase opacity-50 font-semibold mb-2 flex items-center gap-2">
                  <BookOpenIcon className="size-3.5" />
                  About Me
                </p>
                {authUser.bio ? (
                  <p className="text-sm bg-base-100 rounded-xl p-4 border border-base-300 italic">
                    "{authUser.bio}"
                  </p>
                ) : (
                  <p className="text-sm opacity-50 italic">No bio yet. Click edit to add one.</p>
                )}
              </div>

              <div>
                <p className="text-xs uppercase opacity-50 font-semibold mb-2 flex items-center gap-2">
                  <GlobeIcon className="size-3.5" />
                  Location
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-base-100 rounded-xl p-3 border border-base-300 flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <GlobeIcon className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs opacity-60">Country</p>
                      <p className="font-semibold text-sm">
                        {authUser.country || "Not set"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-base-100 rounded-xl p-3 border border-base-300 flex items-center gap-3">
                    <div className="p-2 bg-secondary/10 rounded-lg">
                      <MapPinIcon className="size-4 text-secondary" />
                    </div>
                    <div>
                      <p className="text-xs opacity-60">City</p>
                      <p className="font-semibold text-sm">
                        {authUser.location || "Not set"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isEditing && (
        <div className="card bg-base-200 border border-error/30 shadow-md">
          <div className="card-body p-6">
            <h2 className="text-xl font-bold text-error border-b border-base-300 pb-3 mb-3">
              Account Actions
            </h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">Sign Out</p>
                <p className="text-xs opacity-70">Logout from your account on this device</p>
              </div>
              <button
                onClick={logoutMutation}
                className="btn btn-error btn-sm gap-2 w-full sm:w-auto"
              >
                <LogOutIcon className="size-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <ImageViewer
        imageUrl={authUser.profilePic}
        userName={authUser.fullName}
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
      />
    </div>
  );
};

export default ProfilePage;