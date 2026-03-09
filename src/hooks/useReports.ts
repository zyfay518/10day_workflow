import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Report = Database['public']['Tables']['reports']['Row'];

type ReportsCacheEntry = { items: Report[]; ts: number };
const reportsCache = new Map<string, ReportsCacheEntry>();
const reportsInflight = new Map<string, Promise<void>>();
const REPORTS_TTL_MS = 60_000;
const reportsKey = (userId: string, cycleId: number) => `reports_cache_${userId}_${cycleId}`;

function readReports(userId: string, cycleId: number): ReportsCacheEntry | null {
    try {
        const raw = localStorage.getItem(reportsKey(userId, cycleId));
        return raw ? (JSON.parse(raw) as ReportsCacheEntry) : null;
    } catch {
        return null;
    }
}

function writeReports(userId: string, cycleId: number, entry: ReportsCacheEntry) {
    try { localStorage.setItem(reportsKey(userId, cycleId), JSON.stringify(entry)); } catch {}
}

export function useReports(userId: string | undefined, cycleId: number | undefined) {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    const loadReports = useCallback(async (showLoading = true) => {
        if (!userId || !cycleId) {
            setReports([]);
            setLoading(false);
            return;
        }

        const reqKey = `${userId}:${cycleId}`;
        const existing = reportsInflight.get(reqKey);
        if (existing) {
            await existing;
            return;
        }

        const task = (async () => {
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
            const entry = { items: rows, ts: Date.now() };
            reportsCache.set(`${userId}:${cycleId}`, entry);
            writeReports(userId, cycleId, entry);
        } catch (err) {
            console.error('Failed to load reports:', err);
        } finally {
            setLoading(false);
        }
        })();

        reportsInflight.set(reqKey, task);
        try {
            await task;
        } finally {
            reportsInflight.delete(reqKey);
        }
    }, [userId, cycleId]);

    useEffect(() => {
        if (!userId || !cycleId) {
            setReports([]);
            setLoading(false);
            return;
        }

        const key = `${userId}:${cycleId}`;
        const cached = reportsCache.get(key) || readReports(userId, cycleId);
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
