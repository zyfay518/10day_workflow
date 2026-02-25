/**
 * useAuth Hook - 本地存储版本
 * 用于开发测试，不需要真实的认证服务
 */

import { useEffect, useState } from 'react';
import { localAuth } from '../lib/localStorage';

interface User {
  id: string;
  phone: string;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  login: (phone: string) => void;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查是否有已登录用户
    const currentUser = localAuth.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const login = (phone: string) => {
    const { user: loggedInUser } = localAuth.login(phone);
    setUser(loggedInUser);
  };

  const logout = () => {
    localAuth.logout();
    setUser(null);
  };

  return {
    user,
    loading,
    login,
    logout,
  };
}
