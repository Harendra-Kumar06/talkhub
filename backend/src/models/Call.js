import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // For 1-to-1 calls
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // For group calls
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    // All invited participants (for group calls)
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isGroupCall: {
      type: Boolean,
      default: false,
    },
    channelId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["video", "audio"],
      default: "video",
    },
    status: {
      type: String,
      enum: ["ringing", "accepted", "rejected", "missed", "ended", "cancelled"],
      default: "ringing",
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    answeredAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    duration: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Call = mongoose.model("Call", callSchema);
export default Call;