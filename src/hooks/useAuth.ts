import { useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

const INACTIVITY_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const LAST_ACTIVE_KEY = '10dflow_last_active';

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  const checkInactivity = async (session: Session | null) => {
    if (!session) return false;

    const lastActiveStr = localStorage.getItem(LAST_ACTIVE_KEY);
    if (lastActiveStr) {
      const lastActive = parseInt(lastActiveStr, 10);
      if (Date.now() - lastActive > INACTIVITY_TIMEOUT) {
        // Expired due to 7 days inactivity
        await supabase.auth.signOut();
        localStorage.removeItem(LAST_ACTIVE_KEY);
        return true;
      }
    }

    // Update active time since they just opened the app
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    return false;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('Failed to get session:', error);
        setState({ user: null, session: null, loading: false, error });
        return;
      }

      const expired = await checkInactivity(session);

      if (!expired) {
        setState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        });
      } else {
        setState({ user: null, session: null, loading: false, error: null });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      } else {
        localStorage.removeItem(LAST_ACTIVE_KEY);
      }

      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        session,
        loading: false
      }));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setState((prev) => ({ ...prev, error }));
      return { data, error };
    } catch (err) {
      const error = err as AuthError;
      setState((prev) => ({ ...prev, error }));
      return { data: null, error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setState((prev) => ({ ...prev, error }));
      return { data, error };
    } catch (err) {
      const error = err as AuthError;
      setState((prev) => ({ ...prev, error }));
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem(LAST_ACTIVE_KEY);
      setState({ user: null, session: null, loading: false, error: null });
    } catch (err) {
      const error = err as AuthError;
      setState((prev) => ({ ...prev, error }));
    }
  };

  return { ...state, signIn, signUp, signOut };
}
