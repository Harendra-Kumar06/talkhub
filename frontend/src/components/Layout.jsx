import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import DiscoverFAB from "./DiscoverFAB";
import { useLocation } from "react-router";
import useAuthUser from "../hooks/useAuthUser";

const Layout = ({ children, showSidebar = false }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { authUser } = useAuthUser();
  const isChatPage = currentPath?.startsWith("/chat");

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col">
      <div className="flex flex-1">
        {/* Hide main app sidebar on chat page (chat has its own sidebar) */}
        {showSidebar && !isChatPage && <Sidebar />}

        <div
          className={`flex-1 flex flex-col min-w-0 ${
            authUser && !isChatPage ? "pb-16 lg:pb-0" : ""
          }`}
        >
          {!isChatPage && <Navbar />}

          <main
            className={`flex-1 overflow-y-auto ${
              isChatPage ? "" : "p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full"
            }`}
          >
            {children}
          </main>
        </div>
      </div>

      {/* Bottom nav for mobile — hidden on chat page */}
      {showSidebar && authUser && !isChatPage && <BottomNav />}

      {/* Discover FAB */}
      {showSidebar && authUser && !isChatPage && <DiscoverFAB />}
    </div>
  );
};

export default Layout;