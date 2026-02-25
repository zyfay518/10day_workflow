/**
 * useUserProfile Hook - 用户信息管理
 *
 * 功能:
 * - 查询用户配置信息
 * - 更新用户信息 (昵称、头像)
 * - 上传头像到 Supabase Storage
 *
 * 参考: DATA_FLOW.md "3.6 Settings 页面"
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  uploadAvatar: (file: File) => Promise<string | null>;
}

export function useUserProfile(userId?: string): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchProfile();
  }, [userId]);

  /**
   * 查询用户配置信息
   */
  const fetchProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      setProfile(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 更新用户信息
   *
   * @param updates - 要更新的字段
   * @returns 是否成功
   */
  const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // 更新本地状态
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      setError(null);
      return true;
    } catch (err) {
      console.error('Failed to update user profile:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  /**
   * 上传头像到 Supabase Storage
   *
   * @param file - 头像文件
   * @returns 头像 URL
   */
  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!userId) return null;

    try {
      // 1. 上传文件到 Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true, // 覆盖已存在的文件
        });

      if (uploadError) throw uploadError;

      // 2. 获取公开 URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // 3. 更新用户配置
      await updateProfile({ avatar_url: publicUrl });

      return publicUrl;
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    uploadAvatar,
  };
}
