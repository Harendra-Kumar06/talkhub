import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  initiateCall,
  initiateGroupCall,
  acceptCall,
  rejectCall,
  cancelCall,
  endCall,
  leaveCall,          // 🔑 NEW
  missedCall,
  getCall,
} from "../controllers/call.controller.js";

const router = express.Router();

router.use(protectRoute);

router.post("/initiate", initiateCall);
router.post("/initiate-group", initiateGroupCall);
router.get("/:callId", getCall);
router.put("/:callId/accept", acceptCall);
router.put("/:callId/reject", rejectCall);
router.put("/:callId/cancel", cancelCall);
router.put("/:callId/end", endCall);
router.put("/:callId/leave", leaveCall);   // 🔑 NEW
router.put("/:callId/missed", missedCall);

export default router;