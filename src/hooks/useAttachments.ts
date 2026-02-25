/**
 * useAttachments Hook - 附件管理
 *
 * 功能:
 * - 上传图片到 Supabase Storage
 * - 调用 Gemini AI 进行 OCR 识别
 * - 保存附件记录到数据库
 *
 * 参考: DATA_FLOW.md "3.2.4 附件上传流程"
 */

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type RecordAttachment = Database['public']['Tables']['record_attachments']['Row'];
type RecordAttachmentInsert =
  Database['public']['Tables']['record_attachments']['Insert'];

interface UseAttachmentsReturn {
  uploading: boolean;
  error: string | null;
  uploadImage: (file: File, recordId: number) => Promise<string | null>;
  ocrImage: (imageUrl: string) => Promise<string | null>;
  saveAttachment: (attachment: RecordAttachmentInsert) => Promise<boolean>;
}

export function useAttachments(): UseAttachmentsReturn {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 上传图片到 Supabase Storage
   *
   * @param file - 图片文件
   * @param recordId - 关联的记录 ID
   * @returns 图片公开 URL
   */
  const uploadImage = async (
    file: File,
    recordId: number
  ): Promise<string | null> => {
    try {
      setUploading(true);
      setError(null);

      // 1. 生成文件路径
      const fileExt = file.name.split('.').pop();
      const fileName = `${recordId}/${Date.now()}.${fileExt}`;

      // 2. 上传到 Storage
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 3. 获取公开 URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('attachments').getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.error('Failed to upload image:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setUploading(false);
    }
  };

  /**
   * OCR 识别图片文字
   *
   * 调用 Gemini Vision AI 进行文字识别
   *
   * @param imageUrl - 图片 URL
   * @returns 识别的文字内容
   */
  const ocrImage = async (imageUrl: string): Promise<string | null> => {
    try {
      setError(null);

      // 调用 Gemini Vision API
      // 注意: 这里需要实现 Gemini Vision 的调用逻辑
      // 可以参考 parseExpense 的实现方式

      // TODO: 实现 Gemini Vision OCR
      console.warn('OCR functionality not yet implemented');

      // 临时返回空字符串
      return '';
    } catch (err) {
      console.error('Failed to perform OCR:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  };

  /**
   * 保存附件记录到数据库
   *
   * @param attachment - 附件数据
   * @returns 是否成功
   */
  const saveAttachment = async (
    attachment: RecordAttachmentInsert
  ): Promise<boolean> => {
    try {
      setError(null);

      const { error: insertError } = await supabase
        .from('record_attachments')
        .insert(attachment);

      if (insertError) throw insertError;

      return true;
    } catch (err) {
      console.error('Failed to save attachment:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  return {
    uploading,
    error,
    uploadImage,
    ocrImage,
    saveAttachment,
  };
}
