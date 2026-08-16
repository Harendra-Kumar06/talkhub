import { useThemeStore } from "../store/useThemeStore";

const PageLoader = () => {
  const { theme } = useThemeStore();
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-base-200 to-base-300"
      data-theme={theme}
    >
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          {/* Rotating outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />

          {/* Logo */}
          <div className="relative p-6">
            <img 
              src="/talkhub.svg" 
              alt="TalkHub Logo" 
              className="size-16 rounded-2xl shadow-2xl animate-pulse"
            />
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            TalkHub
          </h3>
          <p className="text-sm opacity-60 mt-1">Loading your experience...</p>
        </div>
      </div>
    </div>
  );
};

export default PageLoader;