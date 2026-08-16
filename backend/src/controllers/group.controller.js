import Group from "../models/Group.js";
import User from "../models/User.js";
import { streamClient } from "../lib/stream.js";
import crypto from "crypto";

/**
 * Create a new group
 * Body: { name, description, avatar, memberIds: [] }
 */
export async function createGroup(req, res) {
  try {
    const { name, description, avatar, memberIds = [] } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: "Group name required (min 2 chars)" });
    }

    if (!Array.isArray(memberIds) || memberIds.length < 1) {
      return res.status(400).json({ message: "Add at least 1 member" });
    }

    // Verify all memberIds are friends of creator
    const me = await User.findById(req.user._id).select("friends");
    const friendSet = new Set(me.friends.map((f) => f.toString()));
    const invalidMembers = memberIds.filter((id) => !friendSet.has(id));
    if (invalidMembers.length > 0) {
      return res.status(400).json({ message: "You can only add your friends" });
    }

    // Generate unique Stream channel ID
    const streamChannelId = `group-${crypto.randomBytes(8).toString("hex")}`;

    // Creator is auto-admin + member
    const uniqueMembers = [...new Set([req.user._id.toString(), ...memberIds])];

    const group = await Group.create({
      name: name.trim(),
      description: description || "",
      avatar: avatar || "",
      creator: req.user._id,
      admins: [req.user._id],
      members: uniqueMembers,
      streamChannelId,
    });

    // Create the Stream channel
    try {
      const channel = streamClient.channel("messaging", streamChannelId, {
        name: group.name,
        image: group.avatar,
        created_by_id: req.user._id.toString(),
        members: uniqueMembers.map((id) => id.toString()),
        talkhub_group_id: group._id.toString(),
        talkhub_is_group: true,
      });
      await channel.create();
    } catch (streamErr) {
      console.error("Stream channel creation failed:", streamErr.message);
      // Rollback DB group if Stream fails
      await Group.findByIdAndDelete(group._id);
      return res.status(500).json({ message: "Failed to create chat channel" });
    }

    const populated = await Group.findById(group._id)
      .populate("creator", "fullName profilePic")
      .populate("admins", "fullName profilePic")
      .populate("members", "fullName profilePic country isOnline");

    res.status(201).json({ success: true, group: populated });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Get all my groups
 */
export async function getMyGroups(req, res) {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("creator", "fullName profilePic")
      .populate("admins", "fullName profilePic")
      .populate("members", "fullName profilePic country isOnline")
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, groups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Get a single group with details
 */
export async function getGroupById(req, res) {
  try {
    const { id } = req.params;
    const group = await Group.findById(id)
      .populate("creator", "fullName profilePic")
      .populate("admins", "fullName profilePic")
      .populate("members", "fullName profilePic country isOnline lastSeen");

    if (!group) return res.status(404).json({ message: "Group not found" });

    const isMember = group.members.some(
      (m) => m._id.toString() === req.user._id.toString()
    );
    if (!isMember) return res.status(403).json({ message: "Not a member" });

    res.status(200).json({ success: true, group });
  } catch (error) {
    console.error("Error fetching group:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Add member(s) to group (admin only)
 * Body: { userIds: [] }
 */
export async function addMembers(req, res) {
  try {
    const { id } = req.params;
    const { userIds = [] } = req.body;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAdmin = group.admins.some(
      (a) => a.toString() === req.user._id.toString()
    );
    if (!isAdmin) return res.status(403).json({ message: "Admin only" });

    // Verify all are friends of the admin
    const me = await User.findById(req.user._id).select("friends");
    const friendSet = new Set(me.friends.map((f) => f.toString()));
    const invalid = userIds.filter((id) => !friendSet.has(id));
    if (invalid.length > 0) {
      return res.status(400).json({ message: "Can only add your friends" });
    }

    userIds.forEach((uid) => {
      if (!group.members.some((m) => m.toString() === uid)) {
        group.members.push(uid);
      }
    });
    await group.save();

    // Update Stream channel
    try {
      const channel = streamClient.channel("messaging", group.streamChannelId);
      await channel.addMembers(userIds.map((id) => id.toString()));
    } catch (e) {
      console.error("Stream addMembers failed:", e.message);
    }

    const updated = await Group.findById(id)
      .populate("members", "fullName profilePic country isOnline")
      .populate("admins", "fullName profilePic");

    res.status(200).json({ success: true, group: updated });
  } catch (error) {
    console.error("Error adding members:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Remove a member (admin only, cannot remove other admins unless creator)
 */
export async function removeMember(req, res) {
  try {
    const { id, userId } = req.params;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAdmin = group.admins.some(
      (a) => a.toString() === req.user._id.toString()
    );
    if (!isAdmin) return res.status(403).json({ message: "Admin only" });

    // Cannot remove creator
    if (group.creator.toString() === userId) {
      return res.status(400).json({ message: "Cannot remove group creator" });
    }

    // Only creator can remove other admins
    const targetIsAdmin = group.admins.some((a) => a.toString() === userId);
    if (targetIsAdmin && group.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only creator can remove admins" });
    }

    group.members = group.members.filter((m) => m.toString() !== userId);
    group.admins = group.admins.filter((a) => a.toString() !== userId);
    await group.save();

    // Update Stream
    try {
      const channel = streamClient.channel("messaging", group.streamChannelId);
      await channel.removeMembers([userId]);
    } catch (e) {
      console.error("Stream removeMembers failed:", e.message);
    }

    res.status(200).json({ success: true, message: "Member removed" });
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Leave group (self)
 */
export async function leaveGroup(req, res) {
  try {
    const { id } = req.params;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Creator cannot leave (must delete instead)
    if (group.creator.toString() === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "Creator must delete the group instead" });
    }

    const userIdStr = req.user._id.toString();
    group.members = group.members.filter((m) => m.toString() !== userIdStr);
    group.admins = group.admins.filter((a) => a.toString() !== userIdStr);
    await group.save();

    try {
      const channel = streamClient.channel("messaging", group.streamChannelId);
      await channel.removeMembers([userIdStr]);
    } catch (e) {
      console.error("Stream leave failed:", e.message);
    }

    res.status(200).json({ success: true, message: "Left group" });
  } catch (error) {
    console.error("Error leaving group:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Promote a member to admin (admin only)
 */
export async function promoteToAdmin(req, res) {
  try {
    const { id, userId } = req.params;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAdmin = group.admins.some(
      (a) => a.toString() === req.user._id.toString()
    );
    if (!isAdmin) return res.status(403).json({ message: "Admin only" });

    const isMember = group.members.some((m) => m.toString() === userId);
    if (!isMember) return res.status(400).json({ message: "User not in group" });

    if (!group.admins.some((a) => a.toString() === userId)) {
      group.admins.push(userId);
      await group.save();
    }

    res.status(200).json({ success: true, message: "Promoted to admin" });
  } catch (error) {
    console.error("Error promoting:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Demote an admin (only creator can do this)
 */
export async function demoteAdmin(req, res) {
  try {
    const { id, userId } = req.params;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only creator can demote admins" });
    }

    if (group.creator.toString() === userId) {
      return res.status(400).json({ message: "Cannot demote creator" });
    }

    group.admins = group.admins.filter((a) => a.toString() !== userId);
    await group.save();

    res.status(200).json({ success: true, message: "Demoted to member" });
  } catch (error) {
    console.error("Error demoting:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Delete group (creator only)
 */
export async function deleteGroup(req, res) {
  try {
    const { id } = req.params;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (group.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only creator can delete" });
    }

    // Delete Stream channel
    try {
      const channel = streamClient.channel("messaging", group.streamChannelId);
      await channel.delete();
    } catch (e) {
      console.error("Stream channel delete failed:", e.message);
    }

    await Group.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: "Group deleted" });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Update group info (admin only)
 * Body: { name, description, avatar }
 */
export async function updateGroup(req, res) {
  try {
    const { id } = req.params;
    const { name, description, avatar } = req.body;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isAdmin = group.admins.some(
      (a) => a.toString() === req.user._id.toString()
    );
    if (!isAdmin) return res.status(403).json({ message: "Admin only" });

    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description;
    if (avatar !== undefined) group.avatar = avatar;

    await group.save();

    // Update Stream channel
    try {
      const channel = streamClient.channel("messaging", group.streamChannelId);
      await channel.updatePartial({
        set: { name: group.name, image: group.avatar },
      });
    } catch (e) {
      console.error("Stream update failed:", e.message);
    }

    res.status(200).json({ success: true, group });
  } catch (error) {
    console.error("Error updating group:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}