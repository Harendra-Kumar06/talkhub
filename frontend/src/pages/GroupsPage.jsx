import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UsersIcon, PlusIcon } from "lucide-react";
import CreateGroupModal from "../components/CreateGroupModal";
import { useNavigate } from "react-router";
import { getStreamClient } from "../lib/streamClient";
import useAuthUser from "../hooks/useAuthUser";

const GroupsPage = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groups, setGroups] = useState([]);
  const { authUser } = useAuthUser();
  const navigate = useNavigate();

  // Fetch groups when page loads
  const fetchGroups = async () => {
    if (!authUser) return;
    const client = getStreamClient();
    const channels = await client.queryChannels(
      {
        type: "team",
        members: { $in: [authUser._id] },
      },
      { last_message_at: -1 }
    );
    setGroups(channels);
  };

  // You can call fetchGroups() on mount if you want
  // For simplicity, we'll show a button to refresh

  const openGroup = (channel) => {
    navigate(`/chat/${channel.id}?type=group`);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary text-primary-content rounded-xl">
            <UsersIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Groups</h1>
            <p className="text-sm opacity-70">{groups.length} groups</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary gap-2"
        >
          <PlusIcon className="size-4" />
          Create Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16">
          <UsersIcon className="size-16 mx-auto opacity-30 mb-4" />
          <p className="text-lg opacity-70">No groups yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary mt-4"
          >
            Create your first group
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((channel) => (
            <div
              key={channel.id}
              onClick={() => openGroup(channel)}
              className="card bg-base-200 hover:bg-base-300 cursor-pointer p-4 flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold">{channel.data.name || "Unnamed Group"}</h3>
                <p className="text-xs opacity-60">
                  {Object.keys(channel.state.members).length} members
                </p>
              </div>
              <div className="badge badge-primary">Group</div>
            </div>
          ))}
        </div>
      )}

      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGroupCreated={fetchGroups}
      />
    </div>
  );
};

export default GroupsPage;