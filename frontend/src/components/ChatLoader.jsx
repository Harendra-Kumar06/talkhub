function ChatLoader() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 bg-gradient-to-br from-base-200 to-base-300">
      <div className="relative">
        {/* Animated rings */}
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />

        {/* Logo */}
        <div className="relative p-4">
          <img 
            src="/talkhub.svg" 
            alt="TalkHub Logo" 
            className="size-16 rounded-2xl shadow-2xl animate-bounce"
          />
        </div>
      </div>

      <p className="mt-6 text-center text-lg font-semibold">Connecting to chat...</p>
      <p className="text-sm opacity-60 mt-1">Setting up your conversation</p>

      <div className="flex gap-1.5 mt-4">
        <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

export default ChatLoader;