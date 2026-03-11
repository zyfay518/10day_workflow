import React from 'react';
import { Database } from '../types/database';
import { useLocale } from '../hooks/useLocale';
import CycleMatrixCore from './CycleMatrixCore';

type Cycle = Database['public']['Tables']['cycles']['Row'];

interface CycleMatrixProps {
  cycles: Cycle[];
  currentCycle: Cycle | null;
  selectedYear?: number;
  onCycleClick?: (cycleId: number) => void;
}

export default function CycleMatrix({ cycles, currentCycle, selectedYear, onCycleClick }: CycleMatrixProps) {
  const { tr } = useLocale();

  return (
    <>
      <CycleMatrixCore
        cycles={cycles}
        currentCycle={currentCycle}
        selectedYear={selectedYear}
        onCycleClick={onCycleClick}
      />

      <div className="w-full mt-3 px-2">
        <div className="rounded-full h-2.5 bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1]" />
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>0%</span>
          <span>{tr('home_completion_rate', 'Completion Rate')}</span>
          <span>100%</span>
        </div>
        <div className="flex items-center justify-center gap-1 mt-1 text-[10px] text-gray-500">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#E8C996]" />
          <span>{tr('home_yellow_current', 'Yellow = Current Period')}</span>
        </div>
      </div>
    </>
  );
}
