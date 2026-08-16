import { useState } from "react";
import { MessageCircleIcon, UserIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon, SparklesIcon, GlobeIcon, UsersIcon, ArrowLeftIcon } from "lucide-react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import { useSignUp, useVerifySignupOtp } from "../hooks/useSignUp";
import OtpInput from "../components/OtpInput";
import Logo from "../components/Logo";

const SignUpPage = () => {
  const [step, setStep] = useState(1); // 1=form, 2=verify OTP
  const [signupData, setSignupData] = useState({ fullName: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { signupMutation, isPending: signupPending, error: signupError } = useSignUp();
  const { verifyMutation, isPending: verifyPending, error: verifyError } = useVerifySignupOtp();

  const handleSignup = (e) => {
    e.preventDefault();
    signupMutation(signupData, {
      onSuccess: () => {
        toast.success("OTP sent to your email!");
        setStep(2);
      },
    });
  };

  const handleVerify = (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error("Enter the 6-digit OTP");
    verifyMutation({ email: signupData.email, otp });
  };

  const handleResend = () => {
    signupMutation(signupData, {
      onSuccess: () => toast.success("New OTP sent!"),
    });
  };

  const currentError = signupError || verifyError;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      <div className="absolute top-0 -right-40 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 -left-40 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />

      <div className="relative z-10 w-full max-w-6xl bg-base-100/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden grid lg:grid-cols-2">

        {/* LEFT: ILLUSTRATION */}
        <div className="hidden lg:flex bg-gradient-to-br from-secondary via-primary to-accent items-center justify-center p-10 relative overflow-hidden order-2 lg:order-1">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 text-center text-white space-y-6 max-w-md">
            <div className="inline-block p-4 bg-white/20 backdrop-blur-md rounded-2xl mb-4">
              <SparklesIcon className="size-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold">Start Your Journey Today</h2>
            <p className="opacity-90">Join thousands connecting on TalkHub.</p>
            <div className="space-y-3 text-left pt-4">
              {[
                { icon: GlobeIcon, text: "Connect across 100+ countries" },
                { icon: UsersIcon, text: "Chat, call, and share moments" },
                { icon: SparklesIcon, text: "Meet new people every day" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl">
                  <div className="p-2 bg-white/20 rounded-lg"><item.icon className="size-5" /></div>
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: FORM */}
        <div className="p-6 sm:p-10 flex flex-col order-1 lg:order-2">
          <div className="mb-8">
            <Logo size="size-10" textSize="text-2xl" />
          </div>

          {currentError && (
            <div className="alert alert-error mb-4 py-2 text-sm">
              <span>{currentError.response?.data?.message || "Signup failed"}</span>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-center">
            {step === 1 ? (
              <>
                <div className="mb-6">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-2">Create Account 🚀</h2>
                  <p className="text-sm opacity-70">Join TalkHub and start connecting today</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="form-control">
                    <label className="label pb-1"><span className="label-text font-medium">Full Name</span></label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 opacity-50" />
                      <input type="text" placeholder="John Doe" className="input input-bordered w-full pl-10"
                        value={signupData.fullName}
                        onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })} required />
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label pb-1"><span className="label-text font-medium">Email</span></label>
                    <div className="relative">
                      <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 opacity-50" />
                      <input type="email" placeholder="you@gmail.com" className="input input-bordered w-full pl-10"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })} required />
                    </div>
                    <p className="text-xs opacity-60 mt-1 ml-1">We'll send a verification code here</p>
                  </div>

                  <div className="form-control">
                    <label className="label pb-1"><span className="label-text font-medium">Password</span></label>
                    <div className="relative">
                      <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 opacity-50" />
                      <input type={showPassword ? "text" : "password"} placeholder="••••••••"
                        className="input input-bordered w-full pl-10 pr-10"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        required minLength={6} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100">
                        {showPassword ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
                      </button>
                    </div>
                    <p className="text-xs opacity-60 mt-1 ml-1">Must be at least 6 characters</p>
                  </div>

                  <label className="label cursor-pointer justify-start gap-2 py-0">
                    <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" required />
                    <span className="text-xs">
                      I agree to the <span className="text-primary hover:underline cursor-pointer">Terms</span> &{" "}
                      <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>
                    </span>
                  </label>

                  <button type="submit" disabled={signupPending}
                    className="btn btn-primary w-full bg-gradient-to-r from-primary to-secondary border-none">
                    {signupPending ? <><span className="loading loading-spinner loading-sm" />Sending OTP...</> : "Continue"}
                  </button>

                  <div className="divider text-xs opacity-50">OR</div>
                  <div className="text-center">
                    <p className="text-sm opacity-70">
                      Already have an account?{" "}
                      <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
                    </p>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <button onClick={() => setStep(1)} className="btn btn-ghost btn-sm mb-2">
                    <ArrowLeftIcon className="size-4" /> Back
                  </button>
                  <h2 className="text-3xl sm:text-4xl font-bold mb-2">Verify Email 📩</h2>
                  <p className="text-sm opacity-70">Code sent to <strong>{signupData.email}</strong></p>
                </div>

                <form onSubmit={handleVerify} className="space-y-6">
                  <OtpInput value={otp} onChange={setOtp} disabled={verifyPending} />

                  <button type="submit" disabled={verifyPending || otp.length !== 6}
                    className="btn btn-primary w-full bg-gradient-to-r from-primary to-secondary border-none">
                    {verifyPending ? <><span className="loading loading-spinner loading-sm" />Verifying...</> : "Verify & Create Account"}
                  </button>

                  <div className="text-center">
                    <button type="button" onClick={handleResend} disabled={signupPending}
                      className="text-sm text-primary hover:underline">
                      {signupPending ? "Sending..." : "Resend OTP"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;