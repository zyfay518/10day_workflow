/**
 * 附件管理 Hook (localStorage版本)
 *
 * 用于处理图片和语音附件的上传、查询、删除
 */

import { useState, useCallback } from 'react';
import { localAttachments } from '../lib/localStorage';
import { Database } from '../types/database';

type RecordAttachment = Database['public']['Tables']['record_attachments']['Row'];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function useAttachments(recordId?: number, userId?: string) {
  const [attachments, setAttachments] = useState<RecordAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // 加载附件列表
  const loadAttachments = useCallback(() => {
    if (!recordId) return;
    setLoading(true);
    const list = localAttachments.getByRecordId(recordId);
    setAttachments(list);
    setLoading(false);
  }, [recordId]);

  // 将文件转为base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 上传图片
  const uploadImage = useCallback(
    async (file: File): Promise<RecordAttachment> => {
      if (!recordId || !userId) {
        throw new Error('Record ID and User ID are required');
      }

      // 验证文件大小
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('文件大小超过5MB限制');
      }

      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        throw new Error('只支持图片格式');
      }

      setUploading(true);

      try {
        // 转换为base64
        const base64 = await fileToBase64(file);

        // 保存附件记录
        const attachment = localAttachments.save({
          record_id: recordId,
          user_id: userId,
          file_type: 'image',
          file_url: base64,
          file_name: file.name,
          file_size: file.size,
        });

        // 更新列表
        setAttachments(prev => [...prev, attachment]);

        return attachment;
      } finally {
        setUploading(false);
      }
    },
    [recordId, userId]
  );

  // 拍照上传
  const capturePhoto = useCallback(async (): Promise<RecordAttachment> => {
    if (!recordId || !userId) {
      throw new Error('Record ID and User ID are required');
    }

    setUploading(true);

    try {
      // 调用浏览器摄像头API
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // 优先使用后置摄像头
      });

      // 创建video元素捕获画面
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // 等待视频加载
      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });

      // 创建canvas捕获当前帧
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      // 停��摄像头
      stream.getTracks().forEach(track => track.stop());

      // 转换为blob
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', 0.8)
      );

      if (!blob) {
        throw new Error('Failed to capture photo');
      }

      // 检查大小
      if (blob.size > MAX_FILE_SIZE) {
        throw new Error('照片大小超过5MB限制');
      }

      // 转换为base64
      const base64 = await fileToBase64(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));

      // 保存附件记录
      const attachment = localAttachments.save({
        record_id: recordId,
        user_id: userId,
        file_type: 'image',
        file_url: base64,
        file_name: `photo_${Date.now()}.jpg`,
        file_size: blob.size,
      });

      // 更新列表
      setAttachments(prev => [...prev, attachment]);

      return attachment;
    } finally {
      setUploading(false);
    }
  }, [recordId, userId]);

  // 删除附件
  const deleteAttachment = useCallback((id: number): boolean => {
    const success = localAttachments.delete(id);
    if (success) {
      setAttachments(prev => prev.filter(a => a.id !== id));
    }
    return success;
  }, []);

  return {
    attachments,
    loading,
    uploading,
    loadAttachments,
    uploadImage,
    capturePhoto,
    deleteAttachment,
  };
}
