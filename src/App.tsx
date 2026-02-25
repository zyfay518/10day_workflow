/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Expense from "./pages/Expense";
import Goals from "./pages/Goals";
import History from "./pages/History";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Record from "./pages/Record";
import Report from "./pages/Report";
import Knowledge from "./pages/Knowledge";
import { initTestData, localAuth } from "./lib/localStorage";

export default function App() {
  useEffect(() => {
    // 自动初始化测试数据和登录
    initTestData();
    const user = localAuth.getCurrentUser();
    if (!user) {
      localAuth.login('+8613800138000');
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/history" element={<History />} />
          <Route path="/report" element={<Report />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="/record" element={<Record />} />
        <Route path="/expense" element={<Expense />} />
      </Routes>
    </BrowserRouter>
  );
}
