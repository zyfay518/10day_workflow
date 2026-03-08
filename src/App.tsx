/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Splash from "./pages/Splash";

const Expense = lazy(() => import("./pages/Expense"));
const Goals = lazy(() => import("./pages/Goals"));
const History = lazy(() => import("./pages/History"));
const Profile = lazy(() => import("./pages/Profile"));
const Record = lazy(() => import("./pages/Record"));
const Report = lazy(() => import("./pages/Report"));
const Knowledge = lazy(() => import("./pages/Knowledge"));
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
            <Route path="/goals" element={<Suspense fallback={<AppLoadingScreen />}><Goals /></Suspense>} />
            <Route path="/history" element={<Suspense fallback={<AppLoadingScreen />}><History /></Suspense>} />
            <Route path="/report" element={<Suspense fallback={<AppLoadingScreen />}><Report /></Suspense>} />
            <Route path="/knowledge" element={<Suspense fallback={<AppLoadingScreen />}><Knowledge /></Suspense>} />
            <Route path="/profile" element={<Suspense fallback={<AppLoadingScreen />}><Profile /></Suspense>} />
          </Route>

          <Route path="/record" element={<ProtectedRoute><Suspense fallback={<AppLoadingScreen />}><Record /></Suspense></ProtectedRoute>} />
          <Route path="/expense" element={<ProtectedRoute><Suspense fallback={<AppLoadingScreen />}><Expense /></Suspense></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
