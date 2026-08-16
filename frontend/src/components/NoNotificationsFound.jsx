import { BellIcon } from "lucide-react";

const NoNotificationsFound = () => {
  return (
    <div className="card bg-gradient-to-br from-base-200 to-base-300 border border-base-300 p-8 sm:p-12 text-center">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto">
          <BellIcon className="size-10 text-primary" />
        </div>

        <div>
          <h3 className="text-xl sm:text-2xl font-bold mb-2">All caught up!</h3>
          <p className="text-sm opacity-70">
            No new notifications. We'll ping you when something exciting happens.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NoNotificationsFound;  