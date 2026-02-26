import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Report = Database['public']['Tables']['reports']['Row'];

export function useReports(userId: string | undefined, cycleId: number | undefined) {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    const loadReports = useCallback(async () => {
        if (!userId || !cycleId) {
            setReports([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .eq('user_id', userId)
                .eq('cycle_id', cycleId);

            if (error) throw error;
            setReports(data || []);
        } catch (err) {
            console.error('Failed to load reports:', err);
        } finally {
            setLoading(false);
        }
    }, [userId, cycleId]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    return {
        reports,
        loading,
        refreshReports: loadReports,
    };
}
