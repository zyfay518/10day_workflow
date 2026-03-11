import React from 'react';
import { cn } from '../lib/utils';
import { Database } from '../types/database';
import { getCycleDisplayStatus, getLocalDateString } from '../lib/utils';

type Cycle = Database['public']['Tables']['cycles']['Row'];

interface CycleMatrixCoreProps {
  cycles: Cycle[];
  currentCycle: Cycle | null;
  selectedYear?: number;
  onCycleClick?: (cycleId: number) => void;
}

export default function CycleMatrixCore({ cycles, currentCycle, selectedYear, onCycleClick }: CycleMatrixCoreProps) {
  const filteredCycles = React.useMemo(() => {
    if (!selectedYear) return cycles;
    return cycles.filter(c => new Date(c.start_date).getFullYear() === selectedYear);
  }, [cycles, selectedYear]);

  const getDotStatus = (cycle: Cycle) => {
    if (currentCycle && cycle.id === currentCycle.id) return 'current' as const;
    const status = getCycleDisplayStatus(cycle, getLocalDateString());
    if (status === 'completed') return 'complete' as const;
    if (status === 'ongoing') return 'current' as const;
    return 'future' as const;
  };

  const totalDots = 37;
  const dots = Array.from({ length: totalDots }, (_, i) => {
    const cycle = filteredCycles[i];
    if (!cycle) return { status: 'future' as const, completion: 0, cycleId: null, cycleNumber: i + 1 };
    const displayStatus = getDotStatus(cycle);
    return { status: displayStatus, completion: cycle.completion_rate, cycleId: cycle.id, cycleNumber: cycle.cycle_number };
  });

  const getDotColor = (completion: number): string => {
    if (completion === 0) return '#9DC5EF';
    const blueRGB = { r: 157, g: 197, b: 239 };
    const pinkRGB = { r: 255, g: 179, b: 193 };
    const ratio = completion / 100;
    const r = Math.round(blueRGB.r + (pinkRGB.r - blueRGB.r) * ratio);
    const g = Math.round(blueRGB.g + (pinkRGB.g - blueRGB.g) * ratio);
    const b = Math.round(blueRGB.b + (pinkRGB.b - blueRGB.b) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const dotRows = [];
  for (let i = 0; i < dots.length; i += 6) dotRows.push(dots.slice(i, i + 6));

  return (
    <div className="flex gap-2">
      <div className="flex flex-col gap-2 pt-1">
        {dotRows.map((_, rowIndex) => (
          <div key={rowIndex} className="w-6 h-9 flex items-center justify-center text-xs text-gray-400 font-medium">
            {rowIndex + 1}
          </div>
        ))}
      </div>

      <div>
        {dotRows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-6 gap-2 mb-2">
            {row.map((dot, dotIndex) => (
              <div
                key={`${rowIndex}-${dotIndex}`}
                className={cn(
                  'w-9 h-9 rounded-full transition-all duration-300',
                  dot.status === 'complete' && 'hover:opacity-90 cursor-pointer shadow-sm',
                  dot.status === 'current' && 'ring-4 ring-[#E8C996]/30 animate-pulse cursor-pointer relative z-10',
                  dot.status === 'future' && 'bg-white border border-gray-200',
                  dot.cycleId && (dot.status === 'complete' || dot.status === 'current') && 'cursor-pointer'
                )}
                style={
                  dot.status === 'complete'
                    ? { background: `linear-gradient(135deg, white 10%, ${getDotColor(dot.completion)} 100%)` }
                    : dot.status === 'current'
                      ? { background: 'linear-gradient(135deg, white 10%, #E8C996 100%)' }
                      : {}
                }
                onClick={() => dot.cycleId && onCycleClick?.(dot.cycleId)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
