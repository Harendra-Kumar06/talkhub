import { useQuery } from "@tanstack/react-query";
import { getAuthUser } from "../lib/api";

const useAuthUser = () => {
  const hasSession =
    typeof window !== "undefined" &&
    localStorage.getItem("talkhub-session") === "1";

  const authUser = useQuery({
    queryKey: ["authUser"],
    queryFn: getAuthUser,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    enabled: hasSession, // only fetch if we've logged in before
  });

  return {
    isLoading: authUser.isLoading && authUser.fetchStatus !== "idle",
    authUser: authUser.data?.user,
  };
};

export default useAuthUser;