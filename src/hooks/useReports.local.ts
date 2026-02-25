import { useState, useEffect, useCallback } from 'react';
import { localReports } from '../lib/localStorage';
import { Database } from '../types/database';

type Report = Database['public']['Tables']['reports']['Row'];

export function useReports(userId: string | undefined, cycleId: number | undefined) {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    const loadReports = useCallback(() => {
        if (!userId || !cycleId) {
            setReports([]);
            setLoading(false);
            return;
        }

        const data = localReports.getByCycle(userId, cycleId);
        setReports(data);
        setLoading(false);
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
