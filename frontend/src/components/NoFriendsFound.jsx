import { Link } from "react-router";
import { UsersIcon, SparklesIcon } from "lucide-react";

const NoFriendsFound = () => {
  return (
    <div className="card bg-gradient-to-br from-base-200 to-base-300 border border-base-300 p-8 sm:p-12 text-center">
      <div className="max-w-md mx-auto space-y-4">
        {/* Icon */}
        <div className="relative inline-block mx-auto">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <UsersIcon className="size-10 text-primary" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-secondary flex items-center justify-center animate-bounce">
            <SparklesIcon className="size-3 text-white" />
          </div>
        </div>

        {/* Text */}
        <div>
          <h3 className="text-xl sm:text-2xl font-bold mb-2">No friends yet</h3>
          <p className="text-sm opacity-70">
            Discover amazing people, make new friends, and start meaningful conversations! ✨
          </p>
        </div>

        {/* Action */}
        <Link to="/discover" className="btn btn-primary btn-sm gap-2 mt-2">
          <SparklesIcon className="size-4" />
          Discover Friends
        </Link>
      </div>
    </div>
  );
};

export default NoFriendsFound;