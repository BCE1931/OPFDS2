import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import { ModeToggle } from "./components/mode-toggle";
import Layout from "./PAGES/layout";
import Card1 from "./PAGES/Card1";
import Signup from "./PAGES/Signup";
import ExamWithLookAway from "./PAGES/ExamWithLookAway";
import { useState, useEffect } from "react";
import Analyze from "./PAGES/Analyze";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  const PublicRoute = ({ element }) => {
    return localStorage.getItem("username") ? (
      <Navigate to="/exam" replace />
    ) : (
      element
    );
  };

  const ProtectedRoute = ({ element }) => {
    return localStorage.getItem("username") ? (
      element
    ) : (
      <Navigate to="/" replace />
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
          <div className="app-container">
            <Routes>
              <Route
                path="/"
                element={<ProtectedRoute element={<ExamWithLookAway />} />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        ) : (
          <Layout>
            <div className="app-container">
              <div className="top-right">
                <ModeToggle />
              </div>

              <div>
                <div>
                  <Routes>
                    <Route
                      path="/"
                      element={<PublicRoute element={<Card1 />} />}
                    />
                    <Route
                      path="/signup"
                      element={<PublicRoute element={<Signup />} />}
                    />

                    <Route
                      path="/exam"
                      element={
                        <ProtectedRoute element={<ExamWithLookAway />} />
                      }
                    />
                    <Route
                      path="/analyze"
                      element={<ProtectedRoute element={<Analyze />} />}
                    />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </div>
            </div>
          </Layout>
        )}
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
