import Status from "../models/Status.js";
import User from "../models/User.js";

/**
 * Create a new status (image or video)
 * Body: { mediaUrl, mediaType, caption }
 */
export async function createStatus(req, res) {
  try {
    const { mediaUrl, mediaType, caption } = req.body;

    if (!mediaUrl || !mediaType) {
      return res.status(400).json({ message: "mediaUrl and mediaType are required" });
    }

    if (!["image", "video"].includes(mediaType)) {
      return res.status(400).json({ message: "mediaType must be 'image' or 'video'" });
    }

    // 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const status = await Status.create({
      user: req.user._id,
      mediaUrl,
      mediaType,
      caption: caption || "",
      expiresAt,
    });

    const populated = await Status.findById(status._id).populate(
      "user",
      "fullName profilePic country"
    );

    res.status(201).json({ success: true, status: populated });
  } catch (error) {
    console.error("Error creating status:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Get all statuses (mine + friends), grouped by user
 * Only returns non-expired statuses
 */
export async function getStatuses(req, res) {
  try {
    const me = await User.findById(req.user._id).select("friends");
    const userIds = [req.user._id, ...me.friends];

    const now = new Date();

    const statuses = await Status.find({
      user: { $in: userIds },
      expiresAt: { $gt: now },
    })
      .populate("user", "fullName profilePic country")
      .sort({ createdAt: -1 });

    // Group by user
    const grouped = {};
    statuses.forEach((status) => {
      const uid = status.user._id.toString();
      if (!grouped[uid]) {
        grouped[uid] = {
          user: status.user,
          statuses: [],
          hasUnviewed: false,
          latestAt: status.createdAt,
        };
      }
      grouped[uid].statuses.push(status);
      const viewed = status.viewers.some(
        (v) => v.toString() === req.user._id.toString()
      );
      if (!viewed && uid !== req.user._id.toString()) {
        grouped[uid].hasUnviewed = true;
      }
    });

    // Sort statuses inside each user oldest → newest
    Object.values(grouped).forEach((g) => {
      g.statuses.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });

    // Separate mine vs friends
    const myStatuses = grouped[req.user._id.toString()] || null;
    delete grouped[req.user._id.toString()];

    // Sort friends: unviewed first, then by latest status time
    const friendStatuses = Object.values(grouped).sort((a, b) => {
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return new Date(b.latestAt) - new Date(a.latestAt);
    });

    res.status(200).json({
      success: true,
      myStatuses,
      friendStatuses,
    });
  } catch (error) {
    console.error("Error fetching statuses:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Mark a status as viewed by current user
 */
export async function markStatusViewed(req, res) {
  try {
    const { id } = req.params;

    const status = await Status.findById(id);
    if (!status) return res.status(404).json({ message: "Status not found" });

    if (!status.viewers.some((v) => v.toString() === req.user._id.toString())) {
      status.viewers.push(req.user._id);
      await status.save();
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error marking status viewed:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Delete a status (only owner)
 */
export async function deleteStatus(req, res) {
  try {
    const { id } = req.params;

    const status = await Status.findById(id);
    if (!status) return res.status(404).json({ message: "Status not found" });

    if (status.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Status.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Status deleted" });
  } catch (error) {
    console.error("Error deleting status:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}