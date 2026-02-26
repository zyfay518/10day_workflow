import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, Plus, Edit2, Trash2, Bot, User } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { useCycles } from "../hooks/useCycles";
import { useDimensions } from "../hooks/useDimensions";
import { useCycleGoals, useDailyGoals } from "../hooks/useGoals";
import { useGoalEvaluations } from "../hooks/useGoalEvaluations";
import { Database } from "../types/database";

type CycleGoal = Database['public']['Tables']['cycle_goals']['Row'];
type DailyGoal = Database['public']['Tables']['daily_goals']['Row'];
type Cycle = Database['public']['Tables']['cycles']['Row'];

type GoalFormData = {
  dimension_id: number;
  content: string;
  evaluation_criteria: string;
  target_type: 'quantitative' | 'qualitative';
  target_value: number | null;
  target_unit: string | null;
};

export default function Goals() {
  const { user } = useAuth();
  const { cycles } = useCycles(user?.id);
  const { dimensions } = useDimensions(user?.id);

  const [mainTab, setMainTab] = useState<'cycle' | 'daily'>('cycle');
  const [cycleStatusTab, setCycleStatusTab] = useState<'completed' | 'ongoing' | 'not_started'>('ongoing');
  const [expandedCycleId, setExpandedCycleId] = useState<number | null>(null);
  const [selectedCycleForDaily, setSelectedCycleForDaily] = useState<number | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<CycleGoal | DailyGoal | null>(null);
  const [evaluatingGoal, setEvaluatingGoal] = useState<{ goal: CycleGoal | DailyGoal, type: 'cycle' | 'daily' } | null>(null);
  const [userScore, setUserScore] = useState<number | ''>('');

  const [goalFormData, setGoalFormData] = useState<GoalFormData>({
    dimension_id: dimensions[0]?.id || 0,
    content: '',
    evaluation_criteria: '',
    target_type: 'qualitative',
    target_value: null,
    target_unit: null,
  });

  // Goal Evaluations for expanded cycle
  const {
    getEvaluationByGoal,
    addEvaluation,
    updateEvaluation
  } = useGoalEvaluations(user?.id, expandedCycleId || selectedCycleForDaily || undefined);

  // Get filtered cycles based on status tab
  const filteredCycles = cycles.filter(cycle => {
    if (cycleStatusTab === 'completed') return cycle.status === 'completed';
    if (cycleStatusTab === 'ongoing') return cycle.status === 'active';
    if (cycleStatusTab === 'not_started') return cycle.status === 'not_started';
    return false;
  });

  // Get the expanded cycle
  const expandedCycle = cycles.find(c => c.id === expandedCycleId);
  const { goals: cycleGoals, addGoal: addCycleGoal, updateGoal: updateCycleGoal, deleteGoal: deleteCycleGoal } = useCycleGoals(user?.id, expandedCycleId || undefined);

  // Get the selected cycle for daily goals
  const selectedCycle = cycles.find(c => c.id === selectedCycleForDaily);
  const { goals: dailyGoals, addGoal: addDailyGoal, updateGoal: updateDailyGoal, deleteGoal: deleteDailyGoal } = useDailyGoals(user?.id, expandedDate || '');

  // Generate 10 date cards for selected cycle
  const generateDateCards = (cycle: Cycle) => {
    const dates: string[] = [];
    const startDate = new Date(cycle.start_date);
    for (let i = 0; i < 10; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const dateCards = selectedCycle ? generateDateCards(selectedCycle) : [];

  // Group goals by dimension
  const cycleGoalsByDimension = dimensions.map(dim => ({
    ...dim,
    goals: cycleGoals.filter(g => g.dimension_id === dim.id),
  }));

  const dailyGoalsByDimension = dimensions.map(dim => ({
    ...dim,
    goals: dailyGoals.filter(g => g.dimension_id === dim.id),
  }));

  const toggleCycleExpansion = (cycleId: number) => {
    setExpandedCycleId(expandedCycleId === cycleId ? null : cycleId);
  };

  const toggleDateExpansion = (date: string) => {
    setExpandedDate(expandedDate === date ? null : date);
  };

  const openAddGoalDialog = (dimensionId?: number) => {
    setEditingGoal(null);
    setGoalFormData({
      dimension_id: dimensionId || dimensions[0]?.id || 0,
      content: '',
      evaluation_criteria: '',
      target_type: 'qualitative',
      target_value: null,
      target_unit: null,
    });
    setShowGoalDialog(true);
  };

  const openEditGoalDialog = (goal: CycleGoal | DailyGoal) => {
    setEditingGoal(goal);
    setGoalFormData({
      dimension_id: goal.dimension_id,
      content: goal.content,
      evaluation_criteria: goal.evaluation_criteria,
      target_type: goal.target_type,
      target_value: goal.target_value,
      target_unit: goal.target_unit,
    });
    setShowGoalDialog(true);
  };

  const handleSaveGoal = () => {
    if (!user) return;
    if (!goalFormData.content || !goalFormData.evaluation_criteria) {
      alert('Please fill in all required fields');
      return;
    }

    if (mainTab === 'cycle' && expandedCycleId) {
      if (editingGoal) {
        updateCycleGoal(editingGoal.id, goalFormData);
      } else {
        addCycleGoal({
          user_id: user.id,
          cycle_id: expandedCycleId,
          ...goalFormData,
        });
      }
    } else if (mainTab === 'daily' && selectedCycleForDaily && expandedDate) {
      if (editingGoal) {
        updateDailyGoal(editingGoal.id, goalFormData);
      } else {
        addDailyGoal({
          user_id: user.id,
          cycle_id: selectedCycleForDaily,
          goal_date: expandedDate,
          ...goalFormData,
        });
      }
    }

    setShowGoalDialog(false);
  };

  const handleDeleteGoal = (goalId: number) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    if (mainTab === 'cycle') {
      deleteCycleGoal(goalId);
    } else {
      deleteDailyGoal(goalId);
    }
  };

  const openEvaluateDialog = (goal: CycleGoal | DailyGoal, type: 'cycle' | 'daily') => {
    setEvaluatingGoal({ goal, type });
    const existingEval = getEvaluationByGoal(goal.id, type);
    if (existingEval && existingEval.user_score !== null) {
      setUserScore(existingEval.user_score);
    } else {
      setUserScore('');
    }
  };

  const handleSaveEvaluation = () => {
    if (!user || !evaluatingGoal) return;

    // Fallback AI score/text for mock if not existing
    const aiScore = 85;
    const aiAnalysis = "AI Analysis: Your efforts show steady progress in this area. Maintain the momentum but focus slightly more on qualitative improvements.";

    const parsedUserScore = userScore === '' ? null : Number(userScore);
    const finalScore = parsedUserScore !== null ? (aiScore + parsedUserScore) / 2 : aiScore;

    const existingEval = getEvaluationByGoal(evaluatingGoal.goal.id, evaluatingGoal.type);

    if (existingEval) {
      updateEvaluation(existingEval.id, {
        user_score: parsedUserScore,
        final_score: finalScore,
      });
    } else {
      addEvaluation({
        user_id: user.id,
        cycle_id: evaluatingGoal.goal.cycle_id,
        goal_id: evaluatingGoal.goal.id,
        goal_type: evaluatingGoal.type,
        dimension_id: evaluatingGoal.goal.dimension_id,
        ai_score: aiScore,
        ai_analysis: aiAnalysis,
        user_score: parsedUserScore,
        user_comment: null,
        final_score: finalScore,
        evaluated_at: new Date().toISOString()
      });
    }
    setEvaluatingGoal(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">

      {/* Header */}
      <header className="bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <Link to="/" className="p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-[18px] font-bold text-gray-800">Goals</h1>
          <div className="w-10"></div>
        </div>

        {/* Main Tab Switcher */}
        <div className="flex gap-2 bg-gray-100 rounded-[8px] p-1 mb-3">
          <button
            onClick={() => setMainTab('cycle')}
            className={cn(
              "flex-1 py-2 rounded-[6px] text-sm font-medium transition-all",
              mainTab === 'cycle'
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500"
            )}
          >
            Cycle Goals
          </button>
          <button
            onClick={() => setMainTab('daily')}
            className={cn(
              "flex-1 py-2 rounded-[6px] text-sm font-medium transition-all",
              mainTab === 'daily'
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500"
            )}
          >
            Daily Goals
          </button>
        </div>

        {/* Status Tab Switcher */}
        <div className="flex gap-2 bg-gray-100 rounded-[8px] p-1">
          <button
            onClick={() => setCycleStatusTab('completed')}
            className={cn(
              "flex-1 py-2 rounded-[6px] text-sm font-medium transition-all",
              cycleStatusTab === 'completed'
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500"
            )}
          >
            Completed
          </button>
          <button
            onClick={() => setCycleStatusTab('ongoing')}
            className={cn(
              "flex-1 py-2 rounded-[6px] text-sm font-medium transition-all",
              cycleStatusTab === 'ongoing'
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500"
            )}
          >
            Ongoing
          </button>
          <button
            onClick={() => setCycleStatusTab('not_started')}
            className={cn(
              "flex-1 py-2 rounded-[6px] text-sm font-medium transition-all",
              cycleStatusTab === 'not_started'
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500"
            )}
          >
            Not Started
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
        {mainTab === 'cycle' ? (
          <div className="space-y-3">
            {filteredCycles.map((cycle) => (
              <div key={cycle.id} className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.1)] overflow-hidden">
                {/* Cycle Header - Clickable */}
                <button
                  onClick={() => toggleCycleExpansion(cycle.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9DC5EF] to-[#FFB3C1] flex items-center justify-center text-white font-bold text-sm">
                      {cycle.cycle_number}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-gray-800">
                        Period {cycle.cycle_number}: {cycle.start_date} ~ {cycle.end_date}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Completion: {cycle.completion_rate}%
                      </div>
                    </div>
                  </div>
                  <ChevronDown size={24} className={cn(
                    "text-gray-400 transition-transform duration-300",
                    expandedCycleId === cycle.id && "rotate-180"
                  )} />
                </button>

                {/* Expanded Content - Goals by Dimension */}
                {expandedCycleId === cycle.id && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    {cycleGoalsByDimension.map((dim) => (
                      <div key={dim.id} className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            {dim.dimension_name}
                          </h3>
                          <button
                            onClick={() => openAddGoalDialog(dim.id)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Plus size={18} strokeWidth={2.5} />
                          </button>
                        </div>

                        {dim.goals.length > 0 ? (
                          <div className="space-y-2">
                            {dim.goals.map((goal) => (
                              <div
                                key={goal.id}
                                className="bg-gray-50 rounded-[8px] p-3"
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span
                                    className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                                    style={{ backgroundColor: dim.color_code }}
                                  >
                                    {goal.target_type === 'quantitative' ? 'Quantitative' : 'Qualitative'}
                                  </span>
                                  <div className="flex gap-1">
                                    {cycle.status !== 'not_started' && (
                                      <button
                                        onClick={() => openEvaluateDialog(goal, 'cycle')}
                                        className={cn(
                                          "px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors mr-1",
                                          (() => {
                                            const evaluation = getEvaluationByGoal(goal.id, 'cycle');
                                            if (!evaluation) return "bg-blue-50 text-blue-600 hover:bg-blue-100";
                                            if (evaluation.user_score === null || evaluation.user_score === undefined) return "bg-blue-50 text-blue-600 hover:bg-blue-100";
                                            return "bg-[#9DC5EF] text-white";
                                          })()
                                        )}
                                      >
                                        Evaluate
                                      </button>
                                    )}
                                    <button
                                      onClick={() => openEditGoalDialog(goal)}
                                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteGoal(goal.id)}
                                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-sm font-medium text-gray-800 mb-1">{goal.content}</p>
                                <p className="text-xs text-gray-500">Evaluation: {goal.evaluation_criteria}</p>
                                {goal.target_type === 'quantitative' && goal.target_value && (
                                  <div className="flex items-center gap-2 text-xs mt-1">
                                    <span className="text-gray-400">Target:</span>
                                    <span className="font-medium text-gray-700">
                                      {goal.target_value} {goal.target_unit}
                                    </span>
                                  </div>
                                )}
                                {(() => {
                                  const evaluation = getEvaluationByGoal(goal.id, 'cycle');
                                  if (!evaluation) return null;
                                  return (
                                    <div className="mt-3 p-2.5 bg-white rounded-lg border border-gray-100 flex items-center justify-between shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <div className="text-[11px] text-gray-500 flex flex-col gap-1">
                                          <div className="flex items-center gap-1.5"><Bot size={14} className="text-[#9DC5EF]" /> AI Score: <span className="font-bold text-gray-700">{evaluation.ai_score}</span></div>
                                          <div className="flex items-center gap-1.5"><User size={14} className="text-[#FFB3C1]" /> User Score: <span className="font-bold text-gray-700">{evaluation.user_score !== null ? evaluation.user_score : '-'}</span></div>
                                        </div>
                                      </div>
                                      <div className="text-right flex flex-col items-end">
                                        <div className="text-[10px] text-gray-400 font-bold tracking-wider">FINAL SCORE</div>
                                        <div className="text-2xl font-black text-gray-800 leading-none mt-1">{evaluation.final_score}</div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 text-center py-2">
                            No goals yet. Click + to add.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {filteredCycles.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm text-gray-400">No cycles in this status</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Cycle Selector */}
            {!selectedCycleForDaily ? (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                  Select a Cycle
                </h3>
                {filteredCycles.map((cycle) => (
                  <button
                    key={cycle.id}
                    onClick={() => setSelectedCycleForDaily(cycle.id)}
                    className="w-full bg-white rounded-[12px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.15)] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9DC5EF] to-[#FFB3C1] flex items-center justify-center text-white font-bold text-sm">
                        {cycle.cycle_number}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-gray-800">
                          Period {cycle.cycle_number}: {cycle.start_date} ~ {cycle.end_date}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {cycle.total_days} days
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <>
                {/* Back to Cycle Selection */}
                <button
                  onClick={() => {
                    setSelectedCycleForDaily(null);
                    setExpandedDate(null);
                  }}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors mb-3"
                >
                  <ArrowLeft size={18} />
                  <span>Back to Cycle Selection</span>
                </button>

                {/* Date Cards List */}
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 mb-3">
                  Period {selectedCycle?.cycle_number}: {selectedCycle?.start_date} ~ {selectedCycle?.end_date}
                </h3>

                {dateCards.map((date, index) => (
                  <div key={date} className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.1)] overflow-hidden">
                    {/* Date Header - Clickable */}
                    <button
                      onClick={() => toggleDateExpansion(date)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9DC5EF] to-[#FFB3C1] flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold text-gray-800">
                            Day {index + 1}: {date}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {dailyGoals.filter(g => g.goal_date === date).length} goals
                          </div>
                        </div>
                      </div>
                      <ChevronDown size={24} className={cn(
                        "text-gray-400 transition-transform duration-300",
                        expandedDate === date && "rotate-180"
                      )} />
                    </button>

                    {/* Expanded Content - Goals by Dimension */}
                    {expandedDate === date && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        {dailyGoalsByDimension.map((dim) => (
                          <div key={dim.id} className="mt-3">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                {dim.dimension_name}
                              </h3>
                              <button
                                onClick={() => openAddGoalDialog(dim.id)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                <Plus size={18} strokeWidth={2.5} />
                              </button>
                            </div>

                            {dim.goals.length > 0 ? (
                              <div className="space-y-2">
                                {dim.goals.map((goal) => (
                                  <div
                                    key={goal.id}
                                    className="bg-gray-50 rounded-[8px] p-3"
                                  >
                                    <div className="flex justify-between items-start mb-1">
                                      <span
                                        className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                                        style={{ backgroundColor: dim.color_code }}
                                      >
                                        {goal.target_type === 'quantitative' ? 'Quantitative' : 'Qualitative'}
                                      </span>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => openEvaluateDialog(goal, 'daily')}
                                          className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors mr-1",
                                            (() => {
                                              const evaluation = getEvaluationByGoal(goal.id, 'daily');
                                              if (!evaluation) return "bg-blue-50 text-blue-600 hover:bg-blue-100";
                                              if (evaluation.user_score === null || evaluation.user_score === undefined) return "bg-blue-50 text-blue-600 hover:bg-blue-100";
                                              return "bg-[#9DC5EF] text-white";
                                            })()
                                          )}
                                        >
                                          Evaluate
                                        </button>
                                        <button
                                          onClick={() => openEditGoalDialog(goal)}
                                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                        >
                                          <Edit2 size={16} />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteGoal(goal.id)}
                                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-sm font-medium text-gray-800 mb-1">{goal.content}</p>
                                    <p className="text-xs text-gray-500">Evaluation: {goal.evaluation_criteria}</p>
                                    {goal.target_type === 'quantitative' && goal.target_value && (
                                      <div className="flex items-center gap-2 text-xs mt-1">
                                        <span className="text-gray-400">Target:</span>
                                        <span className="font-medium text-gray-700">
                                          {goal.target_value} {goal.target_unit}
                                        </span>
                                      </div>
                                    )}
                                    {(() => {
                                      const evaluation = getEvaluationByGoal(goal.id, 'daily');
                                      if (!evaluation) return null;
                                      return (
                                        <div className="mt-3 p-2.5 bg-white rounded-lg border border-gray-100 flex items-center justify-between shadow-sm">
                                          <div className="flex items-center gap-3">
                                            <div className="text-[11px] text-gray-500 flex flex-col gap-1">
                                              <div className="flex items-center gap-1.5"><Bot size={14} className="text-[#9DC5EF]" /> AI Score: <span className="font-bold text-gray-700">{evaluation.ai_score}</span></div>
                                              <div className="flex items-center gap-1.5"><User size={14} className="text-[#FFB3C1]" /> User Score: <span className="font-bold text-gray-700">{evaluation.user_score !== null ? evaluation.user_score : '-'}</span></div>
                                            </div>
                                          </div>
                                          <div className="text-right flex flex-col items-end">
                                            <div className="text-[10px] text-gray-400 font-bold tracking-wider">FINAL SCORE</div>
                                            <div className="text-2xl font-black text-gray-800 leading-none mt-1">{evaluation.final_score}</div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 text-center py-2">
                                No goals yet. Click + to add.
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </main>

      {/* Goal Dialog */}
      {showGoalDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setShowGoalDialog(false)}
        >
          <div
            className="bg-white rounded-[12px] p-6 w-full max-w-md shadow-[0_4px_12px_rgba(0,0,0,0.15)] max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editingGoal ? 'Edit Goal' : 'Add Goal'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dimension</label>
                <select
                  value={goalFormData.dimension_id}
                  onChange={(e) => setGoalFormData({ ...goalFormData, dimension_id: parseInt(e.target.value) })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-[8px] py-2.5 px-3 text-sm"
                >
                  {dimensions.map((dim) => (
                    <option key={dim.id} value={dim.id}>
                      {dim.dimension_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Goal Content</label>
                <textarea
                  value={goalFormData.content}
                  onChange={(e) => setGoalFormData({ ...goalFormData, content: e.target.value })}
                  placeholder="e.g., Exercise for 30 minutes daily"
                  className="w-full bg-gray-50 border border-gray-200 rounded-[8px] py-2.5 px-3 text-sm min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Evaluation Criteria</label>
                <textarea
                  value={goalFormData.evaluation_criteria}
                  onChange={(e) => setGoalFormData({ ...goalFormData, evaluation_criteria: e.target.value })}
                  placeholder="e.g., Total exercise time"
                  className="w-full bg-gray-50 border border-gray-200 rounded-[8px] py-2.5 px-3 text-sm min-h-[60px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={goalFormData.target_type === 'qualitative'}
                      onChange={() => setGoalFormData({ ...goalFormData, target_type: 'qualitative', target_value: null, target_unit: null })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Qualitative</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={goalFormData.target_type === 'quantitative'}
                      onChange={() => setGoalFormData({ ...goalFormData, target_type: 'quantitative' })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Quantitative</span>
                  </label>
                </div>
              </div>

              {goalFormData.target_type === 'quantitative' && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Value</label>
                    <input
                      type="number"
                      value={goalFormData.target_value || ''}
                      onChange={(e) => setGoalFormData({ ...goalFormData, target_value: parseFloat(e.target.value) || null })}
                      placeholder="300"
                      className="w-full bg-gray-50 border border-gray-200 rounded-[8px] py-2.5 px-3 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                    <input
                      type="text"
                      value={goalFormData.target_unit || ''}
                      onChange={(e) => setGoalFormData({ ...goalFormData, target_unit: e.target.value })}
                      placeholder="minutes"
                      className="w-full bg-gray-50 border border-gray-200 rounded-[8px] py-2.5 px-3 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowGoalDialog(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-[8px] font-medium text-sm hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGoal}
                className="flex-1 bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white py-2.5 rounded-[8px] font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Dialog */}
      {evaluatingGoal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setEvaluatingGoal(null)}
        >
          <div
            className="bg-white rounded-[12px] p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-800 mb-4">Evaluate Goal</h2>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-800">{evaluatingGoal.goal.content}</p>
              <p className="text-xs text-gray-500 mt-1">Criteria: {evaluatingGoal.goal.evaluation_criteria}</p>
            </div>

            <div className="bg-gray-50 rounded-[12px] p-4 mb-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Bot size={18} className="text-[#9DC5EF]" />
                <span className="text-xs font-bold text-gray-700">AI Evaluation</span>
                <span className="ml-auto text-sm font-bold text-gray-800">
                  {getEvaluationByGoal(evaluatingGoal.goal.id, evaluatingGoal.type)?.ai_score || 85}/100
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed italic">
                {getEvaluationByGoal(evaluatingGoal.goal.id, evaluatingGoal.type)?.ai_analysis ||
                  "AI Analysis: Your efforts show steady progress in this area. Maintain the momentum but focus slightly more on qualitative improvements."}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Assessment (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={userScore}
                onChange={(e) => setUserScore(e.target.value)}
                placeholder="Enter your score..."
                className="w-full bg-white border border-gray-200 rounded-[8px] py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <p className="text-[10px] text-gray-400 mt-2">
                Final Score = (AI Score + Your Score) / 2. If left empty, AI score is used alone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEvaluatingGoal(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-[8px] font-medium text-sm hover:bg-gray-200"
              >
                Close
              </button>
              <button
                onClick={handleSaveEvaluation}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-[8px] font-medium text-sm hover:bg-gray-800"
              >
                Save Score
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
