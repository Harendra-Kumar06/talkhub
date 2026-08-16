import { useEffect } from "react";
import { updateOnlineStatus } from "../lib/api";
import useAuthUser from "./useAuthUser";

const useOnlineStatus = () => {
  const { authUser } = useAuthUser();

  useEffect(() => {
    if (!authUser?._id) return;

    const hasSession = () =>
      localStorage.getItem("talkhub-session") === "1";

    const setOnline = () => {
      if (!hasSession()) return;
      updateOnlineStatus(true).catch(() => {});
    };
    const setOffline = () => {
      if (!hasSession()) return;
      updateOnlineStatus(false).catch(() => {});
    };

    setOnline();

    const interval = setInterval(setOnline, 30000);

    const handleBeforeUnload = () => {
      navigator.sendBeacon(
        "/api/auth/update-status",
        new Blob([JSON.stringify({ isOnline: false })], {
          type: "application/json",
        })
      );
    };

    const handleVisibilityChange = () => {
      if (document.hidden) setOffline();
      else setOnline();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // ✅ Only mark offline if we still have a valid session
      if (hasSession()) setOffline();
    };
  }, [authUser?._id]);
};

export default useOnlineStatus;