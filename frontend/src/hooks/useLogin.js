import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, requestLoginOtp, verifyLoginOtp } from "../lib/api";

// Password login
const useLogin = () => {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: login,
    onSuccess: async (data) => {
      localStorage.setItem("talkhub-session", "1");
      queryClient.setQueryData(["authUser"], { user: data.user });
      await queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
  });
  return { error, isPending, loginMutation: mutate };
};

// Request login OTP
export const useRequestLoginOtp = () => {
  const { mutate, isPending, error } = useMutation({
    mutationFn: requestLoginOtp,
  });
  return { requestOtpMutation: mutate, isPending, error };
};

// Verify login OTP
export const useVerifyLoginOtp = () => {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: verifyLoginOtp,
    onSuccess: async (data) => {
      localStorage.setItem("talkhub-session", "1");
      queryClient.setQueryData(["authUser"], { user: data.user });
      await queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
  });
  return { verifyOtpMutation: mutate, isPending, error };
};

export default useLogin;