import crypto from "crypto";
import Call from "../models/Call.js";
import User from "../models/User.js";
import Group from "../models/Group.js";
import { streamClient } from "../lib/stream.js";

const generateCallId = () =>
  `call_${crypto.randomBytes(8).toString("hex")}_${Date.now()}`;

const generateChannelId = (a, b) => [a, b].sort().join("-");

const getSignalingChannelId = (userId) => `signal-${userId}`;

async function sendEventToUser(userId, eventPayload) {
  try {
    const userIdStr = String(userId);
    console.log(`📤 Attempting to send ${eventPayload.type} to user ${userIdStr}`);

    // Ensure user exists in Stream
    await streamClient.upsertUsers([{ id: userIdStr }]);

    const channelId = getSignalingChannelId(userIdStr);
    const channel = streamClient.channel("messaging", channelId, {
      created_by_id: userIdStr,
      members: [userIdStr],
    });

    // Ensure channel exists AND user is a member
    try {
      await channel.create();
      console.log(`   📝 Created signal channel ${channelId}`);
    } catch (e) {
      // Channel exists — ensure user is a member (critical for delivery!)
      try {
        await channel.addMembers([userIdStr]);
      } catch (addErr) {
        // Already a member — fine
      }
    }

    // Send the event
    await channel.sendEvent({
      type: eventPayload.type,
      data: eventPayload,
      user_id: userIdStr,
    });

    console.log(`✅ Sent ${eventPayload.type} to user ${userIdStr}`);
    return true;
  } catch (e) {
    console.error(`❌ Failed to send ${eventPayload.type} to user ${userId}:`, e.message);
    console.error(`   Stack:`, e.stack?.split("\n").slice(0, 3).join("\n"));
    return false;
  }
}

export async function initiateCall(req, res) {
  try {
    const { recipientId, type = "video" } = req.body;
    const callerId = req.user._id.toString();

    if (!recipientId) return res.status(400).json({ message: "recipientId is required" });
    if (recipientId === callerId) return res.status(400).json({ message: "You can't call yourself" });

    const recipient = await User.findById(recipientId).select("fullName profilePic");
    if (!recipient) return res.status(404).json({ message: "Recipient not found" });

    await Call.updateMany(
      {
        status: "ringing",
        $or: [
          { caller: callerId, recipient: recipientId },
          { caller: recipientId, recipient: callerId },
        ],
      },
      { status: "cancelled", endedAt: new Date() }
    );

    const callId = generateCallId();
    const channelId = generateChannelId(callerId, recipientId);

    const call = await Call.create({
      callId,
      caller: callerId,
      recipient: recipientId,
      channelId,
      type,
      status: "ringing",
      isGroupCall: false,
    });

    await sendEventToUser(recipientId, {
      type: "call_incoming",
      callId,
      callerId,
      callerName: req.user.fullName,
      callerImage: req.user.profilePic || "",
      recipientId,
      callType: type,
      channelId,
      isGroupCall: false,
    });

    res.status(201).json({
      success: true,
      call: {
        _id: call._id,
        callId: call.callId,
        channelId: call.channelId,
        type: call.type,
        status: call.status,
        isGroupCall: false,
        recipient: {
          _id: recipient._id,
          fullName: recipient.fullName,
          profilePic: recipient.profilePic,
        },
      },
    });
  } catch (error) {
    console.error("initiateCall error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// 🔑 NEW: Group call
export async function initiateGroupCall(req, res) {
  try {
    const { groupId, type = "video" } = req.body;
    const callerId = req.user._id.toString();

    if (!groupId) return res.status(400).json({ message: "groupId is required" });

    const group = await Group.findById(groupId)
      .populate("members", "fullName profilePic");
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Verify caller is a member
    const isMember = group.members.some((m) => m._id.toString() === callerId);
    if (!isMember) return res.status(403).json({ message: "Not a group member" });

    // Check if there's already an active call for this group
    const existingCall = await Call.findOne({
      group: groupId,
      status: { $in: ["ringing", "accepted"] },
    });

    if (existingCall) {
      // Just return existing call so caller can join
      return res.status(200).json({
        success: true,
        alreadyActive: true,
        call: {
          _id: existingCall._id,
          callId: existingCall.callId,
          channelId: existingCall.channelId,
          type: existingCall.type,
          status: existingCall.status,
          isGroupCall: true,
          group: {
            _id: group._id,
            name: group.name,
            avatar: group.avatar,
          },
        },
      });
    }

    const callId = generateCallId();
    // Use group's stream channel ID prefix for call room
    const channelId = `groupcall-${groupId}-${crypto.randomBytes(4).toString("hex")}`;

    const otherMemberIds = group.members
      .map((m) => m._id.toString())
      .filter((id) => id !== callerId);

    const call = await Call.create({
      callId,
      caller: callerId,
      group: groupId,
      participants: group.members.map((m) => m._id),
      channelId,
      type,
      status: "ringing",
      isGroupCall: true,
    });

    // Notify all OTHER group members
    const notifyPromises = otherMemberIds.map((memberId) =>
      sendEventToUser(memberId, {
        type: "call_incoming",
        callId,
        callerId,
        callerName: req.user.fullName,
        callerImage: req.user.profilePic || "",
        callType: type,
        channelId,
        isGroupCall: true,
        groupId: group._id.toString(),
        groupName: group.name,
        groupAvatar: group.avatar || "",
        memberCount: group.members.length,
      })
    );
    await Promise.all(notifyPromises);

    res.status(201).json({
      success: true,
      call: {
        _id: call._id,
        callId: call.callId,
        channelId: call.channelId,
        type: call.type,
        status: call.status,
        isGroupCall: true,
        group: {
          _id: group._id,
          name: group.name,
          avatar: group.avatar,
        },
      },
    });
  } catch (error) {
    console.error("initiateGroupCall error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function acceptCall(req, res) {
  try {
    const { callId } = req.params;
    const userId = req.user._id.toString();

    const call = await Call.findOne({ callId });
    if (!call) return res.status(404).json({ message: "Call not found" });

    // For group calls, any invited participant can accept
    if (call.isGroupCall) {
      const isParticipant = call.participants.some((p) => p.toString() === userId);
      if (!isParticipant) return res.status(403).json({ message: "Not invited" });
      if (call.status === "ended" || call.status === "cancelled")
        return res.status(400).json({ message: `Call is ${call.status}` });
    } else {
      if (call.recipient.toString() !== userId)
        return res.status(403).json({ message: "Not your call to accept" });
      if (call.status !== "ringing")
        return res.status(400).json({ message: `Call is already ${call.status}` });
    }

    // Only update status once (from ringing → accepted)
    if (call.status === "ringing") {
      call.status = "accepted";
      call.answeredAt = new Date();
      await call.save();
    }

    // Notify caller (only for 1-to-1)
    if (!call.isGroupCall) {
      await sendEventToUser(call.caller.toString(), {
        type: "call_accepted",
        callId,
      });
    }

    res.status(200).json({ success: true, call });
  } catch (error) {
    console.error("acceptCall error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function rejectCall(req, res) {
  try {
    const { callId } = req.params;
    const userId = req.user._id.toString();

    const call = await Call.findOne({ callId });
    if (!call) return res.status(404).json({ message: "Call not found" });

    // Group call: just dismiss for this user, don't affect others
    if (call.isGroupCall) {
      // Nothing to do server-side beyond acknowledging
      return res.status(200).json({ success: true, dismissed: true });
    }

    if (call.recipient.toString() !== userId)
      return res.status(403).json({ message: "Not your call to reject" });
    if (call.status !== "ringing")
      return res.status(400).json({ message: `Call is ${call.status}` });

    call.status = "rejected";
    call.endedAt = new Date();
    await call.save();

    await sendEventToUser(call.caller.toString(), {
      type: "call_rejected",
      callId,
    });

    res.status(200).json({ success: true, call });
  } catch (error) {
    console.error("rejectCall error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function cancelCall(req, res) {
  try {
    const { callId } = req.params;
    const userId = req.user._id.toString();

    const call = await Call.findOne({ callId });
    if (!call) return res.status(404).json({ message: "Call not found" });
    if (call.caller.toString() !== userId)
      return res.status(403).json({ message: "Not your call to cancel" });
    if (call.status !== "ringing")
      return res.status(400).json({ message: `Call is ${call.status}` });

    call.status = "cancelled";
    call.endedAt = new Date();
    await call.save();

    if (call.isGroupCall) {
      // Notify all other participants
      const others = call.participants.filter((p) => p.toString() !== userId);
      await Promise.all(
        others.map((p) =>
          sendEventToUser(p.toString(), {
            type: "call_cancelled",
            callId,
          })
        )
      );
    } else {
      await sendEventToUser(call.recipient.toString(), {
        type: "call_cancelled",
        callId,
      });
    }

    res.status(200).json({ success: true, call });
  } catch (error) {
    console.error("cancelCall error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// 🔑 Leave group call (doesn't end call for others)
export async function leaveCall(req, res) {
  try {
    const { callId } = req.params;
    const userId = req.user._id.toString();

    const call = await Call.findOne({ callId });
    if (!call) return res.status(404).json({ message: "Call not found" });

    // For 1-to-1 calls, leaving = ending
    if (!call.isGroupCall) {
      if (call.status === "ended") {
        return res.status(200).json({ success: true, call });
      }
      call.status = "ended";
      call.endedAt = new Date();
      if (call.answeredAt) {
        call.duration = Math.max(0, Math.floor((call.endedAt - call.answeredAt) / 1000));
      }
      await call.save();

      const otherUserId =
        call.caller.toString() === userId
          ? call.recipient.toString()
          : call.caller.toString();

      await sendEventToUser(otherUserId, {
        type: "call_ended",
        callId,
        duration: call.duration,
      });

      return res.status(200).json({ success: true, call });
    }

    // 🔑 Group call: just acknowledge — Stream tracks who's actually in the call
    // We don't change status. The call auto-ends when last person leaves the Stream room.
    console.log(`👋 User ${userId} left group call ${callId}`);
    return res.status(200).json({ success: true, left: true });
  } catch (error) {
    console.error("leaveCall error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function endCall(req, res) {
  try {
    const { callId } = req.params;
    const userId = req.user._id.toString();

    const call = await Call.findOne({ callId });
    if (!call) return res.status(404).json({ message: "Call not found" });

    let isParticipant;
    if (call.isGroupCall) {
      isParticipant = call.participants.some((p) => p.toString() === userId);
    } else {
      isParticipant =
        call.caller.toString() === userId || call.recipient.toString() === userId;
    }
    if (!isParticipant) return res.status(403).json({ message: "Not a participant" });

    if (call.status === "ended") {
      return res.status(200).json({ success: true, call });
    }

    call.status = "ended";
    call.endedAt = new Date();
    if (call.answeredAt) {
      call.duration = Math.max(0, Math.floor((call.endedAt - call.answeredAt) / 1000));
    }
    await call.save();

    if (call.isGroupCall) {
      // Notify all OTHER participants that call ended (used only for "End for everyone")
      const others = call.participants.filter((p) => p.toString() !== userId);
      await Promise.all(
        others.map((p) =>
          sendEventToUser(p.toString(), {
            type: "call_ended",
            callId,
            duration: call.duration,
          })
        )
      );
    } else {
      const otherUserId =
        call.caller.toString() === userId
          ? call.recipient.toString()
          : call.caller.toString();

      await sendEventToUser(otherUserId, {
        type: "call_ended",
        callId,
        duration: call.duration,
      });
    }

    res.status(200).json({ success: true, call });
  } catch (error) {
    console.error("endCall error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function missedCall(req, res) {
  try {
    const { callId } = req.params;
    const userId = req.user._id.toString();

    const call = await Call.findOne({ callId });
    if (!call) return res.status(404).json({ message: "Call not found" });
    if (call.caller.toString() !== userId)
      return res.status(403).json({ message: "Not your call" });
    if (call.status !== "ringing")
      return res.status(200).json({ success: true, call });

    call.status = "missed";
    call.endedAt = new Date();
    await call.save();

    if (call.isGroupCall) {
      const others = call.participants.filter((p) => p.toString() !== userId);
      await Promise.all(
        others.map((p) =>
          sendEventToUser(p.toString(), { type: "call_missed", callId })
        )
      );
    } else {
      await sendEventToUser(call.recipient.toString(), {
        type: "call_missed",
        callId,
      });
    }

    res.status(200).json({ success: true, call });
  } catch (error) {
    console.error("missedCall error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getCall(req, res) {
  try {
    const { callId } = req.params;
    const userId = req.user._id.toString();

    const call = await Call.findOne({ callId })
      .populate("caller", "fullName profilePic")
      .populate("recipient", "fullName profilePic")
      .populate("group", "name avatar");

    if (!call) return res.status(404).json({ message: "Call not found" });

    let isParticipant;
    if (call.isGroupCall) {
      isParticipant = call.participants.some((p) => p.toString() === userId);
    } else {
      isParticipant =
        call.caller._id.toString() === userId ||
        call.recipient._id.toString() === userId;
    }

    if (!isParticipant) return res.status(403).json({ message: "Not a participant" });

    res.status(200).json({ call });
  } catch (error) {
    console.error("getCall error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}