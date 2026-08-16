import mongoose from "mongoose";

const hiddenMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    messageId: {
      type: String,
      required: true,
    },
    channelId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

hiddenMessageSchema.index({ user: 1, messageId: 1 }, { unique: true });

const HiddenMessage = mongoose.model("HiddenMessage", hiddenMessageSchema);
export default HiddenMessage;