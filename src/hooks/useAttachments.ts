import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type RecordAttachment = Database['public']['Tables']['record_attachments']['Row'];
type RecordAttachmentInsert = Database['public']['Tables']['record_attachments']['Insert'];

export function useAttachments(recordId?: number, userId?: string) {
  const [attachments, setAttachments] = useState<RecordAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAttachments = useCallback(async () => {
    if (!recordId || !userId) {
      setAttachments([]);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('record_attachments')
        .select('*')
        .eq('record_id', recordId)
        .eq('user_id', userId);

      if (fetchError) throw fetchError;
      setAttachments(data || []);
    } catch (err) {
      console.error('Failed to load attachments:', err);
    }
  }, [recordId, userId]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const uploadImage = async (file: File) => {
    if (!recordId || !userId) return null;

    try {
      setUploading(true);
      setError(null);

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${recordId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName);

      const attachment: RecordAttachmentInsert = {
        record_id: recordId,
        user_id: userId,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type.startsWith('image/') ? 'image' : 'audio',
        file_size: file.size,
      };

      const { data: newAttachment, error: insertError } = await supabase
        .from('record_attachments')
        .insert([attachment])
        .select()
        .single();

      if (insertError) throw insertError;

      setAttachments(prev => [...prev, newAttachment]);
      return publicUrl;
    } catch (err) {
      console.error('Failed to upload image:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const capturePhoto = async () => {
    // In a real mobile app, this would use a camera API.
    // For web development we'll mock it or use an input file.
    // Here we'll just throw an error or suggest using uploadImage.
    throw new Error('Camera capture not supported in this environment. Please use file upload.');
  };

  const deleteAttachment = async (id: number) => {
    try {
      const { error: deleteError } = await supabase
        .from('record_attachments')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setAttachments(prev => prev.filter(a => a.id !== id));
      return true;
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      return false;
    }
  };

  return {
    attachments,
    uploading,
    error,
    uploadImage,
    capturePhoto,
    deleteAttachment,
    loadAttachments,
  };
}
