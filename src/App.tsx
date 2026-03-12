/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

const Auth = lazy(() => import("./pages/Auth"));
import Splash from "./pages/Splash";
const Home = lazy(() => import("./pages/Home"));
const Expense = lazy(() => import("./pages/Expense"));
const Goals = lazy(() => import("./pages/Goals"));
const History = lazy(() => import("./pages/History"));
const Profile = lazy(() => import("./pages/Profile"));
const Record = lazy(() => import("./pages/Record"));
const Report = lazy(() => import("./pages/Report"));
const Knowledge = lazy(() => import("./pages/Knowledge"));
import { useAuth } from "./hooks/useAuth";
import { useLocale } from "./hooks/useLocale";
import { warmCommonRoutes } from "./lib/prefetch";

function AppLoadingScreen() {
  const { tr } = useLocale();
  return (
    <div className="fixed inset-0 z-[90] bg-[#F9FAFB] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9DC5EF] animate-bounce" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#C7B6A6] animate-bounce [animation-delay:120ms]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#D8AFAF] animate-bounce [animation-delay:240ms]" />
        </div>
        <p className="text-xs tracking-wide text-gray-500">{tr('loading_workspace', 'Loading your workspace...')}</p>
      </div>
    </div>
  );
}

// Protected Route Wrapper
function ProtectedRoute({ children, user }: { children: React.ReactNode; user: unknown }) {
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [homeReady, setHomeReady] = useState(false);
  const [startupMinDone, setStartupMinDone] = useState(false);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (import.meta.env.DEV) {
      import('./lib/localStorage').then((m) => m.initTestData());
    }
    warmCommonRoutes();
  }, []);

  useEffect(() => {
    const onReady = () => setHomeReady(true);
    window.addEventListener('home-initial-ready', onReady);
    const timer = window.setTimeout(() => setHomeReady(true), 5000);
    return () => {
      window.removeEventListener('home-initial-ready', onReady);
      window.clearTimeout(timer);
    };
  }, []);

  // Keep startup loading overlay (matrix screen) visible at least 1s,
  // so it can both present the matrix and absorb initial data loading.
  useEffect(() => {
    if (showSplash || authLoading || !user) {
      setStartupMinDone(false);
      setHomeReady(false);
      return;
    }

    setStartupMinDone(false);
    const timer = window.setTimeout(() => setStartupMinDone(true), 1000);
    return () => window.clearTimeout(timer);
  }, [showSplash, authLoading, user]);

  // Keep startup visuals in one flow: splash -> loading on same screen -> app.
  if (showSplash || authLoading) {
    return (
      <BrowserRouter>
        <Splash
          onFinish={showSplash ? () => setShowSplash(false) : undefined}
          loading={!showSplash}
        />
      </BrowserRouter>
    );
  }

  const showStartupOverlay = !!user && (!homeReady || !startupMinDone);

  return (
    <BrowserRouter>
      {showStartupOverlay && <Splash loading />}
      <Routes>
        <Route path="/auth" element={<Suspense fallback={<AppLoadingScreen />}><Auth /></Suspense>} />

        <Route element={<ProtectedRoute user={user}><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Suspense fallback={<AppLoadingScreen />}><Home /></Suspense>} />
          <Route path="/goals" element={<Suspense fallback={<AppLoadingScreen />}><Goals /></Suspense>} />
          <Route path="/history" element={<Suspense fallback={<AppLoadingScreen />}><History /></Suspense>} />
          <Route path="/report" element={<Suspense fallback={<AppLoadingScreen />}><Report /></Suspense>} />
          <Route path="/knowledge" element={<Suspense fallback={<AppLoadingScreen />}><Knowledge /></Suspense>} />
          <Route path="/profile" element={<Suspense fallback={<AppLoadingScreen />}><Profile /></Suspense>} />
        </Route>

        <Route path="/record" element={<ProtectedRoute user={user}><Suspense fallback={<AppLoadingScreen />}><Record /></Suspense></ProtectedRoute>} />
        <Route path="/expense" element={<ProtectedRoute user={user}><Suspense fallback={<AppLoadingScreen />}><Expense /></Suspense></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
