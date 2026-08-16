import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signup, verifySignupOtp } from "../lib/api";

// Step 1: request OTP
export const useSignUp = () => {
  const { mutate, isPending, error, data } = useMutation({
    mutationFn: signup,
  });
  return { signupMutation: mutate, isPending, error, data };
};

// Step 2: verify OTP → account created + logged in
export const useVerifySignupOtp = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: verifySignupOtp,
    onSuccess: async (data) => {
      localStorage.setItem("talkhub-session", "1");
      queryClient.setQueryData(["authUser"], { user: data.user });
      await queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
  });
  return { verifyMutation: mutate, isPending, error };
};

export default useSignUp;