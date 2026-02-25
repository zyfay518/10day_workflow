import { useState, useCallback, useEffect } from 'react';
import { Database } from '../types/database';

type ReadingBook = Database['public']['Tables']['reading_books']['Row'];
type ReadingBookInsert = Database['public']['Tables']['reading_books']['Insert'];
type ReadingBookUpdate = Database['public']['Tables']['reading_books']['Update'];

export function useBooks(userId?: string) {
    const [books, setBooks] = useState<ReadingBook[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const STORAGE_KEY = 'reading_books';

    const loadBooks = useCallback(() => {
        if (!userId) {
            setBooks([]);
            return;
        }

        try {
            setLoading(true);
            const data = localStorage.getItem(STORAGE_KEY);
            const allBooks: ReadingBook[] = data ? JSON.parse(data) : [];
            setBooks(allBooks.filter(b => b.user_id === userId));
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

    const saveToStorage = (allBooks: ReadingBook[]) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allBooks));
    };

    const addBook = async (book: Omit<ReadingBookInsert, 'id' | 'created_at' | 'updated_at'>) => {
        if (!userId) return null;

        try {
            const data = localStorage.getItem(STORAGE_KEY);
            const allBooks: ReadingBook[] = data ? JSON.parse(data) : [];

            const newBook: ReadingBook = {
                ...book,
                id: Date.now(), // simple ID generation for local storage
                author: book.author ?? null,
                reading_status: book.reading_status ?? 'reading',
                progress_percent: book.progress_percent ?? 0,
                notes: book.notes ?? null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            allBooks.push(newBook);
            saveToStorage(allBooks);
            loadBooks();
            return newBook;
        } catch (err) {
            setError('Failed to add book');
            console.error(err);
            return null;
        }
    };

    const updateBook = async (id: number, updates: ReadingBookUpdate) => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            let allBooks: ReadingBook[] = data ? JSON.parse(data) : [];

            let updatedBook: ReadingBook | null = null;
            allBooks = allBooks.map(book => {
                if (book.id === id) {
                    updatedBook = { ...book, ...updates, updated_at: new Date().toISOString() };
                    return updatedBook;
                }
                return book;
            });

            if (updatedBook) {
                saveToStorage(allBooks);
                loadBooks();
                return true;
            }
            return false;
        } catch (err) {
            setError('Failed to update book');
            console.error(err);
            return false;
        }
    };

    const deleteBook = async (id: number) => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            let allBooks: ReadingBook[] = data ? JSON.parse(data) : [];

            const initialLength = allBooks.length;
            allBooks = allBooks.filter(book => book.id !== id);

            if (allBooks.length < initialLength) {
                saveToStorage(allBooks);
                loadBooks();
                return true;
            }
            return false;
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
