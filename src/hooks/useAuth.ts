/**
 * useAuth Hook - 认证管理
 *
 * 功能:
 * - 监听登录状态变化
 * - 实现手机号验证码登录/注册
 * - Session 自动管理
 * - 自动刷新 Token
 *
 * 参考: DATA_FLOW.md "2.2 登录数据流"
 */

import { useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

interface AuthActions {
  // 发送验证码 (手机号登录)
  sendOTP: (phone: string) => Promise<{ error: AuthError | null }>;
  // 验证验证码并登录
  verifyOTP: (phone: string, token: string) => Promise<{ error: AuthError | null }>;
  // 登出
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // 1. 获取当前 Session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Failed to get session:', error);
        setState({
          user: null,
          session: null,
          loading: false,
          error,
        });
        return;
      }

      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        error: null,
      });
    });

    // 2. 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        session,
      }));
    });

    // 3. 清理订阅
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * 发送手机验证码
   *
   * @param phone - 手机号 (格式: +8613800138000)
   */
  const sendOTP = async (phone: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          // 验证码有效期 60 秒
          shouldCreateUser: true, // 自动注册新用户
        },
      });

      if (error) {
        setState((prev) => ({ ...prev, error }));
      }

      return { error };
    } catch (err) {
      const error = err as AuthError;
      setState((prev) => ({ ...prev, error }));
      return { error };
    }
  };

  /**
   * 验证手机验证码并登录
   *
   * @param phone - 手机号
   * @param token - 验证码
   */
  const verifyOTP = async (phone: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });

      if (error) {
        setState((prev) => ({ ...prev, error }));
      }

      return { error };
    } catch (err) {
      const error = err as AuthError;
      setState((prev) => ({ ...prev, error }));
      return { error };
    }
  };

  /**
   * 登出
   */
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setState({
        user: null,
        session: null,
        loading: false,
        error: null,
      });
    } catch (err) {
      const error = err as AuthError;
      setState((prev) => ({ ...prev, error }));
    }
  };

  return {
    ...state,
    sendOTP,
    verifyOTP,
    signOut,
  };
}
