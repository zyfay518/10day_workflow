import React, { useEffect, useMemo, useState } from "react";
import { Infinity as InfinityIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { useLocale } from "../hooks/useLocale";
import { useAuth } from "../hooks/useAuth";
import { useCycles } from "../hooks/useCycles";
import CycleMatrixCore from "../components/CycleMatrixCore";

interface SplashProps {
  onFinish?: () => void;
  loading?: boolean;
}

export default function Splash({ onFinish, loading = false }: SplashProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const { tr } = useLocale();
  const { user } = useAuth();
  const { cycles, currentCycle } = useCycles(user?.id);
  const [cachedCycles, setCachedCycles] = useState<any[]>([]);

  useEffect(() => {
    if (!onFinish) return;

    const fadeTimer = setTimeout(() => setFadeOut(true), 1200);
    const completeTimer = setTimeout(() => onFinish(), 1500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onFinish]);

  useEffect(() => {
    if (!user?.id) return;
    const key = `matrix_snapshot_${user.id}`;
    if (cycles.length > 0) {
      localStorage.setItem(key, JSON.stringify({ cycles, ts: Date.now() }));
      setCachedCycles(cycles);
      return;
    }

    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setCachedCycles(parsed?.cycles || []);
    } catch {
      setCachedCycles([]);
    }
  }, [user?.id, cycles]);

  const matrixCycles = useMemo(() => (cycles.length > 0 ? cycles : cachedCycles), [cycles, cachedCycles]);

  return (
    <div
      className={cn(
        "fixed inset-0 min-h-screen bg-[#FDFDFD] flex items-center justify-center z-[100] transition-opacity duration-300",
        onFinish ? (fadeOut ? "opacity-0" : "opacity-100") : "opacity-100"
      )}
    >
      {!loading ? (
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-blue-200 to-pink-200 flex items-center justify-center shadow-xl shadow-pink-500/20 mb-6 relative animate-pulse-slow">
            <div className="absolute inset-0 bg-white/20 blur-md rounded-[24px]"></div>
            <InfinityIcon className="text-white relative z-10" size={40} strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 tracking-tight">
            10-Day Flow
          </h1>
          <p className="text-gray-400 mt-2 text-sm font-medium tracking-wide pb-8">GROWTH LOOP</p>
        </div>
      ) : (
        <div className="w-full max-w-md px-6 flex flex-col items-center">
          <h1 className="text-xl font-semibold text-gray-800 tracking-tight">10-Day Flow</h1>
          <p className="text-gray-400 mt-1 text-[11px] font-medium tracking-[0.2em]">GROWTH LOOP</p>

          <div className="w-full mt-5 flex justify-center">
            <CycleMatrixCore
              cycles={matrixCycles as any}
              currentCycle={currentCycle as any}
              showRowNumbers={false}
            />
          </div>

          <div className="flex items-center gap-2 mt-4">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9DC5EF] animate-bounce" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#C7B6A6] animate-bounce [animation-delay:120ms]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#D8AFAF] animate-bounce [animation-delay:240ms]" />
          </div>
          <p className="text-xs tracking-wide text-gray-500 mt-2">{tr('loading_workspace', 'Loading your workspace...')}</p>
        </div>
      )}
    </div>
  );
}
