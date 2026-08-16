import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGroupById,
  leaveGroup,
  deleteGroup,
  removeGroupMember,
  promoteToAdmin,
  demoteAdmin,
  addGroupMembers,
  getUserFriends,
  updateGroup,
  uploadFile,
  initiateGroupCall,
} from "../lib/api";
import useAuthUser from "../hooks/useAuthUser";
import {
  ArrowLeftIcon,
  UsersIcon,
  ShieldIcon,
  UserMinusIcon,
  UserPlusIcon,
  LogOutIcon,
  Trash2Icon,
  CrownIcon,
  ShieldOffIcon,
  XIcon,
  EditIcon,
  CheckIcon,
  CameraIcon,
  VideoIcon,
} from "lucide-react";
import toast from "react-hot-toast";

const GroupInfoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedNew, setSelectedNew] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["group", id],
    queryFn: () => getGroupById(id),
  });

  const { data: friends = [] } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    enabled: showAddMembers,
  });

  const group = data?.group;
  const isCreator = group?.creator._id === authUser?._id;
  const isAdmin = group?.admins.some((a) => a._id === authUser?._id);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["group", id] });
    queryClient.invalidateQueries({ queryKey: ["myGroups"] });
  };

  // 🔑 Start Group Call
  const { mutate: startGroupCall, isPending: startingCall } = useMutation({
    mutationFn: () => initiateGroupCall({ groupId: id, type: "video" }),
    onSuccess: (data) => {
      const c = data.call;

      // Show outgoing modal
      if (window.__startOutgoingCall) {
        window.__startOutgoingCall({
          callId: c.callId,
          isGroupCall: true,
          recipient: {
            fullName: c.group?.name || group.name,
            profilePic: c.group?.avatar || group.avatar,
          },
          type: c.type,
        });
      }

      // Navigate to call page immediately (caller joins straight away)
      navigate(`/call/${c.callId}`);

      if (data.alreadyActive) {
        toast("Joining ongoing group call", { icon: "📞" });
      }
    },
    onError: (e) => {
      toast.error(e.response?.data?.message || "Failed to start call");
    },
  });

  const { mutate: doLeave } = useMutation({
    mutationFn: () => leaveGroup(id),
    onSuccess: () => {
      toast.success("Left group");
      queryClient.invalidateQueries({ queryKey: ["myGroups"] });
      navigate("/friends");
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });

  const { mutate: doDelete } = useMutation({
    mutationFn: () => deleteGroup(id),
    onSuccess: () => {
      toast.success("Group deleted");
      queryClient.invalidateQueries({ queryKey: ["myGroups"] });
      navigate("/friends");
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });

  const { mutate: doRemove } = useMutation({
    mutationFn: (userId) => removeGroupMember(id, userId),
    onSuccess: () => { toast.success("Member removed"); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });

  const { mutate: doPromote } = useMutation({
    mutationFn: (userId) => promoteToAdmin(id, userId),
    onSuccess: () => { toast.success("Promoted to admin"); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });

  const { mutate: doDemote } = useMutation({
    mutationFn: (userId) => demoteAdmin(id, userId),
    onSuccess: () => { toast.success("Demoted to member"); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });

  const { mutate: doAddMembers, isPending: adding } = useMutation({
    mutationFn: (userIds) => addGroupMembers(id, userIds),
    onSuccess: () => {
      toast.success("Members added");
      setShowAddMembers(false);
      setSelectedNew([]);
      invalidate();
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });

  const { mutate: doUpdate, isPending: updating } = useMutation({
    mutationFn: (payload) => updateGroup(id, payload),
    onSuccess: () => { toast.success("Group updated"); setEditing(false); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });

  const handleEditStart = () => {
    setEditName(group.name);
    setEditDesc(group.description);
    setEditing(true);
  };

  const handleEditSave = () => {
    if (!editName.trim()) return toast.error("Name required");
    doUpdate({ name: editName.trim(), description: editDesc.trim() });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Image only");
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");

    setUploading(true);
    try {
      const result = await uploadFile(file);
      doUpdate({ avatar: result.url });
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const notMembers = friends.filter(
    (f) => !group?.members.some((m) => m._id === f._id)
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="btn btn-ghost btn-circle btn-sm"
        >
          <ArrowLeftIcon className="size-5" />
        </button>
        <h1 className="text-2xl font-bold flex-1">Group Info</h1>

        {/* 🔑 START GROUP CALL BUTTON */}
        <button
          onClick={() => startGroupCall()}
          disabled={startingCall}
          className="btn btn-success btn-sm gap-2 text-white"
          title="Start group video call"
        >
          {startingCall ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <VideoIcon className="size-4" />
          )}
          Call
        </button>
      </div>

      {/* GROUP CARD */}
      <div className="card bg-base-200 border border-base-300 shadow-md">
        <div className="card-body p-6">
          <div className="flex flex-col items-center gap-3">
            <label className={`relative ${isAdmin ? "cursor-pointer" : ""} group`}>
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 ring-4 ring-primary/30 overflow-hidden flex items-center justify-center">
                {group.avatar ? (
                  <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
                ) : (
                  <UsersIcon className="size-10 opacity-40" />
                )}
              </div>
              {isAdmin && (
                <>
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <CameraIcon className="size-6 text-white" />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </>
              )}
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                  <span className="loading loading-spinner text-white" />
                </div>
              )}
            </label>

            {editing ? (
              <div className="w-full space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={50}
                  className="input input-bordered w-full text-center font-bold"
                />
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  maxLength={200}
                  placeholder="Description (optional)"
                  className="textarea textarea-bordered w-full h-16 text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="btn btn-sm btn-outline flex-1">
                    Cancel
                  </button>
                  <button onClick={handleEditSave} disabled={updating} className="btn btn-sm btn-primary flex-1 gap-1">
                    <CheckIcon className="size-4" /> Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="flex items-center gap-2 justify-center">
                  <h2 className="text-2xl font-bold">{group.name}</h2>
                  {isAdmin && (
                    <button onClick={handleEditStart} className="btn btn-ghost btn-xs btn-circle" title="Edit">
                      <EditIcon className="size-3.5" />
                    </button>
                  )}
                </div>
                {group.description && (
                  <p className="text-sm opacity-70 mt-1">{group.description}</p>
                )}
                <p className="text-xs opacity-50 mt-2">
                  Created by {group.creator.fullName}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MEMBERS */}
      <div className="card bg-base-200 border border-base-300 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2">
              <UsersIcon className="size-4" />
              {group.members.length} Members
            </h3>
            {isAdmin && (
              <button onClick={() => setShowAddMembers(true)} className="btn btn-primary btn-sm gap-1">
                <UserPlusIcon className="size-4" />
                Add
              </button>
            )}
          </div>

          <div className="space-y-1">
            {group.members.map((member) => {
              const memberIsAdmin = group.admins.some((a) => a._id === member._id);
              const memberIsCreator = group.creator._id === member._id;
              const isMe = member._id === authUser?._id;

              return (
                <div key={member._id} className="flex items-center gap-3 p-2 hover:bg-base-300 rounded-lg">
                  <div className="avatar">
                    <div className="w-10 h-10 rounded-full ring-2 ring-primary/20">
                      <img src={member.profilePic} alt={member.fullName} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">
                        {member.fullName}
                        {isMe && <span className="opacity-60 ml-1">(You)</span>}
                      </p>
                      {memberIsCreator && (
                        <span className="badge badge-warning badge-xs gap-1">
                          <CrownIcon className="size-2.5" />
                          Creator
                        </span>
                      )}
                      {memberIsAdmin && !memberIsCreator && (
                        <span className="badge badge-primary badge-xs gap-1">
                          <ShieldIcon className="size-2.5" />
                          Admin
                        </span>
                      )}
                    </div>
                    {member.country && (
                      <p className="text-xs opacity-60">{member.country}</p>
                    )}
                  </div>

                  {!isMe && isAdmin && !memberIsCreator && (
                    <div className="flex gap-1">
                      {memberIsAdmin ? (
                        isCreator && (
                          <button onClick={() => doDemote(member._id)} className="btn btn-ghost btn-xs btn-square" title="Demote">
                            <ShieldOffIcon className="size-4" />
                          </button>
                        )
                      ) : (
                        <button onClick={() => doPromote(member._id)} className="btn btn-ghost btn-xs btn-square text-primary" title="Promote to admin">
                          <ShieldIcon className="size-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm(`Remove ${member.fullName}?`)) doRemove(member._id);
                        }}
                        className="btn btn-ghost btn-xs btn-square text-error"
                        title="Remove"
                      >
                        <UserMinusIcon className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* DANGER ZONE */}
      <div className="card bg-base-200 border border-error/30 shadow-md">
        <div className="card-body p-4 space-y-2">
          <h3 className="font-bold text-error mb-2">Actions</h3>

          {!isCreator && (
            <button
              onClick={() => { if (window.confirm("Leave this group?")) doLeave(); }}
              className="btn btn-outline btn-error w-full gap-2"
            >
              <LogOutIcon className="size-4" />
              Leave Group
            </button>
          )}

          {isCreator && (
            <button
              onClick={() => {
                if (window.confirm(`Delete "${group.name}"? This cannot be undone.`)) doDelete();
              }}
              className="btn btn-error w-full gap-2"
            >
              <Trash2Icon className="size-4" />
              Delete Group
            </button>
          )}
        </div>
      </div>

      {/* ADD MEMBERS MODAL */}
      {showAddMembers && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddMembers(false)}
        >
          <div className="bg-base-100 rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-base-300 flex items-center justify-between">
              <h3 className="font-bold">Add Members</h3>
              <button onClick={() => setShowAddMembers(false)} className="btn btn-ghost btn-sm btn-circle">
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="p-4">
              {notMembers.length === 0 ? (
                <p className="text-sm opacity-60 text-center py-4">
                  All your friends are already in this group
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {notMembers.map((f) => {
                    const isSelected = selectedNew.includes(f._id);
                    return (
                      <button
                        key={f._id}
                        onClick={() =>
                          setSelectedNew((prev) =>
                            isSelected ? prev.filter((id) => id !== f._id) : [...prev, f._id]
                          )
                        }
                        className={`w-full flex items-center gap-3 p-2 rounded-lg ${
                          isSelected ? "bg-primary/10" : "hover:bg-base-200"
                        }`}
                      >
                        <div className="avatar">
                          <div className="w-8 h-8 rounded-full">
                            <img src={f.profilePic} alt={f.fullName} />
                          </div>
                        </div>
                        <span className="flex-1 text-left text-sm">{f.fullName}</span>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? "bg-primary border-primary" : "border-base-content/30"
                          }`}
                        >
                          {isSelected && <CheckIcon className="size-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-base-300 flex gap-2">
              <button onClick={() => setShowAddMembers(false)} className="btn btn-outline flex-1">
                Cancel
              </button>
              <button
                onClick={() => doAddMembers(selectedNew)}
                disabled={selectedNew.length === 0 || adding}
                className="btn btn-primary flex-1"
              >
                {adding ? "Adding..." : `Add ${selectedNew.length}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupInfoPage;