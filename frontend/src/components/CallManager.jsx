import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import useAuthUser from "../hooks/useAuthUser";
import { connectStreamUser } from "../lib/streamClient";
import {
  acceptCall as apiAccept,
  rejectCall as apiReject,
  cancelCall as apiCancel,
  markCallMissed,
} from "../lib/api";
import IncomingCallModal from "./IncomingCallModal";
import OutgoingCallModal from "./OutgoingCallModal";

const RING_TIMEOUT_MS = 30_000;

let attachedForUserId = null;
let watchedChannel = null;
let channelUnsub = null;

const CallManager = () => {
  const { authUser } = useAuthUser();
  const navigate = useNavigate();

  const [incomingCall, setIncomingCall] = useState(null);
  const [outgoingCall, setOutgoingCall] = useState(null);

  const outgoingCallRef = useRef(null);
  const incomingCallRef = useRef(null);
  const timeoutRef = useRef(null);
  const processedCallsRef = useRef(new Map());

  useEffect(() => { outgoingCallRef.current = outgoingCall; }, [outgoingCall]);
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);

  useEffect(() => {
    window.__startOutgoingCall = (callData) => {
      setOutgoingCall(callData);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
        const c = outgoingCallRef.current;
        if (c && !c.isGroupCall) {
          try { await markCallMissed(c.callId); } catch {}
          toast.error("No answer");
          setOutgoingCall(null);
        }
      }, RING_TIMEOUT_MS);
    };
    return () => {
      delete window.__startOutgoingCall;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!authUser?._id) return;

    if (attachedForUserId === authUser._id && watchedChannel) {
      console.log(`📞 CallManager: already watching signal channel for ${authUser._id}`);
      return;
    }

    if (attachedForUserId && attachedForUserId !== authUser._id) {
      console.log(`🔄 User changed, cleaning up`);
      if (channelUnsub?.unsubscribe) {
        try { channelUnsub.unsubscribe(); } catch {}
      }
      if (watchedChannel) {
        try { watchedChannel.stopWatching(); } catch {}
      }
      channelUnsub = null;
      watchedChannel = null;
      attachedForUserId = null;
    }

    let cancelled = false;
    attachedForUserId = authUser._id;

    (async () => {
      try {
        const client = await connectStreamUser(authUser);
        if (cancelled) return;

        const signalChannelId = `signal-${authUser._id}`;
        const channel = client.channel("messaging", signalChannelId, {
          members: [authUser._id],
        });

        await channel.watch();
        watchedChannel = channel;

        console.log(`📞 CallManager watching signal channel: ${signalChannelId}`);

        const alreadyProcessed = (callId, type) => {
          if (!callId) return false;
          if (!processedCallsRef.current.has(callId)) {
            processedCallsRef.current.set(callId, new Set());
          }
          const set = processedCallsRef.current.get(callId);
          if (set.has(type)) return true;
          set.add(type);
          if (processedCallsRef.current.size > 50) {
            const firstKey = processedCallsRef.current.keys().next().value;
            processedCallsRef.current.delete(firstKey);
          }
          return false;
        };

        const handleIncoming = (data) => {
          if (alreadyProcessed(data.callId, "incoming")) return;
          console.log("📥 call_incoming", data);
          if (data.callerId === authUser._id) return;
          if (incomingCallRef.current || outgoingCallRef.current) return;
          setIncomingCall({
            callId: data.callId,
            callerId: data.callerId,
            callerName: data.callerName,
            callerImage: data.callerImage,
            callType: data.callType || "video",
            isGroupCall: !!data.isGroupCall,
            groupId: data.groupId || null,
            groupName: data.groupName || null,
            groupAvatar: data.groupAvatar || null,
            memberCount: data.memberCount || 0,
          });
        };

        const handleAccepted = (data) => {
          if (alreadyProcessed(data.callId, "accepted")) return;
          console.log("✅ call_accepted", data);
          const out = outgoingCallRef.current;
          if (out && out.callId === data.callId) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setOutgoingCall(null);
            navigate(`/call/${data.callId}`);
          }
        };

        const handleRejected = (data) => {
          if (alreadyProcessed(data.callId, "rejected")) return;
          console.log("🚫 call_rejected", data);
          const out = outgoingCallRef.current;
          if (out && out.callId === data.callId) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setOutgoingCall(null);
            toast.error("Call declined");
          }
        };

        const handleCancelled = (data) => {
          if (alreadyProcessed(data.callId, "cancelled")) return;
          console.log("❌ call_cancelled", data);
          const inc = incomingCallRef.current;
          if (inc && inc.callId === data.callId) {
            setIncomingCall(null);
            toast(`Missed call from ${inc.callerName}`, { icon: "📞" });
          }
        };

        const handleMissed = (data) => {
          if (alreadyProcessed(data.callId, "missed")) return;
          const inc = incomingCallRef.current;
          if (inc && inc.callId === data.callId) {
            setIncomingCall(null);
            toast(`Missed call from ${inc.callerName}`, { icon: "📞" });
          }
        };

        channelUnsub = channel.on((event) => {
          if (!event?.type) return;
          const data = event.data || {};

          switch (event.type) {
            case "call_incoming":  return handleIncoming(data);
            case "call_accepted":  return handleAccepted(data);
            case "call_rejected":  return handleRejected(data);
            case "call_cancelled": return handleCancelled(data);
            case "call_missed":    return handleMissed(data);
            default: return;
          }
        });
      } catch (e) {
        console.error("CallManager: failed to attach listeners", e);
        attachedForUserId = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser?._id, navigate]);

  const handleAccept = useCallback(async () => {
    const inc = incomingCallRef.current;
    if (!inc) return;
    setIncomingCall(null);
    try {
      await apiAccept(inc.callId);
      navigate(`/call/${inc.callId}`);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to accept");
    }
  }, [navigate]);

  const handleReject = useCallback(async () => {
    const inc = incomingCallRef.current;
    if (!inc) return;
    setIncomingCall(null);
    try { await apiReject(inc.callId); } catch (e) { console.error(e); }
  }, []);

  const handleCancelOutgoing = useCallback(async () => {
    const out = outgoingCallRef.current;
    if (!out) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOutgoingCall(null);
    try { await apiCancel(out.callId); } catch (e) { console.error(e); }
  }, []);

  if (!authUser) return null;

  return (
    <>
      {incomingCall && (
        <IncomingCallModal call={incomingCall} onAccept={handleAccept} onReject={handleReject} />
      )}
      {outgoingCall && (
        <OutgoingCallModal call={outgoingCall} onCancel={handleCancelOutgoing} />
      )}
    </>
  );
};

export default CallManager;