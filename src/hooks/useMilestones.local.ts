import { useState, useCallback, useEffect } from 'react';
import { Database } from '../types/database';

type Milestone = Database['public']['Tables']['milestones']['Row'];
type MilestoneInsert = Database['public']['Tables']['milestones']['Insert'];
type MilestoneUpdate = Database['public']['Tables']['milestones']['Update'];

export function useMilestones(userId?: string) {
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const STORAGE_KEY = 'milestones';

    const loadMilestones = useCallback(() => {
        if (!userId) {
            setMilestones([]);
            return;
        }

        try {
            setLoading(true);
            const data = localStorage.getItem(STORAGE_KEY);
            const allMilestones: Milestone[] = data ? JSON.parse(data) : [];
            setMilestones(allMilestones.filter(m => m.user_id === userId));
        } catch (err) {
            setError('Failed to load milestones');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadMilestones();
    }, [loadMilestones]);

    const saveToStorage = (allMilestones: Milestone[]) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allMilestones));
    };

    const addMilestone = async (milestone: Omit<MilestoneInsert, 'id' | 'created_at' | 'updated_at'>) => {
        if (!userId) return null;

        try {
            const data = localStorage.getItem(STORAGE_KEY);
            const allMilestones: Milestone[] = data ? JSON.parse(data) : [];

            const newMilestone: Milestone = {
                ...milestone,
                id: Date.now(), // simple ID generation for local storage
                event_description: milestone.event_description ?? null,
                related_dimension_id: milestone.related_dimension_id ?? null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            allMilestones.push(newMilestone);
            saveToStorage(allMilestones);
            loadMilestones();
            return newMilestone;
        } catch (err) {
            setError('Failed to add milestone');
            console.error(err);
            return null;
        }
    };

    const updateMilestone = async (id: number, updates: MilestoneUpdate) => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            let allMilestones: Milestone[] = data ? JSON.parse(data) : [];

            let updatedMilestone: Milestone | null = null;
            allMilestones = allMilestones.map(m => {
                if (m.id === id) {
                    updatedMilestone = { ...m, ...updates, updated_at: new Date().toISOString() };
                    return updatedMilestone;
                }
                return m;
            });

            if (updatedMilestone) {
                saveToStorage(allMilestones);
                loadMilestones();
                return true;
            }
            return false;
        } catch (err) {
            setError('Failed to update milestone');
            console.error(err);
            return false;
        }
    };

    const deleteMilestone = async (id: number) => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            let allMilestones: Milestone[] = data ? JSON.parse(data) : [];

            const initialLength = allMilestones.length;
            allMilestones = allMilestones.filter(m => m.id !== id);

            if (allMilestones.length < initialLength) {
                saveToStorage(allMilestones);
                loadMilestones();
                return true;
            }
            return false;
        } catch (err) {
            setError('Failed to delete milestone');
            console.error(err);
            return false;
        }
    };

    return {
        milestones,
        loading,
        error,
        refreshMilestones: loadMilestones,
        addMilestone,
        updateMilestone,
        deleteMilestone
    };
}
