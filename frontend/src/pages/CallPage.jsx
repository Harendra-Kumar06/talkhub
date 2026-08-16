import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import {
  getStreamToken,
  getCall,
  endCall as apiEndCall,
  leaveCall as apiLeaveCall,
} from "../lib/api";
import { connectStreamUser } from "../lib/streamClient";

import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  CallControls,
  SpeakerLayout,
  StreamTheme,
  CallingState,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from "react-hot-toast";
import PageLoader from "../components/PageLoader";
import { VideoIcon } from "lucide-react";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const formatDuration = (secs) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

// Module-level guard against StrictMode double-mount + Fast Refresh
const activeCalls = new Map();

const CallPage = () => {
  const { id: callId } = useParams();
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [callMeta, setCallMeta] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [initError, setInitError] = useState(null);

  const { authUser, isLoading } = useAuthUser();
  const navigate = useNavigate();

  const isCallerRef = useRef(false);
  const isGroupCallRef = useRef(false);
  const hasCleanedUpRef = useRef(false);

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  // Verify call is valid
  useEffect(() => {
    if (!authUser || !callId) return;
    let cancelled = false;

    (async () => {
      try {
        const { call: callDoc } = await getCall(callId);
        if (cancelled) return;

        isCallerRef.current =
          callDoc.caller?._id?.toString() === authUser._id.toString();
        isGroupCallRef.current = !!callDoc.isGroupCall;

        if (["ended", "rejected", "cancelled", "missed"].includes(callDoc.status)) {
          toast.error(`Call already ${callDoc.status}`);
          navigate("/friends");
          return;
        }
        setCallMeta(callDoc);
      } catch (err) {
        if (cancelled) return;
        toast.error(err.response?.data?.message || "Call not found");
        navigate("/friends");
      }
    })();

    return () => { cancelled = true; };
  }, [authUser, callId, navigate]);

  // Join call
  useEffect(() => {
    if (!tokenData?.token || !authUser || !callId || !callMeta) return;

    let cancelled = false;

    const initCall = async () => {
      try {
        const existing = activeCalls.get(callId);
        if (existing) {
          if (existing.joinPromise) {
            try { await existing.joinPromise; } catch {}
          }
          setClient(existing.client);
          setCall(existing.call);
          setIsConnecting(false);
          return;
        }

        const user = {
          id: authUser._id,
          name: authUser.fullName,
          image: authUser.profilePic,
        };

        const videoClient = StreamVideoClient.getOrCreateInstance({
          apiKey: STREAM_API_KEY,
          user,
          token: tokenData.token,
        });

        const callInstance = videoClient.call("default", callId);

        const joinPromise = callInstance.join({ create: true });
        activeCalls.set(callId, {
          client: videoClient,
          call: callInstance,
          joinPromise,
        });

        await joinPromise;

        if (cancelled) return;

        setClient(videoClient);
        setCall(callInstance);
      } catch (error) {
        console.error("Error joining call:", error);
        activeCalls.delete(callId);
        if (!cancelled) {
          setInitError(error.message);
          toast.error("Could not join the call: " + error.message);
        }
      } finally {
        if (!cancelled) setIsConnecting(false);
      }
    };

    initCall();

    return () => { cancelled = true; };
  }, [tokenData, authUser, callId, callMeta]);

  // Listen for call_ended signal (for 1-to-1 only — group calls don't broadcast end when one leaves)
  useEffect(() => {
    if (!authUser?._id || !callId) return;

    let signalChannel = null;
    let unsub = null;
    let cancelled = false;

    (async () => {
      try {
        const chatClient = await connectStreamUser(authUser);
        if (cancelled) return;

        signalChannel = chatClient.channel("messaging", `signal-${authUser._id}`, {
          members: [authUser._id],
        });

        await signalChannel.watch();

        unsub = signalChannel.on((event) => {
          if (!event?.type) return;
          const data = event.data || {};

          if (event.type === "call_ended" && data.callId === callId) {
            console.log("📴 Call ended by other side, leaving...");
            toast("Call ended", { icon: "📴" });

            const entry = activeCalls.get(callId);
            if (entry?.call) {
              entry.call.leave().catch(() => {});
            }
            activeCalls.delete(callId);
            navigate("/friends");
          }
        });
      } catch (e) {
        console.warn("Could not attach call_ended listener:", e.message);
      }
    })();

    return () => {
      cancelled = true;
      if (unsub?.unsubscribe) {
        try { unsub.unsubscribe(); } catch {}
      }
    };
  }, [authUser, callId, navigate]);

  // 🔑 Cleanup on real navigation away
  useEffect(() => {
    return () => {
      setTimeout(async () => {
        if (window.location.pathname.includes(`/call/${callId}`)) return;
        if (hasCleanedUpRef.current) return;
        hasCleanedUpRef.current = true;

        const entry = activeCalls.get(callId);
        if (entry?.call) {
          try {
            const state = entry.call.state?.callingState;
            if (state && state !== CallingState.LEFT && state !== CallingState.IDLE) {
              await entry.call.leave();
            }
          } catch (e) {
            if (!e.message?.includes("already been left")) {
              console.warn("leave failed:", e.message);
            }
          }
        }
        activeCalls.delete(callId);

        // 🔑 Group call: just mark this user as left (don't end for others)
        // 1-on-1 call: end the call fully
        try {
          if (isGroupCallRef.current) {
            await apiLeaveCall(callId);
            console.log("👋 Left group call (others continue)");
          } else {
            const result = await apiEndCall(callId);
            if (
              result?.call &&
              authUser &&
              isCallerRef.current &&
              result.call.status === "ended"
            ) {
              await postCallSystemMessage(authUser, result.call);
            }
          }
        } catch (e) {
          if (!e.response?.data?.message?.includes("already")) {
            console.warn("Leave/End call failed:", e?.message);
          }
        }
      }, 800);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  if (isLoading || isConnecting) return <PageLoader />;

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse pointer-events-none" />

      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 text-white">
          <div className="p-2 bg-primary/20 backdrop-blur-md rounded-xl">
            <VideoIcon className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              {isGroupCallRef.current ? "Group Video Call" : "Video Call"}
            </h3>
            <p className="text-xs opacity-70 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </p>
          </div>
        </div>
      </div>

      <div className="h-full w-full relative z-10 pt-16">
        {client && call ? (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <CallContent
                callId={callId}
                isGroupCall={isGroupCallRef.current}
              />
            </StreamCall>
          </StreamVideo>
        ) : (
          <div className="flex items-center justify-center h-full text-white">
            <div className="text-center space-y-3 max-w-md p-6">
              <VideoIcon className="size-16 mx-auto opacity-50" />
              <p className="text-lg font-semibold">Could not initialize call</p>
              {initError && (
                <p className="text-sm opacity-70">{initError}</p>
              )}
              <div className="text-xs opacity-60 space-y-1 mt-4">
                <p>Common causes:</p>
                <p>• Camera/microphone already in use</p>
                <p>• Network firewall blocking WebRTC</p>
                <p>• VPN interfering with connection</p>
              </div>
              <button onClick={() => navigate("/friends")} className="btn btn-primary mt-4">
                Go Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CallContent = ({ callId, isGroupCall }) => {
  const { useCallCallingState, useParticipantCount } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participantCount = useParticipantCount();
  const navigate = useNavigate();
  const wasMultiRef = useRef(false);

  useEffect(() => {
    if (participantCount >= 2) {
      wasMultiRef.current = true;
    }
  }, [participantCount]);

  // 🔑 Auto-leave logic
  useEffect(() => {
    if (!wasMultiRef.current) return;

    if (isGroupCall) {
      // For GROUP calls: only auto-leave when YOU are the last one
      if (participantCount === 1) {
        console.log("📴 You're the last one in group call, leaving...");
        toast("Everyone else left the call", { icon: "👋" });
        setTimeout(() => navigate("/friends"), 1500);
      }
    } else {
      // For 1-on-1 calls: auto-leave when other person leaves
      if (participantCount === 1) {
        console.log("📴 Other participant left, auto-hanging up...");
        toast("Other user left the call", { icon: "👋" });
        setTimeout(() => navigate("/friends"), 1500);
      }
    }
  }, [participantCount, navigate, isGroupCall]);

  useEffect(() => {
    if (callingState === CallingState.LEFT) {
      navigate("/friends");
    }
  }, [callingState, navigate]);

  return (
    <StreamTheme>
      <SpeakerLayout />
      <CallControls />
    </StreamTheme>
  );
};

async function postCallSystemMessage(authUser, callDoc) {
  try {
    const client = await connectStreamUser(authUser);
    const channel = client.channel("messaging", callDoc.channelId);
    await channel.watch();

    let text;
    if (callDoc.status === "ended" && callDoc.duration > 0) {
      text = `📹 Video call · ${formatDuration(callDoc.duration)}`;
    } else if (callDoc.status === "ended") {
      text = "📹 Video call ended";
    } else if (callDoc.status === "missed") {
      text = "📵 Missed video call";
    } else if (callDoc.status === "rejected") {
      text = "🚫 Call declined";
    } else {
      return;
    }

    await channel.sendMessage({ text, call_system: true });
  } catch (e) {
    console.error("Failed to post system message:", e);
  }
}

export default CallPage;