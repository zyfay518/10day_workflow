import { Link, useNavigate } from "react-router-dom";
import React from "react";
import { Settings, ChevronRight, Circle, CheckCircle2, Edit, BarChart2 } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { useCycles } from "../hooks/useCycles";
import { useDimensions } from "../hooks/useDimensions";
import { useUserProfile } from "../hooks/useUserProfile";
import { useCycleGoals, useDailyGoals } from "../hooks/useGoals";
import { useRecords } from "../hooks/useRecords";

export default function Home() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.id);
  const { cycles, currentCycle, loading: cyclesLoading, refreshCycles } = useCycles(user?.id);
  const { dimensions, loading: dimensionsLoading } = useDimensions(user?.id);
  const navigate = useNavigate();

  // 年份选择
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());

  // 根据年份过滤周期
  const filteredCycles = React.useMemo(() => {
    return cycles.filter(cycle => {
      const year = new Date(cycle.start_date).getFullYear();
      return year === selectedYear;
    });
  }, [cycles, selectedYear]);

  // 获取所有可用的年份
  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    cycles.forEach(cycle => {
      const year = new Date(cycle.start_date).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a); // 降序排列
  }, [cycles]);

  // Load goals
  const { goals: cycleGoals } = useCycleGoals(user?.id, currentCycle?.id);
  const today = new Date().toISOString().split('T')[0];
  const { goals: dailyGoals } = useDailyGoals(user?.id, today);

  // Generate 37 dots representing cycles (use real cycle data where available)
  const totalDots = 37;
  const dots = Array.from({ length: totalDots }, (_, i) => {
    const cycleIndex = i;
    const cycle = filteredCycles[cycleIndex];

    if (cycle) {
      // Use real cycle data
      if (cycle.status === 'completed') {
        return {
          status: "complete" as const,
          completion: cycle.completion_rate,
          cycleId: cycle.id,
          cycleNumber: cycle.cycle_number
        };
      }
      if (cycle.status === 'active') {
        return {
          status: "current" as const,
          completion: cycle.completion_rate,
          cycleId: cycle.id,
          cycleNumber: cycle.cycle_number
        };
      }
      // not_started
      return {
        status: "future" as const,
        completion: 0,
        cycleId: cycle.id,
        cycleNumber: cycle.cycle_number
      };
    }

    // No real cycle data - show as future/placeholder
    return {
      status: "future" as const,
      completion: 0,
      cycleId: null,
      cycleNumber: cycleIndex + 1
    };
  });

  // Get dot color based on completion rate - single color interpolation
  const getDotColor = (completion: number): string => {
    if (completion === 0) {
      return '#9DC5EF'; // Pure blue for 0% completion
    }

    // RGB values for interpolation
    const blueRGB = { r: 157, g: 197, b: 239 }; // #9DC5EF
    const pinkRGB = { r: 255, g: 179, b: 193 }; // #FFB3C1

    // Linear interpolation
    const ratio = completion / 100;
    const r = Math.round(blueRGB.r + (pinkRGB.r - blueRGB.r) * ratio);
    const g = Math.round(blueRGB.g + (pinkRGB.g - blueRGB.g) * ratio);
    const b = Math.round(blueRGB.b + (pinkRGB.b - blueRGB.b) * ratio);

    return `rgb(${r}, ${g}, ${b})`;
  };

  // Group dots into rows (6 per row)
  const dotRows = [];
  for (let i = 0; i < dots.length; i += 6) {
    dotRows.push(dots.slice(i, i + 6));
  }

  // 计算今日记录完成情况
  const { record: workRecord } = useRecords({ userId: user?.id || undefined, cycleId: currentCycle?.id || undefined, dimensionId: dimensions.find(d => d.dimension_name === '工作')?.id, date: today });
  const { record: readingRecord } = useRecords({ userId: user?.id || undefined, cycleId: currentCycle?.id || undefined, dimensionId: dimensions.find(d => d.dimension_name === '阅读')?.id, date: today });
  const { record: investmentRecord } = useRecords({ userId: user?.id || undefined, cycleId: currentCycle?.id || undefined, dimensionId: dimensions.find(d => d.dimension_name === '投资')?.id, date: today });
  const { record: expenseRecord } = useRecords({ userId: user?.id || undefined, cycleId: currentCycle?.id || undefined, dimensionId: dimensions.find(d => d.dimension_name === '费用')?.id, date: today });
  const { record: healthRecord } = useRecords({ userId: user?.id || undefined, cycleId: currentCycle?.id || undefined, dimensionId: dimensions.find(d => d.dimension_name === '健康')?.id, date: today });

  const todayStatus = dimensions.map(dim => {
    let isCompleted = false;
    if (dim.dimension_name === '工作') isCompleted = !!workRecord;
    if (dim.dimension_name === '阅读') isCompleted = !!readingRecord;
    if (dim.dimension_name === '投资') isCompleted = !!investmentRecord;
    if (dim.dimension_name === '费用') isCompleted = !!expenseRecord;
    if (dim.dimension_name === '健康') isCompleted = !!healthRecord;

    return {
      name: dim.dimension_name,
      icon: dim.icon_name,
      completed: isCompleted,
    };
  });

  const completedCount = todayStatus.filter(s => s.completed).length;

  // 刷新数据
  const handleRefresh = () => {
    refreshCycles();
  };

  if (cyclesLoading || dimensionsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">

      <header className="flex justify-between items-center px-4 py-3 sticky top-0 bg-[#F9FAFB]/90 backdrop-blur-sm z-10">
        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold">
          {profile?.nickname?.charAt(0) || 'U'}
        </div>
        <div className="flex flex-col items-center">
          <h1 className="text-[18px] font-bold text-gray-800">10-Day Flow</h1>
          {/* Year Selector */}
          {availableYears.length > 0 && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="mt-1 text-xs text-gray-500 bg-transparent border border-gray-200 rounded px-2 py-0.5 outline-none focus:border-blue-400"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}
        </div>
        <Link to="/profile" className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800">
          <Settings size={20} />
        </Link>
      </header>

      <main className="px-4 mt-2 flex flex-col items-center w-full flex-1">
        <section className="w-full flex flex-col items-center mb-6">
          {/* Matrix with row numbers */}
          <div className="flex gap-2">
            {/* Row numbers column */}
            <div className="flex flex-col gap-2 pt-1">
              {dotRows.map((_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="w-6 h-9 flex items-center justify-center text-xs text-gray-400 font-medium"
                >
                  {rowIndex + 1}
                </div>
              ))}
            </div>

            {/* Matrix dots */}
            <div>
              {dotRows.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-6 gap-2 mb-2">
                  {row.map((dot, dotIndex) => (
                    <div
                      key={`${rowIndex}-${dotIndex}`}
                      className={cn(
                        "w-9 h-9 rounded-full transition-all duration-300",
                        dot.status === "complete" && "hover:opacity-90 cursor-pointer shadow-sm",
                        dot.status === "current" && "ring-4 ring-[#E8C996]/30 animate-pulse cursor-pointer relative z-10",
                        dot.status === "future" && "bg-white border border-gray-200",
                        dot.cycleId && (dot.status === "complete" || dot.status === "current") && "cursor-pointer"
                      )}
                      style={
                        dot.status === "complete"
                          ? { background: `linear-gradient(135deg, white 10%, ${getDotColor(dot.completion)} 100%)` }
                          : dot.status === "current"
                            ? { background: `linear-gradient(135deg, white 10%, #E8C996 100%)` }
                            : {}
                      }
                      title={
                        dot.cycleId
                          ? dot.status === "complete"
                            ? `Period ${dot.cycleNumber} - ${dot.completion}% complete`
                            : dot.status === "current"
                              ? `Period ${dot.cycleNumber} - Active`
                              : `Period ${dot.cycleNumber} - Not started`
                          : `Period ${dot.cycleNumber} - Placeholder`
                      }
                      onClick={() => {
                        if (dot.cycleId && (dot.status === "complete" || dot.status === "current")) {
                          navigate(`/history?cycleId=${dot.cycleId}`);
                        }
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full mb-5">
          <div
            onClick={handleRefresh}
            className="bg-white rounded-[12px] p-4 w-full shadow-[0_1px_3px_rgba(0,0,0,0.1)] cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-800">
                    Period {currentCycle?.cycle_number || 1}
                  </h2>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {currentCycle?.start_date} - {currentCycle?.end_date}
                </p>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-br from-[#7AA5D8] to-[#E89CAB] bg-clip-text text-transparent">
                {currentCycle?.completion_rate || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${currentCycle?.completion_rate || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>Day {Math.floor((currentCycle?.completion_rate || 0) / 20) + 1} of {currentCycle?.total_days || 10}</span>
              <span>{currentCycle?.total_days || 10} days total</span>
            </div>

            {/* Cycle Goals Summary */}
            {cycleGoals.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 mb-1.5 font-medium">Period Goals:</p>
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

        {/* Cycle Goals Section */}
        {cycleGoals.length > 0 && (
          <section className="w-full mb-5">
            <Link
              to="/goals"
              className="bg-white rounded-[12px] p-4 w-full shadow-[0_1px_3px_rgba(0,0,0,0.1)] block hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-800">10-Day Goals</h3>
                <ChevronRight className="text-gray-400" size={18} />
              </div>
              <div className="space-y-2">
                {cycleGoals.slice(0, 3).map((goal) => {
                  const dim = dimensions.find(d => d.id === goal.dimension_id);
                  return (
                    <div key={goal.id} className="flex items-start gap-2">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white mt-0.5"
                        style={{ backgroundColor: dim?.color_code || '#999' }}
                      >
                        {dim?.dimension_name}
                      </span>
                      <p className="text-xs text-gray-700 flex-1 line-clamp-2">{goal.content}</p>
                    </div>
                  );
                })}
              </div>
              {cycleGoals.length > 3 && (
                <p className="text-xs text-gray-400 mt-3">+{cycleGoals.length - 3} more goals</p>
              )}
            </Link>
          </section>
        )}

        {/* Today's Goals Section */}
        {dailyGoals.length > 0 && (
          <section className="w-full mb-5">
            <div className="bg-white rounded-[12px] p-4 w-full shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-800">Today's Goals</h3>
                <Link to="/goals" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                  View All
                </Link>
              </div>
              <div className="space-y-2">
                {dailyGoals.map((goal) => {
                  const dim = dimensions.find(d => d.id === goal.dimension_id);
                  return (
                    <div key={goal.id} className="flex items-center gap-2">
                      <Circle className="text-gray-300" size={14} />
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                        style={{ backgroundColor: dim?.color_code || '#999' }}
                      >
                        {dim?.dimension_name}
                      </span>
                      <p className="text-xs text-gray-700 flex-1">{goal.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <section className="w-full mb-6">
          <div className="bg-white rounded-[12px] p-4 w-full shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-gray-800">Today's Record</h3>
              <span className="text-xs font-medium text-gray-500">
                {completedCount}/{dimensions.length} Completed
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {todayStatus.map((status, index) => (
                <div
                  key={index}
                  className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                    status.completed
                      ? "bg-[#A8C3A9]/20 text-[#5F8C60]"
                      : "bg-gray-100 text-gray-400"
                  )}
                >
                  {status.completed ? (
                    <CheckCircle2 size={14} className="mr-1" />
                  ) : (
                    <Circle size={14} className="mr-1" />
                  )}
                  {status.name}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[2fr_1fr] gap-3">
              <Link
                to="/record"
                className="bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white h-12 rounded-[8px] font-bold text-sm shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Edit size={18} />
                Start Recording
              </Link>
              <Link
                to="/report"
                className="bg-white border border-gray-200 text-gray-600 h-12 rounded-[8px] font-medium text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
              >
                <BarChart2 size={18} />
                Report
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
