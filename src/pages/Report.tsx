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
  const { cycles, loading: cyclesLoading } = useCycles(user?.id);
  const { dimensions } = useDimensions(user?.id);
  const { evaluations, loading: evalLoading, loadAllEvaluations } = useGoalEvaluations(user?.id, undefined);

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
  const [profileData, setProfileData] = useState<{
    records: { date: string; len: number }[];
    knowledge: { date: string; len: number }[];
    evals: { date: string; score: number }[];
    goals: { date: string }[];
  } | null>(null);

  useEffect(() => {
    async function loadProfileData() {
      if (!user?.id) {
        setProfileData(null);
        return;
      }

      try {
        const [recordsRes, knowledgeRes, evalRes, cycleGoalsRes] = await Promise.all([
          supabase.from('records' as any).select('record_date, content').eq('user_id', user.id),
          supabase.from('knowledge_base' as any).select('record_date, content').eq('user_id', user.id),
          supabase.from('goal_evaluations' as any).select('evaluated_at, final_score').eq('user_id', user.id),
          supabase.from('cycle_goals' as any).select('created_at').eq('user_id', user.id),
        ]);

        const records = ((recordsRes.data || []) as any[]).map(r => ({ date: String(r.record_date || '').slice(0, 10), len: String(r.content || '').length }));
        const knowledge = ((knowledgeRes.data || []) as any[]).map(r => ({ date: String(r.record_date || '').slice(0, 10), len: String(r.content || '').length }));
        const evals = ((evalRes.data || []) as any[])
          .filter(r => r.final_score !== null && r.final_score !== undefined)
          .map(r => ({ date: String(r.evaluated_at || '').slice(0, 10), score: Number(r.final_score) }));
        const goals = [
          ...((cycleGoalsRes.data || []) as any[]).map(g => ({ date: String(g.created_at || '').slice(0, 10) })),
        ];

        setProfileData({ records, knowledge, evals, goals });
      } catch (e) {
        console.error('loadProfileData failed', e);
        setProfileData(null);
      }
    }

    loadProfileData();
  }, [user?.id]);

  const hasProfileSourceData = useMemo(() => {
    if (!profileData) return false;
    return (profileData.records.length + profileData.knowledge.length + profileData.evals.length + profileData.goals.length) > 0;
  }, [profileData]);

  const generatedProfile = useMemo(() => {
    if (!profileData || !hasProfileSourceData) return null;

    const today = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const daysAgo = (n: number) => new Date(today.getTime() - n * dayMs);
    const inRange = (dateStr: string, start: Date, end: Date) => {
      const d = new Date(dateStr + 'T00:00:00');
      return d >= start && d <= end;
    };

    const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const rec90 = profileData.records.filter(r => inRange(r.date, daysAgo(90), today));
    const kb90 = profileData.knowledge.filter(r => inRange(r.date, daysAgo(90), today));
    const eval90 = profileData.evals.filter(r => inRange(r.date, daysAgo(90), today));
    const goals90 = profileData.goals.filter(r => inRange(r.date, daysAgo(90), today));

    const knowledgeScore = clamp(kb90.length * 3 + avg(kb90.map(k => Math.min(100, k.len / 8))));
    const goalEvalAvg = avg(eval90.map(e => e.score));
    const goalCompletionProxy = goals90.length > 0 ? Math.min(100, (eval90.length / goals90.length) * 100) : 0;
    const goalScore = clamp(goalEvalAvg * 0.7 + goalCompletionProxy * 0.3);

    const recFreqScore = clamp(Math.min(100, rec90.length * 2.5));
    const recDepthScore = clamp(avg(rec90.map(r => Math.min(100, r.len / 6))));
    const recordScore = clamp(recFreqScore * 0.6 + recDepthScore * 0.4);

    const currentAvg = clamp(knowledgeScore * 0.45 + goalScore * 0.3 + recordScore * 0.25);

    const nowStart = daysAgo(30);
    const prevStart = daysAgo(60);
    const prevEnd = daysAgo(31);

    const windowScore = (start: Date, end: Date) => {
      const r = profileData.records.filter(x => inRange(x.date, start, end));
      const k = profileData.knowledge.filter(x => inRange(x.date, start, end));
      const e = profileData.evals.filter(x => inRange(x.date, start, end));
      const g = profileData.goals.filter(x => inRange(x.date, start, end));

      const ks = clamp(k.length * 3 + avg(k.map(x => Math.min(100, x.len / 8))));
      const ge = avg(e.map(x => x.score));
      const gc = g.length > 0 ? Math.min(100, (e.length / g.length) * 100) : 0;
      const gs = clamp(ge * 0.7 + gc * 0.3);
      const rs = clamp(Math.min(100, r.length * 2.5) * 0.6 + avg(r.map(x => Math.min(100, x.len / 6))) * 0.4);
      return clamp(ks * 0.45 + gs * 0.3 + rs * 0.25);
    };

    const current30 = windowScore(nowStart, today);
    const prev30 = windowScore(prevStart, prevEnd);
    const delta = clamp(current30) - clamp(prev30);

    const stage = currentAvg >= 80
      ? tr('report_stage_system_builder', 'System Builder')
      : currentAvg >= 65
        ? tr('report_stage_reflective_executor', 'Reflective Executor')
        : tr('report_stage_foundation_explorer', 'Foundation Explorer');

    const metrics = [
      { label: tr('report_metric_goal_clarity', 'Goal Clarity'), value: clamp(goalScore * 0.95 + 3) },
      { label: tr('report_metric_execution_stability', 'Execution Stability'), value: clamp(recordScore * 0.9 + 5) },
      { label: tr('report_metric_review_depth', 'Review Depth'), value: clamp(knowledgeScore * 0.92 + 4) },
      { label: tr('report_metric_cross_domain_transfer', 'Cross-domain Transfer'), value: clamp((knowledgeScore * 0.5 + recordScore * 0.5) * 0.88 + 6) },
      { label: tr('report_metric_long_term_consistency', 'Long-term Consistency'), value: clamp((current30 * 0.7 + prev30 * 0.3)) },
    ];

    const evidence = [
      tr('report_evidence_knowledge_weighted', `Knowledge-base entries (90d): ${kb90.length}`),
      tr('report_evidence_goal_eval_weighted', `Goal evaluations (90d): ${eval90.length}`),
    ];

    const suggestions = [
      delta < 0
        ? tr('report_suggestion_recover', 'There is a pullback this cycle. Narrow goals to 2-3 first and restore execution stability.')
        : tr('report_suggestion_keep', 'Keep the current pace and solidify effective actions into fixed time blocks to reduce ad-hoc decision cost.'),
      tr('report_suggestion_evidence', 'Keep at least 1 reviewable evidence item per dimension each week (result + cause + next step) to improve review quality.'),
      tr('report_suggestion_focus', 'Prioritize one weak dimension for focused breakthrough next cycle instead of spreading effort evenly.'),
    ];

    return { stage, currentAvg, delta, metrics, evidence, suggestions };
  }, [profileData, hasProfileSourceData, tr]);

  const cognitiveProfile = useMemo(() => {
    if (!hasProfileSourceData) return null;

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
  }, [savedProfile, generatedProfile, hasProfileSourceData]);

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
      if (!user?.id || !selectedCycleId || !generatedProfile || !profileTableAvailable || !hasProfileSourceData) return;

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
  }, [user?.id, selectedCycleId, generatedProfile, savedProfile, profileTableAvailable, hasProfileSourceData]);

  const isDataLoading = cyclesLoading || evalLoading;

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
          <h1 className="text-[20px] font-bold text-gray-800">{tr('report_title', 'Cognitive Report')}</h1>
          <p className="text-xs text-gray-500">{tr('report_subtitle', 'Multidimensional analysis')}</p>
        </div>
        <Link to="/" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">
          <X size={18} />
        </Link>
      </header>

      <main className="flex-1 px-4 space-y-4 pt-2 overflow-y-auto">
        {isDataLoading ? (
          <>
            <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-5 w-32 bg-gray-100 rounded mb-4" />
              <div className="h-48 w-full bg-gray-50 rounded-xl" />
            </section>
            <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-5 w-36 bg-gray-100 rounded mb-4" />
              <div className="h-56 w-full bg-gray-50 rounded-xl" />
            </section>
            <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-5 w-40 bg-gray-100 rounded mb-4" />
              <div className="space-y-3">
                <div className="h-3 w-full bg-gray-100 rounded" />
                <div className="h-3 w-5/6 bg-gray-100 rounded" />
                <div className="h-3 w-4/6 bg-gray-100 rounded" />
              </div>
            </section>
          </>
        ) : completedCycles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 mt-12 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 border border-blue-100">
              <Brain size={32} className="text-[#9DC5EF]" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">{tr('report_awaiting_data', 'Awaiting Data')}</h2>
            <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">
              {tr('report_awaiting_desc', 'Your Cognitive Report relies on multi-dimensional AI evaluations generated at the end of each period.\n\nKeep writing daily records and completing your goals! Your radar chart and growth trends will appear here after you finish your first Period.')}
            </p>
          </div>
        ) : (
          <>
            {/* Overall Trend Line Chart */}
            <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="text-[#9DC5EF]" size={24} />
                <h2 className="font-bold text-gray-800">{tr('report_growth_trend', 'Growth Trend')}</h2>
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
                  <h2 className="font-bold text-gray-800 text-lg">{tr('report_stage_insights', 'Stage Insights')}</h2>
                  <select
                    value={selectedCycleId || ""}
                    onChange={(e) => setSelectedCycleId(Number(e.target.value))}
                    className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg block px-3 py-1.5 outline-none"
                  >
                    {completedCycles.map(cycle => (
                      <option key={cycle.id} value={cycle.id}>{tr('home_period', 'Period')} {cycle.cycle_number}</option>
                    ))}
                  </select>
                </div>

                <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="text-[#FFB3C1]" size={24} />
                      <h2 className="font-bold text-gray-800">{tr('report_period_snapshot', 'Period Snapshot')}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400">{tr('report_avg_score', 'Avg. Score')}</p>
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

                {!hasProfileSourceData && (
                  <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                      <Brain size={22} className="text-[#9DC5EF]" />
                      {tr('report_cognitive_profile', 'Cognitive Profile')}
                    </h2>
                    <p className="text-sm text-gray-500">{tr('report_cognitive_no_data', 'No sufficient data yet. Add records/goals in this period to generate your cognitive profile.')}</p>
                  </section>
                )}

                {cognitiveProfile && (
                  <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="flex items-start justify-between mb-4">
                      <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <Brain size={22} className="text-[#9DC5EF]" />
                        {tr('report_cognitive_profile', 'Cognitive Profile')}
                      </h2>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400">{tr('report_current_stage', 'Current Stage')}</p>
                        <p className="text-sm font-bold bg-gradient-to-r from-[#7AA5D8] to-[#E89CAB] bg-clip-text text-transparent">{cognitiveProfile.stage}</p>
                      </div>
                    </div>

                    <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-pink-50 border border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">{tr('report_period_score', 'Period Score')}</p>
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
                        <p className="text-xs font-bold text-gray-500 mb-2">{tr('report_evidence', 'Evidence from this period')}</p>
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
                      <p className="text-xs font-bold text-gray-500 mb-2">{tr('report_strategy', 'Next-period strategy')}</p>
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
