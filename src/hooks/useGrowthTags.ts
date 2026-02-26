import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type GrowthTag = Database['public']['Tables']['growth_tags']['Row'];
type GrowthTagInsert = Database['public']['Tables']['growth_tags']['Insert'];

export function useGrowthTags(userId?: string) {
    const [tags, setTags] = useState<GrowthTag[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadTags = useCallback(async () => {
        if (!userId) {
            setTags([]);
            return;
        }

        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('growth_tags')
                .select('*')
                .eq('user_id', userId)
                .order('frequency', { ascending: false });

            if (fetchError) throw fetchError;
            setTags((data as GrowthTag[]) || []);
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

    const addOrIncrementTag = async (tagName: string, dimensionId?: number) => {
        if (!userId) return null;

        try {
            // Check if tag already exists for this user and dimension
            const { data: existingTags, error: searchError } = await supabase
                .from('growth_tags')
                .select('*')
                .eq('user_id', userId)
                .eq('tag_name', tagName)
                .eq('dimension_id', dimensionId || null);

            if (searchError) throw searchError;

            if (existingTags && existingTags.length > 0) {
                // Increment frequency
                const tag = existingTags[0] as GrowthTag;
                const { data: updatedTag, error: updateError } = await supabase
                    .from('growth_tags')
                    .update({
                        frequency: tag.frequency + 1,
                        updated_at: new Date().toISOString()
                    } as any)
                    .eq('id', tag.id)
                    .select()
                    .single();

                if (updateError) throw updateError;
                setTags(prev => prev.map(t => (t.id === tag.id ? (updatedTag as GrowthTag) : t)));
                return true;
            } else {
                // Add new tag
                const { data: newTag, error: insertError } = await supabase
                    .from('growth_tags')
                    .insert([{
                        user_id: userId,
                        tag_name: tagName,
                        dimension_id: dimensionId || null,
                        frequency: 1,
                        updated_at: new Date().toISOString()
                    } as any])
                    .select()
                    .single();

                if (insertError) throw insertError;
                setTags(prev => [...prev, (newTag as GrowthTag)]);
                return true;
            }
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
