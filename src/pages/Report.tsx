import { useState, useMemo, useEffect } from "react";
import {
  Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  LineChart, Line, CartesianGrid, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { X, TrendingUp, Target, Tag, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { useCycles } from "../hooks/useCycles";
import { useDimensions } from "../hooks/useDimensions";
import { useGoalEvaluations } from "../hooks/useGoalEvaluations";
import { useReports } from "../hooks/useReports";
import { useGrowthTags } from "../hooks/useGrowthTags";

export default function Report() {
  const { user } = useAuth();
  const { cycles } = useCycles(user?.id);
  const { dimensions } = useDimensions(user?.id);
  const { evaluations, loadAllEvaluations } = useGoalEvaluations(user?.id, undefined);

  const completedCycles = useMemo(() => cycles.filter(c => c.status === 'completed').sort((a, b) => a.cycle_number - b.cycle_number), [cycles]);

  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);

  useEffect(() => {
    loadAllEvaluations();
  }, [loadAllEvaluations]);

  useEffect(() => {
    if (completedCycles.length > 0 && selectedCycleId === null) {
      setSelectedCycleId(completedCycles[completedCycles.length - 1].id);
    }
  }, [completedCycles, selectedCycleId]);

  const { reports } = useReports(user?.id, selectedCycleId ?? undefined);
  const { tags } = useGrowthTags(user?.id);

  const topTags = useMemo(() => {
    return [...tags].sort((a, b) => b.frequency - a.frequency).slice(0, 15);
  }, [tags]);

  // --- Process Data for Charts ---

  // 1. Radar Chart Data (Current Selected Cycle)
  const radarData = useMemo(() => {
    if (!selectedCycleId || dimensions.length === 0) return [];

    return dimensions.map(dim => {
      const dimEvals = evaluations.filter(e => e.cycle_id === selectedCycleId && e.dimension_id === dim.id);
      const avgScore = dimEvals.length > 0
        ? dimEvals.reduce((sum, e) => sum + e.final_score!, 0) / dimEvals.length
        : 0;

      return {
        subject: dim.dimension_name,
        A: Math.round(avgScore),
        fullMark: 100,
        color: dim.color_code
      };
    });
  }, [selectedCycleId, dimensions, evaluations]);

  const currentCycleAvgScore = useMemo(() => {
    if (radarData.length === 0) return 0;
    const total = radarData.reduce((sum, item) => sum + item.A, 0);
    return Math.round(total / radarData.length);
  }, [radarData]);

  // 2. Line Chart Data (Trend over completed cycles)
  const trendData = useMemo(() => {
    if (dimensions.length === 0 || completedCycles.length === 0) return [];

    return completedCycles.map(cycle => {
      const dataPoint: any = { name: `P${cycle.cycle_number}` };

      let cycleTotal = 0;
      let dimCount = 0;

      dimensions.forEach(dim => {
        const dimEvals = evaluations.filter(e => e.cycle_id === cycle.id && e.dimension_id === dim.id);
        const avgScore = dimEvals.length > 0
          ? dimEvals.reduce((sum, e) => sum + e.final_score!, 0) / dimEvals.length
          : 0;

        dataPoint[dim.dimension_name] = Math.round(avgScore);

        if (avgScore > 0) {
          cycleTotal += avgScore;
          dimCount++;
        }
      });
      dataPoint.Average = dimCount > 0 ? Math.round(cycleTotal / dimCount) : 0;
      return dataPoint;
    });
  }, [completedCycles, dimensions, evaluations]);

  const selectedCycle = completedCycles.find(c => c.id === selectedCycleId);

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB] relative pb-28">
      {/* Header */}
      <header className="px-4 py-3 bg-white flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div>
          <h1 className="text-[20px] font-bold text-gray-800">Cognitive Report</h1>
          <p className="text-xs text-gray-500">Multidimensional analysis</p>
        </div>
        <Link to="/" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">
          <X size={18} />
        </Link>
      </header>

      <main className="flex-1 px-4 space-y-4 pt-2 overflow-y-auto">
        {/* Overall Trend Line Chart */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-[#9DC5EF]" size={24} />
            <h2 className="font-bold text-gray-800">Growth Trend</h2>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey="Average" stroke="#FFB3C1" strokeWidth={3} dot={{ r: 4, fill: "#FFB3C1", strokeWidth: 0 }} />
                {dimensions.map(dim => (
                  <Line key={dim.id} type="monotone" dataKey={dim.dimension_name} stroke={dim.color_code} strokeWidth={1.5} dot={false} opacity={0.6} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {selectedCycle && (
          <>
            <div className="flex items-center justify-between mt-6 mb-2">
              <h2 className="font-bold text-gray-800 text-lg">Stage Insights</h2>
              <select
                value={selectedCycleId || ""}
                onChange={(e) => setSelectedCycleId(Number(e.target.value))}
                className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg block px-3 py-1.5 outline-none"
              >
                {completedCycles.map(cycle => (
                  <option key={cycle.id} value={cycle.id}>Period {cycle.cycle_number}</option>
                ))}
              </select>
            </div>

            <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <Target className="text-[#FFB3C1]" size={24} />
                  <h2 className="font-bold text-gray-800">Period Snapshot</h2>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">Avg. Score</p>
                  <p className="text-2xl font-black text-gray-800">{currentCycleAvgScore}</p>
                </div>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#F3F4F6" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Tooltip />
                    <Radar name="Score" dataKey="A" stroke="#9DC5EF" fill="#9DC5EF" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {topTags.length > 0 && (
              <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Tag size={24} className="text-indigo-400" />
                  Growth Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {topTags.map((tag) => (
                    <div key={tag.id} className="px-3 py-1.5 rounded-lg border bg-blue-50 border-blue-100 text-blue-600 text-sm">
                      {tag.tag_name} <span className="text-[10px] opacity-70 ml-1">{tag.frequency}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3 pb-8">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Brain size={24} className="text-[#E8C996]" />
                AI Analysis
              </h2>
              {reports.map((report) => {
                const dim = dimensions.find(d => d.id === report.dimension_id);
                return (
                  <div key={report.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <p className="font-bold text-sm text-gray-800 mb-2">{dim ? dim.dimension_name : "Overall Summary"}</p>
                    <div className="text-sm text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: report.content.replace(/\n/g, '<br />') }} />
                  </div>
                );
              })}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
