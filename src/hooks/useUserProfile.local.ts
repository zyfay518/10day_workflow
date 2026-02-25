/**
 * useUserProfile Hook - 本地存储版本
 */

import { useEffect, useState } from 'react';
import { localUserProfile } from '../lib/localStorage';
import { Database } from '../types/database';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => boolean;
}

export function useUserProfile(userId?: string): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const userProfile = localUserProfile.get(userId);
    setProfile(userProfile);
    setLoading(false);
  }, [userId]);

  const updateProfile = (updates: Partial<UserProfile>): boolean => {
    if (!userId) return false;

    const success = localUserProfile.update(userId, updates);
    if (success) {
      const updatedProfile = localUserProfile.get(userId);
      setProfile(updatedProfile);
    }
    return success;
  };

  return {
    profile,
    loading,
    updateProfile,
  };
}
