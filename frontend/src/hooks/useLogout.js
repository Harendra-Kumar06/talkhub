import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../lib/api";

const useLogout = () => {
  const queryClient = useQueryClient();

  const {
    mutate: logoutMutation,
    isPending,
    error,
  } = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Clear session flag FIRST so useAuthUser stops fetching
      localStorage.removeItem("talkhub-session");

      // Cancel any in-flight queries to prevent 401 noise
      queryClient.cancelQueries();

      // Reset auth user immediately
      queryClient.setQueryData(["authUser"], null);

      // Clear all cache
      queryClient.clear();

      // Hard redirect — kills all mounted components & their queries
      window.location.href = "/login";
    },
  });

  return { logoutMutation, isPending, error };
};

export default useLogout;