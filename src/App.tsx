/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Expense from "./pages/Expense";
import Goals from "./pages/Goals";
import History from "./pages/History";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Record from "./pages/Record";
import Report from "./pages/Report";
import Knowledge from "./pages/Knowledge";
import Auth from "./pages/Auth";
import Splash from "./pages/Splash";
import { useAuth } from "./hooks/useAuth";
import { initTestData } from "./lib/localStorage";

function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[90] bg-[#F9FAFB] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9DC5EF] animate-bounce" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#C7B6A6] animate-bounce [animation-delay:120ms]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#D8AFAF] animate-bounce [animation-delay:240ms]" />
        </div>
        <p className="text-xs tracking-wide text-gray-500">Loading your workspace...</p>
      </div>
    </div>
  );
}

// Protected Route Wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <AppLoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;

  return <>{children}</>;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const { loading: authLoading } = useAuth();

  useEffect(() => {
    initTestData();
  }, []);

  return (
    <BrowserRouter>
      {showSplash && <Splash onFinish={() => setShowSplash(false)} />}
      {!showSplash && authLoading && <AppLoadingScreen />}

      {!showSplash && (
        <Routes>
          <Route path="/auth" element={<Auth />} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Home />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/history" element={<History />} />
            <Route path="/report" element={<Report />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route path="/record" element={<ProtectedRoute><Record /></ProtectedRoute>} />
          <Route path="/expense" element={<ProtectedRoute><Expense /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
