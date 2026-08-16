import { Link, useLocation } from "react-router";
import { CompassIcon } from "lucide-react";

const DiscoverFAB = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Only show on Friends page
  if (currentPath !== "/friends") return null;

  return (
    <Link
      to="/discover"
      className="fixed bottom-24 lg:bottom-8 right-6 z-30 btn btn-circle btn-lg bg-gradient-to-br from-primary via-secondary to-accent text-white border-none shadow-2xl hover:scale-110 transition-transform"
      title="Discover people & groups"
    >
      <CompassIcon className="size-6" />
    </Link>
  );
};

export default DiscoverFAB;