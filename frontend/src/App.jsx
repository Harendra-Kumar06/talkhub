import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { Toaster } from "react-hot-toast";

import PageLoader from "./components/PageLoader.jsx";
import useAuthUser from "./hooks/useAuthUser.js";
import useOnlineStatus from "./hooks/useOnlineStatus.js";
import Layout from "./components/Layout.jsx";
import CallManager from "./components/CallManager.jsx";
import { useThemeStore } from "./store/useThemeStore.js";

// 🚀 Lazy load all pages
const SignUpPage = lazy(() => import("./pages/SignUpPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage.jsx"));
const CallPage = lazy(() => import("./pages/CallPage.jsx"));
const ChatPage = lazy(() => import("./pages/ChatPage.jsx"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage.jsx"));
const FriendsPage = lazy(() => import("./pages/FriendsPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const StatusPage = lazy(() => import("./pages/StatusPage.jsx"));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage.jsx"));
const GroupInfoPage = lazy(() => import("./pages/GroupInfoPage.jsx"));

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const { theme } = useThemeStore();
  useOnlineStatus();

  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboarded;

  if (isLoading) return <PageLoader />;

  return (
    <div className="h-screen" data-theme={theme}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated && isOnboarded ? (
                <Navigate to="/friends" replace />
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />

          <Route
            path="/friends"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}><FriendsPage /></Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />

          <Route
            path="/status"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}><StatusPage /></Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />

          <Route
            path="/discover"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}><DiscoverPage /></Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />

          <Route
            path="/groups/:id"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}><GroupInfoPage /></Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />

          <Route
            path="/signup"
            element={
              !isAuthenticated ? <SignUpPage /> : <Navigate to={isOnboarded ? "/friends" : "/onboarding"} />
            }
          />
          <Route
            path="/login"
            element={
              !isAuthenticated ? <LoginPage /> : <Navigate to={isOnboarded ? "/friends" : "/onboarding"} />
            }
          />

          <Route
            path="/alerts"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}><NotificationsPage /></Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />

          <Route path="/notifications" element={<Navigate to="/alerts" replace />} />

          <Route
            path="/call/:id"
            element={
              isAuthenticated && isOnboarded ? (
                <CallPage />
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />

          <Route
            path="/chat/:id"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}><ChatPage /></Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />

          <Route
            path="/onboarding"
            element={
              isAuthenticated ? (
                !isOnboarded ? <OnboardingPage /> : <Navigate to="/login" />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          <Route
            path="/profile"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}><ProfilePage /></Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />
        </Routes>
      </Suspense>

      {isAuthenticated && isOnboarded && <CallManager />}
      <Toaster />
    </div>
  );
};

export default App;