import { useState } from "react";
import { MessageCircleIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon, GlobeIcon, VideoIcon, KeyRoundIcon, ArrowLeftIcon } from "lucide-react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import useLogin, { useRequestLoginOtp, useVerifyLoginOtp } from "../hooks/useLogin";
import OtpInput from "../components/OtpInput";
import Logo from "../components/Logo";

const LoginPage = () => {
  const [mode, setMode] = useState("password"); // password | otp-request | otp-verify
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { isPending: pwPending, error: pwError, loginMutation } = useLogin();
  const { requestOtpMutation, isPending: reqPending, error: reqError } = useRequestLoginOtp();
  const { verifyOtpMutation, isPending: verifyPending, error: verifyError } = useVerifyLoginOtp();

  const currentError = pwError || reqError || verifyError;

  const handlePasswordLogin = (e) => {
    e.preventDefault();
    loginMutation({ email, password });
  };

  const handleRequestOtp = (e) => {
    e.preventDefault();
    requestOtpMutation(
      { email },
      {
        onSuccess: () => {
          toast.success("OTP sent to your email!");
          setMode("otp-verify");
        },
      }
    );
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error("Enter the 6-digit OTP");
    verifyOtpMutation({ email, otp });
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="absolute top-0 -left-40 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />

      <div className="relative z-10 w-full max-w-6xl bg-base-100/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden grid lg:grid-cols-2">

        {/* LEFT: FORM */}
        <div className="p-6 sm:p-10 flex flex-col">
          <div className="mb-8">
            <Logo size="size-10" textSize="text-2xl" />
          </div>

          {currentError && (
            <div className="alert alert-error mb-4 py-2 text-sm">
              <span>{currentError.response?.data?.message || "Something went wrong"}</span>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-center">
            {/* MODE: PASSWORD LOGIN */}
            {mode === "password" && (
              <>
                <div className="mb-6">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-2">Welcome Back 👋</h2>
                  <p className="text-sm opacity-70">Sign in with your password</p>
                </div>

                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="form-control">
                    <label className="label pb-1"><span className="label-text font-medium">Email</span></label>
                    <div className="relative">
                      <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 opacity-50" />
                      <input type="email" placeholder="you@example.com" className="input input-bordered w-full pl-10"
                        value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label pb-1 flex justify-between">
                      <span className="label-text font-medium">Password</span>
                      <button type="button" onClick={() => setMode("forgot")}
                        className="text-xs text-primary hover:underline">Forgot?</button>
                    </label>
                    <div className="relative">
                      <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 opacity-50" />
                      <input type={showPassword ? "text" : "password"} placeholder="••••••••"
                        className="input input-bordered w-full pl-10 pr-10"
                        value={password} onChange={(e) => setPassword(e.target.value)} required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100">
                        {showPassword ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={pwPending}
                    className="btn btn-primary w-full mt-2 bg-gradient-to-r from-primary to-secondary border-none">
                    {pwPending ? <><span className="loading loading-spinner loading-sm" />Signing in...</> : "Sign In"}
                  </button>

                  <div className="divider text-xs opacity-50">OR</div>

                  <button type="button" onClick={() => setMode("otp-request")}
                    className="btn btn-outline w-full">
                    <KeyRoundIcon className="size-4" /> Sign in with OTP
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-sm opacity-70">
                      Don't have an account?{" "}
                      <Link to="/signup" className="text-primary font-semibold hover:underline">Create one</Link>
                    </p>
                  </div>
                </form>
              </>
            )}

            {/* MODE: REQUEST OTP */}
            {mode === "otp-request" && (
              <>
                <div className="mb-6">
                  <button onClick={() => setMode("password")} className="btn btn-ghost btn-sm mb-2">
                    <ArrowLeftIcon className="size-4" /> Back
                  </button>
                  <h2 className="text-3xl sm:text-4xl font-bold mb-2">Login with OTP 🔐</h2>
                  <p className="text-sm opacity-70">We'll send a code to your email</p>
                </div>

                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="form-control">
                    <label className="label pb-1"><span className="label-text font-medium">Email</span></label>
                    <div className="relative">
                      <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 opacity-50" />
                      <input type="email" placeholder="you@example.com" className="input input-bordered w-full pl-10"
                        value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                  </div>

                  <button type="submit" disabled={reqPending}
                    className="btn btn-primary w-full bg-gradient-to-r from-primary to-secondary border-none">
                    {reqPending ? <><span className="loading loading-spinner loading-sm" />Sending...</> : "Send OTP"}
                  </button>
                </form>
              </>
            )}

            {/* MODE: VERIFY OTP */}
            {mode === "otp-verify" && (
              <>
                <div className="mb-6">
                  <button onClick={() => setMode("otp-request")} className="btn btn-ghost btn-sm mb-2">
                    <ArrowLeftIcon className="size-4" /> Back
                  </button>
                  <h2 className="text-3xl sm:text-4xl font-bold mb-2">Enter OTP 📩</h2>
                  <p className="text-sm opacity-70">Code sent to <strong>{email}</strong></p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <OtpInput value={otp} onChange={setOtp} disabled={verifyPending} />

                  <button type="submit" disabled={verifyPending || otp.length !== 6}
                    className="btn btn-primary w-full bg-gradient-to-r from-primary to-secondary border-none">
                    {verifyPending ? <><span className="loading loading-spinner loading-sm" />Verifying...</> : "Verify & Login"}
                  </button>

                  <div className="text-center">
                    <button type="button" onClick={handleRequestOtp} disabled={reqPending}
                      className="text-sm text-primary hover:underline">
                      {reqPending ? "Sending..." : "Resend OTP"}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* MODE: FORGOT PASSWORD → redirect to /forgot-password */}
            {mode === "forgot" && <ForgotPasswordFlow email={email} setEmail={setEmail} onBack={() => setMode("password")} />}
          </div>
        </div>

        {/* RIGHT: ILLUSTRATION */}
        <div className="hidden lg:flex bg-gradient-to-br from-primary via-secondary to-accent items-center justify-center p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

          <div className="relative z-10 text-center text-white space-y-6 max-w-md">
            <div className="flex justify-center gap-4 mb-6">
              <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl"><GlobeIcon className="size-8" /></div>
              <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl"><MessageCircleIcon className="size-8" /></div>
              <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl"><VideoIcon className="size-8" /></div>
            </div>
            <h2 className="text-3xl font-bold">Chat & Connect<br />with the World</h2>
            <p className="opacity-90">Message, share stories, and video call with friends across the globe.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ FORGOT PASSWORD MINI FLOW ============
import { forgotPassword, resetPassword } from "../lib/api";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

const ForgotPasswordFlow = ({ email, setEmail, onBack }) => {
  const [step, setStep] = useState(1); // 1=email, 2=otp+newPass
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const queryClient = useQueryClient();

  const sendOtp = useMutation({
    mutationFn: forgotPassword,
    onSuccess: () => {
      toast.success("OTP sent to your email!");
      setStep(2);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to send OTP"),
  });

  const reset = useMutation({
    mutationFn: resetPassword,
    onSuccess: async (data) => {
      toast.success("Password reset successful!");
      localStorage.setItem("talkhub-session", "1");
      queryClient.setQueryData(["authUser"], { user: data.user });
      await queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (err) => toast.error(err.response?.data?.message || "Reset failed"),
  });

  return (
    <>
      <div className="mb-6">
        <button onClick={onBack} className="btn btn-ghost btn-sm mb-2">
          <ArrowLeftIcon className="size-4" /> Back
        </button>
        <h2 className="text-3xl sm:text-4xl font-bold mb-2">Reset Password 🔑</h2>
        <p className="text-sm opacity-70">
          {step === 1 ? "Enter your email to receive an OTP" : `OTP sent to ${email}`}
        </p>
      </div>

      {step === 1 ? (
        <form onSubmit={(e) => { e.preventDefault(); sendOtp.mutate({ email }); }} className="space-y-4">
          <div className="form-control">
            <label className="label pb-1"><span className="label-text font-medium">Email</span></label>
            <div className="relative">
              <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 opacity-50" />
              <input type="email" placeholder="you@example.com" className="input input-bordered w-full pl-10"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <button type="submit" disabled={sendOtp.isPending}
            className="btn btn-primary w-full bg-gradient-to-r from-primary to-secondary border-none">
            {sendOtp.isPending ? "Sending..." : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); reset.mutate({ email, otp, newPassword }); }} className="space-y-4">
          <div>
            <label className="label pb-1"><span className="label-text font-medium">OTP Code</span></label>
            <OtpInput value={otp} onChange={setOtp} disabled={reset.isPending} />
          </div>
          <div className="form-control">
            <label className="label pb-1"><span className="label-text font-medium">New Password</span></label>
            <div className="relative">
              <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 opacity-50" />
              <input type="password" placeholder="••••••••" className="input input-bordered w-full pl-10"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
            </div>
          </div>
          <button type="submit" disabled={reset.isPending || otp.length !== 6 || newPassword.length < 6}
            className="btn btn-primary w-full bg-gradient-to-r from-primary to-secondary border-none">
            {reset.isPending ? "Resetting..." : "Reset Password"}
          </button>
          <div className="text-center">
            <button type="button" onClick={() => sendOtp.mutate({ email })} disabled={sendOtp.isPending}
              className="text-sm text-primary hover:underline">
              {sendOtp.isPending ? "Sending..." : "Resend OTP"}
            </button>
          </div>
        </form>
      )}
    </>
  );
};

export default LoginPage;