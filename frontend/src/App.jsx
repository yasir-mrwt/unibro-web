import React, { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeContext";
import { ToastProvider } from "./components/ui/ToastContext";
import { LoadingState } from "./components/ui/States";
import Navbar from "./components/navbar";
import { getStoredUser, isAuthenticated } from "./services/authService";

const Home = lazy(() => import("./pages/Home"));
const DepartmentSelection = lazy(
  () => import("./components/academics/departmentSelection"),
);
const SemesterSelection = lazy(
  () => import("./components/academics/semesterSelection"),
);
const Dashboard = lazy(() => import("./components/academics/dashboard"));
const ResourceDetails = lazy(
  () => import("./components/academics/resourceDetails"),
);
const UploadModal = lazy(() => import("./components/academics/uploadModel"));
const AboutPage = lazy(() => import("./components/navbarLinks/aboutPage"));
const StaffDirectory = lazy(
  () => import("./components/navbarLinks/StaffDirectory"),
);
const Community = lazy(() => import("./components/navbarLinks/communityPage"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const MyPosts = lazy(() => import("./pages/MyPosts"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AuthSuccess = lazy(() => import("./pages/AuthSuccess"));
const AuthError = lazy(() => import("./pages/AuthError"));
const NotFound = lazy(() => import("./pages/NotFound"));

function ProtectedRoute({ children, admin = false }) {
  const user = getStoredUser();
  if (!isAuthenticated())
    return <Navigate to="/" replace state={{ showLogin: true }} />;
  if (admin && user.role !== "admin")
    return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const handleOAuthLoginSuccess = (user) => {
    window.dispatchEvent(new CustomEvent("userLoggedIn", { detail: user }));
    window.dispatchEvent(new Event("storage"));
  };
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <div className="app-root">
            <Navbar />
            <main className="app-main">
              <Suspense
                fallback={
                  <div className="container page">
                    <LoadingState label="Loading page" />
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route
                    path="/select-department"
                    element={
                      <ProtectedRoute>
                        <DepartmentSelection />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/select-semester"
                    element={
                      <ProtectedRoute>
                        <SemesterSelection />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/resources"
                    element={
                      <ProtectedRoute>
                        <ResourceDetails />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/resource-details"
                    element={
                      <ProtectedRoute>
                        <ResourceDetails />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/upload-modal" element={<ProtectedRoute><UploadModal /></ProtectedRoute>} />
                  <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
                  <Route path="/staff" element={<ProtectedRoute><StaffDirectory /></ProtectedRoute>} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route
                    path="/verify-email/:token"
                    element={<VerifyEmail />}
                  />
                  <Route
                    path="/reset-password/:token"
                    element={<ResetPassword />}
                  />
                  <Route
                    path="/profile-settings"
                    element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>}
                  />
                  <Route
                    path="/auth/success"
                    element={
                      <AuthSuccess onLoginSuccess={handleOAuthLoginSuccess} />
                    }
                  />
                  <Route path="/auth/error" element={<AuthError />} />
                  <Route
                    path="/login"
                    element={
                      <Navigate to="/" replace state={{ showLogin: true }} />
                    }
                  />
                  <Route path="/my-posts" element={<ProtectedRoute><MyPosts /></ProtectedRoute>} />
                  <Route path="/admin/dashboard" element={<ProtectedRoute admin><AdminDashboard /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
