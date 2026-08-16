import { useState, useRef } from "react";
import { XIcon, UsersIcon, CameraIcon, CheckIcon, SearchIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserFriends, createGroup, uploadFile } from "../lib/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";

const CreateGroupModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1); // 1 = select friends, 2 = group details
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: friends = [] } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    enabled: isOpen,
  });

  const { mutate: createMutation, isPending } = useMutation({
    mutationFn: createGroup,
    onSuccess: (data) => {
      toast.success(`Group "${data.group.name}" created!`);
      queryClient.invalidateQueries({ queryKey: ["myGroups"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      handleClose();
      // Navigate to the group chat
      navigate(`/chat/group-${data.group._id}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create group");
    },
  });

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const result = await uploadFile(file);
      setAvatarUrl(result.url);
      toast.success("Avatar uploaded!");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = () => {
    if (!groupName.trim() || groupName.trim().length < 2) {
      toast.error("Group name must be at least 2 characters");
      return;
    }
    if (selectedMembers.length < 1) {
      toast.error("Add at least 1 member");
      return;
    }

    createMutation({
      name: groupName.trim(),
      description: groupDescription.trim(),
      avatar: avatarUrl,
      memberIds: selectedMembers,
    });
  };

  const handleClose = () => {
    setStep(1);
    setGroupName("");
    setGroupDescription("");
    setAvatarUrl("");
    setSelectedMembers([]);
    setSearchQuery("");
    onClose();
  };

  const filteredFriends = friends.filter((f) =>
    f.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-base-100 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-primary to-secondary text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersIcon className="size-5" />
            <h2 className="text-lg font-bold">
              {step === 1 ? "Add Members" : "Group Details"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="btn btn-sm btn-circle bg-white/20 hover:bg-white/30 border-none text-white"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 p-2 bg-base-200">
          <div className={`flex-1 h-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-base-300"}`} />
          <div className={`flex-1 h-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-base-300"}`} />
        </div>

        {step === 1 ? (
          /* STEP 1: SELECT MEMBERS */
          <>
            <div className="p-4">
              <div className="relative mb-3">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-50" />
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input input-bordered input-sm w-full pl-10"
                />
              </div>

              {selectedMembers.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {selectedMembers.map((id) => {
                    const f = friends.find((x) => x._id === id);
                    if (!f) return null;
                    return (
                      <span
                        key={id}
                        className="badge badge-primary gap-1 py-3"
                      >
                        {f.fullName}
                        <button
                          onClick={() => toggleMember(id)}
                          className="hover:bg-white/20 rounded-full"
                        >
                          <XIcon className="size-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="max-h-64 overflow-y-auto space-y-1 border border-base-300 rounded-xl p-2">
                {filteredFriends.length === 0 ? (
                  <p className="text-sm opacity-60 p-4 text-center">
                    {friends.length === 0 ? "No friends yet" : "No matches"}
                  </p>
                ) : (
                  filteredFriends.map((friend) => {
                    const isSelected = selectedMembers.includes(friend._id);
                    return (
                      <button
                        key={friend._id}
                        onClick={() => toggleMember(friend._id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          isSelected ? "bg-primary/10" : "hover:bg-base-200"
                        }`}
                      >
                        <div className="avatar">
                          <div className="w-10 h-10 rounded-full ring-2 ring-primary/20">
                            <img src={friend.profilePic} alt={friend.fullName} />
                          </div>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-sm">{friend.fullName}</p>
                          {friend.country && (
                            <p className="text-xs opacity-60">{friend.country}</p>
                          )}
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-base-content/30"
                          }`}
                        >
                          {isSelected && <CheckIcon className="size-4 text-white" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <p className="text-xs opacity-60 mt-2 text-center">
                {selectedMembers.length} selected
              </p>
            </div>

            <div className="p-4 border-t border-base-300 flex gap-2">
              <button onClick={handleClose} className="btn btn-outline flex-1">
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={selectedMembers.length < 1}
                className="btn btn-primary flex-1 bg-gradient-to-r from-primary to-secondary border-none"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          /* STEP 2: GROUP DETAILS */
          <>
            <div className="p-4 space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="relative group"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 ring-4 ring-primary/20 overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Group avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UsersIcon className="size-8 opacity-40" />
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <CameraIcon className="size-6 text-white" />
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                      <span className="loading loading-spinner loading-md text-white" />
                    </div>
                  )}
                </button>
                <p className="text-xs opacity-60">Click to upload avatar</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium">Group Name *</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Family, Friends, Work"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={50}
                  className="input input-bordered w-full focus:input-primary"
                  autoFocus
                />
                <p className="text-xs opacity-60 mt-1 text-right">
                  {groupName.length}/50
                </p>
              </div>

              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium">Description</span>
                </label>
                <textarea
                  placeholder="What's this group about? (optional)"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  maxLength={200}
                  className="textarea textarea-bordered h-20 focus:textarea-primary"
                />
                <p className="text-xs opacity-60 mt-1 text-right">
                  {groupDescription.length}/200
                </p>
              </div>

              <div className="bg-base-200 rounded-xl p-3 text-xs opacity-70">
                <p className="font-medium mb-1">Members ({selectedMembers.length}):</p>
                <p className="line-clamp-2">
                  {selectedMembers
                    .map((id) => friends.find((f) => f._id === id)?.fullName)
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-base-300 flex gap-2">
              <button
                onClick={() => setStep(1)}
                disabled={isPending}
                className="btn btn-outline flex-1"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={isPending || uploading}
                className="btn btn-primary flex-1 gap-2 bg-gradient-to-r from-primary to-secondary border-none"
              >
                {isPending ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UsersIcon className="size-4" />
                    Create Group
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CreateGroupModal;