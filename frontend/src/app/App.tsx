import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FontLoader } from "./FontLoader";
import { PageNav } from "@/widgets/PageNav";
import { isAuthenticated } from "@/shared/api/kastonomApi";

// Pages
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// Auth Route wrapper - redirects to home if already logged in
function AuthRoute({ children }: { children: React.ReactNode }) {
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <FontLoader />
      <Routes>
        {/* Login page - no PageNav */}
        <Route
          path="/login"
          element={
            <AuthRoute>
              <LoginPage />
            </AuthRoute>
          }
        />
        {/* Protected pages - with PageNav */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div style={{ paddingBottom: "64px" }}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="*" element={<HomePage />} />
                </Routes>
              </div>
              <PageNav />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
