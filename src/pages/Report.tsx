import { useState, useMemo, useEffect } from "react";
import {
  Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  LineChart, Line, CartesianGrid, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth.local";
import { useCycles } from "../hooks/useCycles.local";
import { useDimensions } from "../hooks/useDimensions.local";
import { useGoalEvaluations } from "../hooks/useGoalEvaluations.local";
import { useReports } from "../hooks/useReports.local";
import { useGrowthTags } from "../hooks/useGrowthTags.local";

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
        ? dimEvals.reduce((sum, e) => sum + e.final_score, 0) / dimEvals.length
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
          ? dimEvals.reduce((sum, e) => sum + e.final_score, 0) / dimEvals.length
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
      {/* Status Bar */}
      <div className="flex justify-between items-center px-4 py-1 text-xs text-gray-600 bg-white border-b border-gray-100">
        <span>{new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">signal_cellular_alt</span>
          <span className="material-symbols-outlined text-[16px]">wifi</span>
          <span className="material-symbols-outlined text-[16px]">battery_full</span>
        </div>
      </div>

      <header className="px-4 py-3 bg-white flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div>
          <h1 className="text-[20px] font-bold text-gray-800">Cognitive Report</h1>
          <p className="text-xs text-gray-500">Multidimensional analysis</p>
        </div>
        <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">
          <span className="material-symbols-outlined text-[18px]">share</span>
        </button>
      </header>



      <main className="flex-1 px-4 space-y-4 pt-2">
        {/* Overall Trend Line Chart */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#9DC5EF]">trending_up</span>
            <h2 className="font-bold text-gray-800">Growth Trend</h2>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontSize: '12px' }}
                  labelStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey="Average" stroke="#FFB3C1" strokeWidth={3} dot={{ r: 4, fill: "#FFB3C1", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                {dimensions.map(dim => (
                  <Line
                    key={dim.id}
                    type="monotone"
                    dataKey={dim.dimension_name}
                    stroke={dim.color_code}
                    strokeWidth={1.5}
                    dot={false}
                    opacity={0.6}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {selectedCycle && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 text-lg">Stage Insights</h2>
              <select
                value={selectedCycleId || ""}
                onChange={(e) => setSelectedCycleId(Number(e.target.value))}
                className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-3 py-1.5 shadow-sm font-medium outline-none"
              >
                {completedCycles.map(cycle => (
                  <option key={cycle.id} value={cycle.id}>
                    Period {cycle.cycle_number}
                  </option>
                ))}
              </select>
            </div>

            {/* Stage Summary Radar Chart */}
            <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#FFB3C1]">radar</span>
                  <h2 className="font-bold text-gray-800">Period {selectedCycle.cycle_number} Snapshot</h2>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">Avg. Score</p>
                  <p className="text-2xl font-black text-gray-800">{currentCycleAvgScore}</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mb-2">{selectedCycle.start_date} ~ {selectedCycle.end_date}</p>

              <div className="h-56 w-full -mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#F3F4F6" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Tooltip />
                    <Radar name="Score" dataKey="A" stroke="#9DC5EF" fill="#9DC5EF" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Growth Tags */}
            {topTags.length > 0 && (
              <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-400">local_offer</span>
                    <h2 className="font-bold text-gray-800">High-Frequency Growth Tags</h2>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topTags.map((tag, idx) => {
                    const hue = (220 + idx * 25) % 360;
                    return (
                      <div
                        key={tag.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border shadow-sm transition-all hover:-translate-y-0.5"
                        style={{
                          backgroundColor: `hsl(${hue}, 80%, 96%)`,
                          borderColor: `hsl(${hue}, 70%, 90%)`,
                          color: `hsl(${hue}, 60%, 40%)`
                        }}
                      >
                        <span className="font-bold text-sm tracking-wide">{tag.tag_name}</span>
                        <span className="text-[10px] bg-white/60 px-1.5 py-0.5 rounded-full font-medium">
                          {tag.frequency}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* AI Insights by Dimension */}
            <section className="space-y-3">
              <h2 className="font-bold text-gray-800 flex items-center gap-2 px-1">
                <span className="material-symbols-outlined text-[#E8C996]">psychology</span>
                AI Cognitive Analysis
              </h2>

              {reports.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">hourglass_empty</span>
                  <p className="text-sm text-gray-500">No AI analysis generated for this period yet.</p>
                </div>
              ) : (
                reports.map((report) => {
                  const dim = dimensions.find(d => d.id === report.dimension_id);
                  return (
                    <div key={report.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        {dim && (
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[12px]"
                            style={{ backgroundColor: `${dim.color_code}20`, color: dim.color_code }}
                          >
                            {dim.icon_name}
                          </span>
                        )}
                        <span className="font-bold text-sm text-gray-800">
                          {dim ? dim.dimension_name : "Overall Summary"}
                        </span>
                      </div>
                      <div
                        className="prose prose-sm max-w-none text-gray-600 leading-relaxed text-[13px]"
                        dangerouslySetInnerHTML={{ __html: report.content.replace(/\n/g, '<br />') }}
                      />
                    </div>
                  );
                })
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
