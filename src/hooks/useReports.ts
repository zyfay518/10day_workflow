import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Report = Database['public']['Tables']['reports']['Row'];

type ReportsCacheEntry = { items: Report[]; ts: number };
const reportsCache = new Map<string, ReportsCacheEntry>();
const REPORTS_TTL_MS = 60_000;

export function useReports(userId: string | undefined, cycleId: number | undefined) {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    const loadReports = useCallback(async (showLoading = true) => {
        if (!userId || !cycleId) {
            setReports([]);
            setLoading(false);
            return;
        }

        try {
            if (showLoading) setLoading(true);
            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .eq('user_id', userId)
                .eq('cycle_id', cycleId);

            if (error) throw error;
            const rows = data || [];
            setReports(rows);
            reportsCache.set(`${userId}:${cycleId}`, { items: rows, ts: Date.now() });
        } catch (err) {
            console.error('Failed to load reports:', err);
        } finally {
            setLoading(false);
        }
    }, [userId, cycleId]);

    useEffect(() => {
        const key = `${userId}:${cycleId}`;
        const cached = reportsCache.get(key);
        const isFresh = cached && Date.now() - cached.ts < REPORTS_TTL_MS;

        if (cached) {
            setReports(cached.items);
            setLoading(false);
            if (!isFresh) loadReports(false);
        } else {
            loadReports(true);
        }
    }, [userId, cycleId, loadReports]);

    return {
        reports,
        loading,
        refreshReports: loadReports,
    };
}
