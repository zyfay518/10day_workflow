import { Link, useNavigate } from "react-router-dom";
import React from "react";
import { Settings, ChevronRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useCycles } from "../hooks/useCycles";
import { useDimensions } from "../hooks/useDimensions";
import { useUserProfile } from "../hooks/useUserProfile";
import { useCycleGoals } from "../hooks/useGoals";
import { getLocalDateString } from "../lib/utils";
import { useLocale } from "../hooks/useLocale";
import { supabase } from "../lib/supabase";
import CycleMatrix from "../components/CycleMatrix";
import { useTodos } from "../hooks/useTodos";

export default function Home() {
  const { user } = useAuth();
  const { tr } = useLocale();
  const { profile } = useUserProfile(user?.id);
  const { cycles, currentCycle, loading: cyclesLoading, refreshCycles } = useCycles(user?.id);
  const { dimensions, loading: dimensionsLoading } = useDimensions(user?.id);
  const navigate = useNavigate();
  const readyEmittedRef = React.useRef(false);

  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  const [matrixExpanded, setMatrixExpanded] = React.useState(false);
  const autoSubmitOnceRef = React.useRef(false);

  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    cycles.forEach(cycle => years.add(new Date(cycle.start_date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [cycles]);

  const { goals: cycleGoals } = useCycleGoals(user?.id, currentCycle?.id);
  const today = getLocalDateString();

  const {
    todos,
    loading: todosLoading,
    addTodo,
    setStatus,
    deleteMany,
    submitTodosToRecords,
  } = useTodos(user?.id, currentCycle?.id);

  const [newTodo, setNewTodo] = React.useState('');
  const [selectedTodoIds, setSelectedTodoIds] = React.useState<number[]>([]);
  const [todoEditMode, setTodoEditMode] = React.useState(false);

  const nextStatus = (s: 'pending' | 'done' | 'dropped'): 'pending' | 'done' | 'dropped' => {
    if (s === 'pending') return 'done';
    if (s === 'done') return 'dropped';
    return 'pending';
  };

  const toggleSelect = (id: number) => {
    setSelectedTodoIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleTodoSubmit = async () => {
    const defaultDim = dimensions.find(d => d.dimension_name === 'Other' || d.dimension_name === '其他') || dimensions[0];
    if (!defaultDim || !currentCycle) return;

    const res = await submitTodosToRecords({
      dimensionId: defaultDim.id,
      currentCycleId: currentCycle.id,
      submitType: 'manual',
    });

    if (res.ok) {
      alert(tr('todo_submit_done', `Submitted ${res.count} todo items to records.`));
    } else {
      alert(tr('todo_submit_failed', 'Todo submit failed. Please retry.'));
    }
  };

  // Auto submit previous cycle todos once after entering a new cycle (00:00 boundary semantics)
  React.useEffect(() => {
    if (autoSubmitOnceRef.current) return;
    if (!user?.id || !currentCycle || dimensions.length === 0) return;

    const run = async () => {
      try {
        const defaultDim = dimensions.find(d => d.dimension_name === 'Other' || d.dimension_name === '其他') || dimensions[0];
        if (!defaultDim) return;

        const { data: prevCycles, error: prevErr } = await supabase
          .from('cycles' as any)
          .select('*')
          .eq('user_id', user.id)
          .lt('cycle_number', currentCycle.cycle_number)
          .order('cycle_number', { ascending: false })
          .limit(1);
        if (prevErr) throw prevErr;
        const prev = prevCycles?.[0];
        if (!prev) return;

        const dayKey = `${user.id}_${currentCycle.id}_${getLocalDateString()}`;
        const markerKey = 'todo_auto_submit_marker';
        if (localStorage.getItem(markerKey) === dayKey) return;

        const { data: existingSub } = await supabase
          .from('todo_submissions' as any)
          .select('id')
          .eq('user_id', user.id)
          .eq('cycle_id', prev.id)
          .eq('submit_type', 'auto_cycle_rollover')
          .limit(1);
        if (existingSub && existingSub.length > 0) {
          localStorage.setItem(markerKey, dayKey);
          return;
        }

        const { data: prevTodos, error: todoErr } = await supabase
          .from('todos' as any)
          .select('*')
          .eq('user_id', user.id)
          .eq('cycle_id', prev.id)
          .in('status', ['done', 'dropped']);
        if (todoErr) throw todoErr;
        if (!prevTodos || prevTodos.length === 0) {
          localStorage.setItem(markerKey, dayKey);
          return;
        }

        const { data: submission, error: subErr } = await supabase
          .from('todo_submissions' as any)
          .insert({ user_id: user.id, cycle_id: prev.id, submit_type: 'auto_cycle_rollover' })
          .select('*')
          .single();
        if (subErr) throw subErr;

        for (const t of prevTodos) {
          const text = t.status === 'dropped' ? `[已放弃] ${t.content}` : t.content;
          const recordDate = new Date(t.last_status_changed_at).toISOString().slice(0, 10);

          const { data: rec, error: recErr } = await supabase
            .from('records' as any)
            .insert({
              user_id: user.id,
              cycle_id: prev.id,
              dimension_id: defaultDim.id,
              record_date: recordDate,
              content: text,
              word_count: text.length,
              status: 'published',
            })
            .select('*')
            .single();
          if (recErr) throw recErr;

          const { error: mapErr } = await supabase.from('todo_submission_items' as any).insert({
            submission_id: submission.id,
            todo_id: t.id,
            record_id: rec.id,
            status_at_submit: t.status,
            event_time: t.last_status_changed_at,
          });
          if (mapErr) throw mapErr;
        }

        localStorage.setItem(markerKey, dayKey);
      } catch (e) {
        console.error('auto cycle rollover submit failed', e);
      } finally {
        autoSubmitOnceRef.current = true;
      }
    };

    run();
  }, [user?.id, currentCycle?.id, currentCycle?.cycle_number, dimensions]);

  React.useEffect(() => {
    if (!cyclesLoading && !dimensionsLoading && !readyEmittedRef.current) {
      readyEmittedRef.current = true;
      window.dispatchEvent(new Event('home-initial-ready'));
    }
  }, [cyclesLoading, dimensionsLoading]);

  if (cyclesLoading || dimensionsLoading) {
    return (
      <div className="flex flex-col h-full bg-[#F9FAFB]">
        <header className="flex justify-between items-center px-4 py-3 sticky top-0 bg-[#F9FAFB]/90 backdrop-blur-sm z-10">
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
          <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
          <div className="w-8 h-8 rounded bg-gray-200 animate-pulse" />
        </header>
        <main className="px-4 mt-2 flex flex-col items-center w-full flex-1 animate-pulse">
          <section className="w-full mb-3"><div className="h-16 bg-white rounded-[12px] border border-gray-100" /></section>
          <section className="w-full mb-5"><div className="h-32 bg-white rounded-[12px] border border-gray-100" /></section>
          <section className="w-full mb-8"><div className="h-28 bg-white rounded-[12px] border border-gray-100" /></section>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      <header className="flex justify-between items-center px-4 py-3 sticky top-0 bg-[#F9FAFB]/90 backdrop-blur-sm z-10">
        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" /> : (profile?.nickname?.charAt(0) || 'U')}
        </div>
        <div className="flex flex-col items-center">
          <h1 className="text-[18px] font-bold text-gray-800">10-Day Flow</h1>
          {availableYears.length > 0 && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="mt-1 text-xs text-gray-500 bg-transparent border border-gray-200 rounded px-2 py-0.5 outline-none focus:border-blue-400"
            >
              {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          )}
        </div>
        <Link to="/profile" className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800">
          <Settings size={20} />
        </Link>
      </header>

      <main className="px-4 mt-2 flex flex-col items-center w-full flex-1 overflow-y-auto pb-24">
        {/* A. Matrix collapsed by default */}
        <section className="w-full mb-3">
          <div className="bg-white rounded-[12px] p-4 w-full shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">{tr('home_cycle_matrix', 'Cycle Matrix')}</h2>
              <button
                onClick={() => setMatrixExpanded(v => !v)}
                className="text-xs rounded-full px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                {matrixExpanded ? tr('home_collapse_matrix', 'Collapse Matrix') : tr('home_expand_matrix', 'Expand Full Matrix')}
              </button>
            </div>

            {matrixExpanded && (
              <div className="mt-3 flex flex-col items-center">
                <CycleMatrix
                  cycles={cycles}
                  currentCycle={currentCycle}
                  selectedYear={selectedYear}
                  onCycleClick={(cycleId) => navigate(`/history?cycleId=${cycleId}`)}
                />
              </div>
            )}
          </div>
        </section>

        {/* B. Current period card unchanged */}
        <section className="w-full mb-5">
          <div
            onClick={() => refreshCycles()}
            className="bg-white rounded-[12px] p-4 w-full shadow-[0_1px_3px_rgba(0,0,0,0.1)] cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-800">{tr('home_period', 'Period')} {currentCycle?.cycle_number || 1}</h2>
                </div>
                <p className="text-xs text-gray-500 mt-1">{currentCycle?.start_date} - {currentCycle?.end_date}</p>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-br from-[#7AA5D8] to-[#E89CAB] bg-clip-text text-transparent">{currentCycle?.completion_rate || 0}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2 overflow-hidden">
              <div className="bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] h-2.5 rounded-full transition-all duration-500" style={{ width: `${currentCycle?.completion_rate || 0}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>Day {Math.floor((currentCycle?.completion_rate || 0) / 20) + 1} of {currentCycle?.total_days || 10}</span>
              <span>{currentCycle?.total_days || 10} {tr('home_days_total', 'days total')}</span>
            </div>

            {cycleGoals.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 mb-1.5 font-medium">{tr('home_period_goals', 'Period Goals:')}</p>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {cycleGoals.map((goal, index) => {
                    const dim = dimensions.find(d => d.id === goal.dimension_id);
                    return (
                      <span key={goal.id}>
                        <span className="font-medium">{dim?.dimension_name}</span>: {goal.content}
                        {index < cycleGoals.length - 1 && ' | '}
                      </span>
                    );
                  })}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* C. Todo card */}
        <section className="w-full mb-8">
          <div className="bg-white rounded-[12px] p-4 w-full shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-gray-800">To Do</h3>
              <span className="text-xs text-gray-400">{tr('todo_three_state', '3-state')}</span>
            </div>

            {todosLoading ? (
              <p className="text-sm text-gray-400 py-4">{tr('record_processing', 'Processing...')}</p>
            ) : todos.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">{tr('todo_empty', 'No todo items yet')}</p>
            ) : (
              <ul className="space-y-2">
                {todos.map(item => {
                  const selected = selectedTodoIds.includes(item.id);
                  return (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => todoEditMode ? toggleSelect(item.id) : setStatus(item.id, nextStatus(item.status))}
                        className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                          todoEditMode
                            ? (selected ? 'bg-[#7aa5d8] text-white border-[#7aa5d8]' : 'bg-white text-gray-400 border-gray-300')
                            : item.status === 'done'
                              ? 'bg-[#9fb39f] text-white border-[#9fb39f]'
                              : item.status === 'dropped'
                                ? 'bg-[#bda3ab] text-white border-[#bda3ab]'
                                : 'bg-white text-gray-500 border-gray-300'
                        }`}
                        title={todoEditMode ? tr('todo_select_delete', 'Select to delete') : tr('todo_cycle_status', 'Tap to cycle status')}
                      >
                        {todoEditMode ? (selected ? '✓' : '') : (item.status === 'done' ? '✓' : item.status === 'dropped' ? '✕' : '')}
                      </button>
                      <span className="text-[15px] text-gray-700 truncate">{item.content}</span>
                    </div>
                  </li>
                )})}
              </ul>
            )}

            <div className="mt-3 flex items-center gap-2">
              <input
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder={tr('todo_add_placeholder', 'Add a todo item...')}
                className="flex-1 h-9 rounded-lg border border-gray-200 px-3 text-sm"
              />
              <button
                onClick={async () => {
                  if (!newTodo.trim()) return;
                  const ok = await addTodo(newTodo.trim(), 'manual');
                  if (ok) setNewTodo('');
                }}
                className="h-9 px-3 rounded-lg bg-gray-100 text-gray-700 text-sm"
              >
                + {tr('todo_add', 'Add')}
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  setTodoEditMode(v => !v);
                  setSelectedTodoIds([]);
                }}
                className="h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 text-sm"
              >
                {todoEditMode ? tr('todo_done_edit', 'Done') : tr('todo_edit', 'Edit')}
              </button>

              {todoEditMode ? (
                <button
                  onClick={() => deleteMany(selectedTodoIds).then(ok => ok && setSelectedTodoIds([]))}
                  className="h-9 px-3 rounded-lg border border-[#eddde3] bg-[#faf5f7] text-[#9b6a79] text-sm"
                >
                  {tr('todo_delete_selected', 'Delete Selected')}
                </button>
              ) : (
                <button onClick={handleTodoSubmit} className="h-9 px-3 rounded-lg bg-[#5f6478] text-white text-sm">
                  {tr('todo_submit', 'Submit')}
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
