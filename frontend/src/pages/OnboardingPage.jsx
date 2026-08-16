import { useState } from "react";
import useAuthUser from "../hooks/useAuthUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { completeOnboarding } from "../lib/api";
import {
  LoaderIcon,
  MapPinIcon,
  MessageCircleIcon,
  ShuffleIcon,
  CameraIcon,
  UserIcon,
  GlobeIcon,
  BookOpenIcon,
  SparklesIcon,
} from "lucide-react";
import { COUNTRIES } from "../constants";
import Logo from "../components/Logo";

const OnboardingPage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();

  const [formState, setFormState] = useState({
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
    country: authUser?.country || "",
    location: authUser?.location || "",
    profilePic: authUser?.profilePic || "",
  });

  const { mutate: onboardingMutation, isPending } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      toast.success("Profile completed! Welcome to TalkHub 🎉");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Something went wrong");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onboardingMutation(formState);
  };

  const handleRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    const randomAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    setFormState({ ...formState, profilePic: randomAvatar });
    toast.success("New avatar generated!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="fixed top-0 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      <div className="fixed bottom-0 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-3xl">
        <div className="text-center mb-6 text-white">
          <div className="inline-flex mb-3">
            <Logo size="size-10" textSize="text-2xl" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Complete Your Profile</h1>
          <p className="opacity-80">Let's set up your profile so friends can find you!</p>
        </div>

        <div className="card bg-base-100/95 backdrop-blur-xl shadow-2xl border border-white/10">
          <div className="card-body p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* PROFILE PIC */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div className="size-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden ring-4 ring-primary/30 shadow-xl">
                    {formState.profilePic ? (
                      <img
                        src={formState.profilePic}
                        alt="Profile Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <CameraIcon className="size-12 opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 p-2 bg-primary rounded-full shadow-lg">
                    <SparklesIcon className="size-4 text-white" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRandomAvatar}
                  className="btn btn-sm gap-2 bg-gradient-to-r from-primary to-secondary text-white border-none shadow-md hover:shadow-lg"
                >
                  <ShuffleIcon className="size-4" />
                  Generate Random Avatar
                </button>
                <p className="text-xs opacity-60">
                  📸 Photo upload coming in next update
                </p>
              </div>

              <div className="divider text-xs opacity-50">YOUR DETAILS</div>

              {/* Full Name */}
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium flex items-center gap-2">
                    <UserIcon className="size-4" />
                    Full Name
                  </span>
                </label>
                <input
                  type="text"
                  value={formState.fullName}
                  onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                  className="input input-bordered w-full focus:input-primary"
                  placeholder="Your full name"
                />
              </div>

              {/* Bio */}
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium flex items-center gap-2">
                    <BookOpenIcon className="size-4" />
                    Bio
                  </span>
                </label>
                <textarea
                  value={formState.bio}
                  onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                  className="textarea textarea-bordered h-24 focus:textarea-primary"
                  placeholder="Tell others about yourself..."
                />
              </div>

              {/* Country */}
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium flex items-center gap-2">
                    <GlobeIcon className="size-4 text-primary" />
                    Country
                  </span>
                </label>
                <select
                  value={formState.country}
                  onChange={(e) => setFormState({ ...formState, country: e.target.value })}
                  className="select select-bordered w-full focus:select-primary"
                  required
                >
                  <option value="">Select your country</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-medium flex items-center gap-2">
                    <MapPinIcon className="size-4" />
                    City/State
                  </span>
                </label>
                <div className="relative">
                  <MapPinIcon className="absolute top-1/2 -translate-y-1/2 left-3 size-5 opacity-50" />
                  <input
                    type="text"
                    value={formState.location}
                    onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                    className="input input-bordered w-full pl-10 focus:input-primary"
                    placeholder="Your city"
                  />
                </div>
              </div>

              <button
                className="btn btn-primary w-full shadow-lg bg-gradient-to-r from-primary to-secondary border-none hover:shadow-xl"
                disabled={isPending}
                type="submit"
              >
                {!isPending ? (
                  <>
                    <MessageCircleIcon className="size-5" />
                    Complete Onboarding
                  </>
                ) : (
                  <>
                    <LoaderIcon className="animate-spin size-5" />
                    Setting up your profile...
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;