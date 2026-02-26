import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type ReadingBook = Database['public']['Tables']['reading_books']['Row'];
type ReadingBookInsert = Database['public']['Tables']['reading_books']['Insert'];
type ReadingBookUpdate = Database['public']['Tables']['reading_books']['Update'];

export function useBooks(userId?: string) {
    const [books, setBooks] = useState<ReadingBook[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadBooks = useCallback(async () => {
        if (!userId) {
            setBooks([]);
            return;
        }

        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('reading_books')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setBooks(data || []);
        } catch (err) {
            setError('Failed to load books');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadBooks();
    }, [loadBooks]);

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
        refreshBooks: loadBooks,
        addBook,
        updateBook,
        deleteBook
    };
}
