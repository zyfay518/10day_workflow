import { useState, useCallback, useEffect } from 'react';
import { Database } from '../types/database';

type GrowthTag = Database['public']['Tables']['growth_tags']['Row'];
type GrowthTagInsert = Database['public']['Tables']['growth_tags']['Insert'];
type GrowthTagUpdate = Database['public']['Tables']['growth_tags']['Update'];

export function useGrowthTags(userId?: string) {
    const [tags, setTags] = useState<GrowthTag[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const STORAGE_KEY = 'growth_tags';

    const loadTags = useCallback(() => {
        if (!userId) {
            setTags([]);
            return;
        }

        try {
            setLoading(true);
            const data = localStorage.getItem(STORAGE_KEY);
            const allTags: GrowthTag[] = data ? JSON.parse(data) : [];
            setTags(allTags.filter(t => t.user_id === userId));
        } catch (err) {
            setError('Failed to load growth tags');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadTags();
    }, [loadTags]);

    const saveToStorage = (allTags: GrowthTag[]) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allTags));
    };

    const addOrIncrementTag = async (tagName: string, dimensionId?: number) => {
        if (!userId) return null;

        try {
            const data = localStorage.getItem(STORAGE_KEY);
            const allTags: GrowthTag[] = data ? JSON.parse(data) : [];

            const existingTagIndex = allTags.findIndex(t => t.user_id === userId && t.tag_name === tagName && (dimensionId === undefined || t.dimension_id === dimensionId));

            if (existingTagIndex >= 0) {
                // Increment frequency
                allTags[existingTagIndex].frequency += 1;
                allTags[existingTagIndex].updated_at = new Date().toISOString();
            } else {
                // Add new tag
                const newTag: GrowthTag = {
                    id: Date.now() + Math.floor(Math.random() * 1000), // simple ID generation
                    user_id: userId,
                    dimension_id: dimensionId || null,
                    tag_name: tagName,
                    frequency: 1,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                allTags.push(newTag);
            }

            saveToStorage(allTags);
            loadTags();
            return true;
        } catch (err) {
            setError('Failed to process tag');
            console.error(err);
            return false;
        }
    };

    return {
        tags,
        loading,
        error,
        refreshTags: loadTags,
        addOrIncrementTag
    };
}
