import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import { ModeToggle } from "./components/mode-toggle";
import Layout from "./PAGES/layout";
import Card1 from "./PAGES/Card1";
import Signup from "./PAGES/Signup";
import ExamWithLookAway from "./PAGES/ExamWithLookAway";
import Analyze from "./PAGES/Analyze";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Check from "./PAGES/Check";
import IntroPage from "./PAGES/Intropage";
import Hero from "./PAGES/Hero";

const App = () => {
  const PublicRoute = ({ element }) => {
    return localStorage.getItem("username") ? (
      <Navigate to="/hero" replace />
    ) : (
      element
    );
  };

  const ProtectedRoute = ({ element }) => {
    return localStorage.getItem("username") ? (
      element
    ) : (
      <Navigate to="/signin" replace />
    );
  };

  const [isExamMode, setIsExamMode] = useState(
    localStorage.getItem("examMode") === "true"
  );

  useEffect(() => {
    const handleStorageChange = () => {
      setIsExamMode(localStorage.getItem("examMode") === "true");
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <ToastContainer />
      <BrowserRouter>
        {isExamMode ? (
          // ✅ Exam mode pages only
          <div className="app-container">
            <Routes>
              <Route
                path="/check"
                element={<ProtectedRoute element={<Check />} />}
              />
              <Route
                path="/exam"
                element={<ProtectedRoute element={<ExamWithLookAway />} />}
              />
              <Route path="*" element={<Navigate to="/exam" replace />} />
            </Routes>
          </div>
        ) : (
          // ✅ Normal (non-exam) pages
          <div className="app-container">
            <div className="top-right">
              <ModeToggle />
            </div>

            <Routes>
              {/* Public routes */}
              <Route
                path="/"
                element={<PublicRoute element={<IntroPage />} />}
              />
              <Route
                path="/signin"
                element={<PublicRoute element={<Card1 />} />}
              />
              <Route
                path="/signup"
                element={<PublicRoute element={<Signup />} />}
              />

              {/* ✅ Only /hero has sidebar layout */}
              <Route
                path="/hero"
                element={
                  <ProtectedRoute
                    element={
                      <Layout>
                        <Hero />
                      </Layout>
                    }
                  />
                }
              />

              {/* Other protected pages (no sidebar) */}
              <Route
                path="/check"
                element={<ProtectedRoute element={<Check />} />}
              />
              <Route
                path="/analyze"
                element={<ProtectedRoute element={<Analyze />} />}
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/signin" replace />} />
            </Routes>
          </div>
        )}
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
