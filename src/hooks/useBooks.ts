import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type ReadingBook = Database['public']['Tables']['reading_books']['Row'];
type ReadingBookInsert = Database['public']['Tables']['reading_books']['Insert'];
type ReadingBookUpdate = Database['public']['Tables']['reading_books']['Update'];

type CacheEntry = { items: ReadingBook[]; ts: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<void>>();
const TTL_MS = 60_000;
const key = (userId: string) => `books_cache_${userId}`;

function read(userId: string): CacheEntry | null {
  try { const raw = localStorage.getItem(key(userId)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function write(userId: string, entry: CacheEntry) {
  try { localStorage.setItem(key(userId), JSON.stringify(entry)); } catch {}
}

export function useBooks(userId?: string) {
  const [books, setBooks] = useState<ReadingBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBooks = useCallback(async (showLoading = true) => {
    if (!userId) {
      setBooks([]);
      return;
    }

    const existing = inflight.get(userId);
    if (existing) {
      await existing;
      return;
    }

    const task = (async () => {
      try {
        if (showLoading) setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('reading_books')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        const rows = data || [];
        setBooks(rows);
        const entry = { items: rows, ts: Date.now() };
        cache.set(userId, entry);
        write(userId, entry);
      } catch (err) {
        setError('Failed to load books');
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();

    inflight.set(userId, task);
    try { await task; } finally { inflight.delete(userId); }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setBooks([]);
      return;
    }
    const cached = cache.get(userId) || read(userId);
    const fresh = cached && Date.now() - cached.ts < TTL_MS;
    if (cached) {
      setBooks(cached.items);
      setLoading(false);
      if (!fresh) loadBooks(false);
    } else {
      loadBooks(true);
    }
  }, [userId, loadBooks]);

  const addBook = async (book: Omit<ReadingBookInsert, 'id' | 'created_at' | 'updated_at'>) => {
    if (!userId) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('reading_books')
        .insert([{ ...book, user_id: userId }])
        .select()
        .single();

      if (insertError) throw insertError;

      setBooks(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError('Failed to add book');
      console.error(err);
      return null;
    }
  };

  const updateBook = async (id: number, updates: ReadingBookUpdate) => {
    try {
      const { data, error: updateError } = await supabase
        .from('reading_books')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setBooks(prev => prev.map(book => book.id === id ? data : book));
      return true;
    } catch (err) {
      setError('Failed to update book');
      console.error(err);
      return false;
    }
  };

  const deleteBook = async (id: number) => {
    try {
      const { error: deleteError } = await supabase
        .from('reading_books')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setBooks(prev => prev.filter(book => book.id !== id));
      return true;
    } catch (err) {
      setError('Failed to delete book');
      console.error(err);
      return false;
    }
  };

  return {
    books,
    loading,
    error,
    refreshBooks: () => loadBooks(true),
    addBook,
    updateBook,
    deleteBook
  };
}
