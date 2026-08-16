import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getMyGroups,
  getGroupById,
  addMembers,
  removeMember,
  leaveGroup,
  promoteToAdmin,
  demoteAdmin,
  deleteGroup,
  updateGroup,
} from "../controllers/group.controller.js";

const router = express.Router();

router.get("/", protectRoute, getMyGroups);
router.post("/", protectRoute, createGroup);
router.get("/:id", protectRoute, getGroupById);
router.put("/:id", protectRoute, updateGroup);
router.delete("/:id", protectRoute, deleteGroup);

router.post("/:id/members", protectRoute, addMembers);
router.delete("/:id/members/:userId", protectRoute, removeMember);
router.post("/:id/leave", protectRoute, leaveGroup);

router.put("/:id/promote/:userId", protectRoute, promoteToAdmin);
router.put("/:id/demote/:userId", protectRoute, demoteAdmin);

export default router;