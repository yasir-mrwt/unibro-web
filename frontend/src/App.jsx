import React, { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeContext";
import { ToastProvider } from "./components/ui/ToastContext";
import { LoadingState } from "./components/ui/States";
import Navbar from "./components/navbar";

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
                    element={<DepartmentSelection />}
                  />
                  <Route
                    path="/select-semester"
                    element={<SemesterSelection />}
                  />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route
                    path="/resource-details"
                    element={<ResourceDetails />}
                  />
                  <Route path="/upload-modal" element={<UploadModal />} />
                  <Route path="/community" element={<Community />} />
                  <Route path="/staff" element={<StaffDirectory />} />
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
                    element={<ProfileSettings />}
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
                  <Route path="/my-posts" element={<MyPosts />} />
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
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
