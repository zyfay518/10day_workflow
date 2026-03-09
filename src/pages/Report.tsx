import { useState, useMemo, useEffect } from "react";
import {
  Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  LineChart, Line, CartesianGrid, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { X, TrendingUp, Target, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { useCycles } from "../hooks/useCycles";
import { useDimensions } from "../hooks/useDimensions";
import { useGoalEvaluations } from "../hooks/useGoalEvaluations";
import { useReports } from "../hooks/useReports";
import { supabase } from "../lib/supabase";
import { useLocale } from "../hooks/useLocale";

export default function Report() {
  const { user } = useAuth();
  const { tr, trDimension } = useLocale();
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
  const [savedProfile, setSavedProfile] = useState<any | null>(null);
  const [profileTableAvailable, setProfileTableAvailable] = useState(true);

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
        subject: trDimension(dim.dimension_name),
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

        dataPoint[trDimension(dim.dimension_name)] = Math.round(avgScore);

        if (avgScore > 0) {
          cycleTotal += avgScore;
          dimCount++;
        }
      });
      dataPoint[tr('report_average', 'Average')] = dimCount > 0 ? Math.round(cycleTotal / dimCount) : 0;
      return dataPoint;
    });
  }, [completedCycles, dimensions, evaluations]);

  const selectedCycle = completedCycles.find(c => c.id === selectedCycleId);

  const generatedProfile = useMemo(() => {
    if (!selectedCycle) return null;

    const currentIndex = completedCycles.findIndex(c => c.id === selectedCycle.id);
    const prevCycle = currentIndex > 0 ? completedCycles[currentIndex - 1] : null;

    const currentAvg = currentCycleAvgScore;

    const prevEvals = prevCycle
      ? evaluations.filter(e => e.cycle_id === prevCycle.id && e.final_score !== null)
      : [];
    const prevAvg = prevEvals.length > 0
      ? Math.round(prevEvals.reduce((sum, e) => sum + (e.final_score || 0), 0) / prevEvals.length)
      : 0;

    const delta = prevCycle ? currentAvg - prevAvg : 0;

    const stage = currentAvg >= 80
      ? tr('report_stage_system_builder', 'System Builder')
      : currentAvg >= 65
        ? tr('report_stage_reflective_executor', 'Reflective Executor')
        : tr('report_stage_foundation_explorer', 'Foundation Explorer');

    const metrics = [
      { label: tr('report_metric_goal_clarity', 'Goal Clarity'), value: Math.min(100, Math.max(0, Math.round(currentAvg * 0.92 + 6))) },
      { label: tr('report_metric_execution_stability', 'Execution Stability'), value: Math.min(100, Math.max(0, Math.round(currentAvg * 0.88 + 8))) },
      { label: tr('report_metric_review_depth', 'Review Depth'), value: Math.min(100, Math.max(0, Math.round(currentAvg * 0.9 + 5))) },
      { label: tr('report_metric_cross_domain_transfer', 'Cross-domain Transfer'), value: Math.min(100, Math.max(0, Math.round(currentAvg * 0.84 + 10))) },
      { label: tr('report_metric_long_term_consistency', 'Long-term Consistency'), value: Math.min(100, Math.max(0, Math.round(currentAvg * 0.86 + 9))) },
    ];

    const evidence = reports
      .map(r => r.content?.replace(/<br\s*\/?>/g, '\n').replace(/\n+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 2) as string[];

    const suggestions = [
      delta < 0
        ? '本周期有回落，建议把目标数量收敛到 2-3 个，先恢复稳定执行节奏。'
        : '保持当前节奏，把有效行动固化成固定时间块，减少临时决策损耗。',
      '每个维度每周至少保留 1 条“可复盘证据”（结果+原因+下一步），提升复盘质量。',
      '下周期优先选择 1 个薄弱维度做集中突破，避免平均用力。',
    ];

    return {
      stage,
      currentAvg,
      delta,
      metrics,
      evidence,
      suggestions,
    };
  }, [selectedCycle, completedCycles, currentCycleAvgScore, evaluations, reports]);

  const cognitiveProfile = useMemo(() => {
    if (savedProfile) {
      return {
        stage: savedProfile.stage,
        currentAvg: savedProfile.average_score,
        delta: savedProfile.delta_score,
        metrics: savedProfile.metrics || [],
        evidence: savedProfile.evidence || [],
        suggestions: savedProfile.suggestions || [],
      };
    }

    return generatedProfile;
  }, [savedProfile, generatedProfile]);

  useEffect(() => {
    async function loadSavedProfile() {
      if (!user?.id || !selectedCycleId || !profileTableAvailable) {
        setSavedProfile(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('cognitive_profiles' as any)
          .select('*')
          .eq('user_id', user.id)
          .eq('cycle_id', selectedCycleId)
          .maybeSingle();

        if (error) throw error;
        setSavedProfile(data || null);
      } catch (e: any) {
        if (String(e?.message || '').includes('cognitive_profiles')) {
          setProfileTableAvailable(false);
        }
        setSavedProfile(null);
      }
    }

    loadSavedProfile();
  }, [user?.id, selectedCycleId, profileTableAvailable]);

  useEffect(() => {
    async function persistProfile() {
      if (!user?.id || !selectedCycleId || !generatedProfile || !profileTableAvailable) return;

      // If already exists, don't overwrite manually tuned content
      if (savedProfile) return;

      try {
        const payload = {
          user_id: user.id,
          cycle_id: selectedCycleId,
          stage: generatedProfile.stage,
          average_score: generatedProfile.currentAvg,
          delta_score: generatedProfile.delta,
          metrics: generatedProfile.metrics,
          evidence: generatedProfile.evidence,
          suggestions: generatedProfile.suggestions,
        };

        const { data, error } = await supabase
          .from('cognitive_profiles' as any)
          .insert(payload)
          .select('*')
          .single();

        if (error) throw error;
        setSavedProfile(data);
      } catch (e: any) {
        if (String(e?.message || '').includes('cognitive_profiles')) {
          setProfileTableAvailable(false);
        }
      }
    }

    persistProfile();
  }, [user?.id, selectedCycleId, generatedProfile, savedProfile, profileTableAvailable]);

  const localizeMetricLabel = (label: string) => {
    const map: Record<string, string> = {
      'Goal Clarity': tr('report_metric_goal_clarity', 'Goal Clarity'),
      'Execution Stability': tr('report_metric_execution_stability', 'Execution Stability'),
      'Review Depth': tr('report_metric_review_depth', 'Review Depth'),
      'Cross-domain Transfer': tr('report_metric_cross_domain_transfer', 'Cross-domain Transfer'),
      'Long-term Consistency': tr('report_metric_long_term_consistency', 'Long-term Consistency'),
    };
    return map[label] || label;
  };

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
        {completedCycles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 mt-12 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 border border-blue-100">
              <Brain size={32} className="text-[#9DC5EF]" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Awaiting Data</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your Cognitive Report relies on multi-dimensional AI evaluations generated at the end of each period.<br /><br />
              Keep writing daily records and completing your goals! Your radar chart and growth trends will appear here after you finish your first Period.
            </p>
          </div>
        ) : (
          <>
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
                    <Line type="monotone" dataKey={tr('report_average', 'Average')} stroke="#FFB3C1" strokeWidth={3} dot={{ r: 4, fill: "#FFB3C1", strokeWidth: 0 }} />
                    {dimensions.map(dim => (
                      <Line key={dim.id} type="monotone" dataKey={trDimension(dim.dimension_name)} stroke={dim.color_code} strokeWidth={1.5} dot={false} opacity={0.6} />
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

                {cognitiveProfile && (
                  <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="flex items-start justify-between mb-4">
                      <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <Brain size={22} className="text-[#9DC5EF]" />
                        Cognitive Profile
                      </h2>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400">Current Stage</p>
                        <p className="text-sm font-bold bg-gradient-to-r from-[#7AA5D8] to-[#E89CAB] bg-clip-text text-transparent">{cognitiveProfile.stage}</p>
                      </div>
                    </div>

                    <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-pink-50 border border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Period Score</p>
                        <p className="text-xl font-black text-gray-800">{cognitiveProfile.currentAvg}</p>
                      </div>
                      <div className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", cognitiveProfile.delta >= 0 ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600")}>
                        {cognitiveProfile.delta >= 0 ? `+${cognitiveProfile.delta}` : `${cognitiveProfile.delta}` } {tr('report_vs_prev', 'vs prev')}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {cognitiveProfile.metrics.map((m) => (
                        <div key={m.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">{localizeMetricLabel(m.label)}</span>
                            <span className="font-semibold text-gray-700">{m.value}</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] rounded-full" style={{ width: `${m.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {cognitiveProfile.evidence.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-gray-500 mb-2">Evidence from this period</p>
                        <div className="space-y-2">
                          {cognitiveProfile.evidence.map((item, idx) => (
                            <div key={idx} className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 leading-relaxed">
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">Next-period strategy</p>
                      <ul className="space-y-1.5">
                        {cognitiveProfile.suggestions.map((s, idx) => (
                          <li key={idx} className="text-xs text-gray-700 leading-relaxed flex gap-2">
                            <span className="text-[#9DC5EF] font-bold">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}

              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
