import { Link } from "react-router";
import { MessageCircleIcon, GlobeIcon, MapPinIcon } from "lucide-react";
import { useState } from "react";

const FriendCard = ({ friend }) => {
  const [imageError, setImageError] = useState(false);

  const getInitials = (name) => {
    return name
      ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "??";
  };

  return (
    <div className="card bg-base-200 hover:bg-base-300 hover:shadow-lg transition-all duration-300 border border-base-300 overflow-hidden group">
      <div className="h-20 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/10 relative">
        <div className="absolute -bottom-8 left-4 z-10">
          <div className="avatar ring-4 ring-base-200 rounded-full bg-base-100 w-16 h-16 overflow-hidden shadow-md">
            {!imageError && friend.profilePic ? (
              <img
                src={friend.profilePic}
                alt={friend.fullName}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-lg">
                {getInitials(friend.fullName)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card-body pt-10 pb-4 px-4">
        <h3 className="font-bold text-base truncate group-hover:text-primary transition-colors">
          {friend.fullName}
        </h3>

        {/* Country / Location */}
        <div className="flex flex-wrap gap-1.5 mt-1 mb-3 text-xs">
          {friend.country && (
            <span className="badge badge-sm badge-primary gap-1 border-none">
              <GlobeIcon className="size-3" />
              {friend.country}
            </span>
          )}
          {friend.location && (
            <span className="badge badge-sm badge-outline gap-1">
              <MapPinIcon className="size-3" />
              {friend.location}
            </span>
          )}
        </div>

        <Link
          to={`/chat/${friend._id}`}
          className="btn btn-primary btn-sm w-full gap-1.5 normal-case"
        >
          <MessageCircleIcon className="size-4" />
          Message
        </Link>
      </div>
    </div>
  );
};

export default FriendCard;