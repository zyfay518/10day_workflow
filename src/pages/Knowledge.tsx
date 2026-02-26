import React, { useState, useEffect } from "react";
import { BookOpen, Book, Check, PlusCircle, Scale, Wallet, Calendar, TrendingUp, TrendingDown, PiggyBank, Brain, BookPlus, Plus, X } from "lucide-react";
import DynamicIcon from "../components/DynamicIcon";
import { useAuth } from "../hooks/useAuth";
import { useKnowledgeBase } from "../hooks/useKnowledgeBase";
import { useDimensions } from "../hooks/useDimensions";
import { useCycles } from "../hooks/useCycles";
import { cn } from "../lib/utils";
import { useBooks } from "../hooks/useBooks";
import { useWeight } from "../hooks/useWeight";
import { useExpenses } from "../hooks/useExpenses";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function Knowledge() {
    const { user } = useAuth();
    const { entries, addEntry } = useKnowledgeBase(user?.id);
    const { dimensions } = useDimensions(user?.id);
    const { cycles } = useCycles(user?.id);

    const [activeTab, setActiveTab] = useState<number | "all">("all");
    const [subTab, setSubTab] = useState<"books" | "knowledge">("books");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);

    // Books State
    const { books, addBook, updateBook } = useBooks(user?.id);
    const [bookTitle, setBookTitle] = useState("");
    const [bookAuthor, setBookAuthor] = useState("");
    const [readingProgress, setReadingProgress] = useState(0);

    // Health / Weight State
    const [subTabHealth, setSubTabHealth] = useState<"knowledge" | "weight">("knowledge");
    const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
    const [weightKg, setWeightKg] = useState("");
    const { weights, addWeight } = useWeight(user?.id);

    // Finance State
    const expenseParams = React.useMemo(() => ({
        userId: user?.id,
        startDate: '2020-01-01',
        endDate: '2030-12-31'
    }), [user?.id]);
    const { expenses } = useExpenses(expenseParams);

    // New Entry Form State
    const [content, setContent] = useState("");
    const [selectedDimId, setSelectedDimId] = useState<number | "">("");
    const [recordDate, setRecordDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedCycleId, setSelectedCycleId] = useState<number | "">("");

    // Auto-map date to cycle
    useEffect(() => {
        if (!recordDate || cycles.length === 0) return;
        const targetDate = new Date(recordDate);
        const matchingCycle = cycles.find(c => {
            const start = new Date(c.start_date);
            const end = new Date(c.end_date);
            return targetDate >= start && targetDate <= end;
        });

        if (matchingCycle) {
            setSelectedCycleId(matchingCycle.id);
        } else {
            setSelectedCycleId("");
        }
    }, [recordDate, cycles]);

    // Filter entries
    const displayedEntries = entries.filter(e => activeTab === "all" || e.dimension_id === activeTab);

    const handleAdd = () => {
        if (!content.trim() || !selectedDimId || !selectedCycleId) return;

        addEntry({
            user_id: user!.id,
            dimension_id: Number(selectedDimId),
            cycle_id: Number(selectedCycleId),
            record_date: recordDate,
            content: content.trim(),
            media_urls: [],
        });

        setIsModalOpen(false);
        setContent("");
        setSelectedDimId("");
    };

    const handleAddBook = () => {
        if (!bookTitle.trim() || !selectedCycleId) return;
        addBook({
            user_id: user!.id,
            cycle_id: Number(selectedCycleId),
            book_title: bookTitle.trim(),
            author: bookAuthor.trim() || null,
        });
        setIsBookModalOpen(false);
        setBookTitle("");
        setBookAuthor("");
    };

    const handleAddWeight = () => {
        if (!weightKg || isNaN(Number(weightKg))) return;
        addWeight(Number(weightKg), new Date().toISOString().split("T")[0]);
        setIsWeightModalOpen(false);
        setWeightKg("");
    };

    const activeDimension = dimensions.find(d => d.id === activeTab);
    const isReadingDimension = activeDimension?.dimension_name === "阅读";
    const isHealthDimension = activeDimension?.dimension_name === "健康";
    const isExpenseDimension = activeDimension?.dimension_name === "开销";

    // Process expenses by month
    const monthlyExpenses = React.useMemo(() => {
        if (!isExpenseDimension) return [];
        const groups: Record<string, { income: number, expense: number, categories: Record<string, number> }> = {};
        expenses.forEach(e => {
            const date = new Date(e.expense_date);
            const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!groups[monthStr]) groups[monthStr] = { income: 0, expense: 0, categories: {} };

            // Assume category "收入" as income, others as expense
            if (e.category === '收入') {
                groups[monthStr].income += e.amount;
            } else {
                groups[monthStr].expense += e.amount;
                groups[monthStr].categories[e.category] = (groups[monthStr].categories[e.category] || 0) + e.amount;
            }
        });

        return Object.entries(groups)
            .sort((a, b) => b[0].localeCompare(a[0])) // Sort descending by month
            .map(([month, data]) => {
                const savings = data.income - data.expense;

                // Calculate top category for "AI" summary
                const topCategory = Object.entries(data.categories)
                    .sort((a, b) => b[1] - a[1])[0];

                let aiSummary = "本月暂无支出记录，财务状况非常健康。";
                if (topCategory) {
                    const ratio = ((topCategory[1] / data.expense) * 100).toFixed(0);
                    aiSummary = `本月主要开支集中在【${topCategory[0]}】，占比达${ratio}%。建议关注该类目的非必要支出，以提升结余率。`;
                    if (savings < 0) {
                        aiSummary += " 注意：本月支出超过收入，建议复盘消费动机。";
                    } else if (savings > (data.income * 0.5)) {
                        aiSummary += " 表现优秀！本月结余率超过50%，继续保持。";
                    }
                }

                return {
                    month,
                    ...data,
                    savings,
                    aiSummary
                };
            });
    }, [expenses, isExpenseDimension]);

    return (
        <div className="flex flex-col h-full bg-[#F9FAFB] relative pb-24">

            <header className="px-4 py-3 sticky top-0 bg-white shadow-sm z-10">
                <h1 className="text-[20px] font-bold text-gray-800">Knowledge Base</h1>
                <p className="text-xs text-gray-500">Your cognitive growth and reflections</p>
            </header>

            {/* Dimension Tabs */}
            <div className="px-4 py-3 flex gap-2 overflow-x-auto hide-scrollbar sticky top-[64px] bg-[#F9FAFB] z-10">
                <button
                    onClick={() => setActiveTab("all")}
                    className={cn(
                        "whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors",
                        activeTab === "all" ? "bg-gray-800 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200"
                    )}
                >
                    All Intel
                </button>
                {dimensions.map(dim => (
                    <button
                        key={dim.id}
                        onClick={() => setActiveTab(dim.id)}
                        className={cn(
                            "whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1",
                            activeTab === dim.id ? "text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200"
                        )}
                        style={activeTab === dim.id ? { backgroundColor: dim.color_code } : {}}
                    >
                        <DynamicIcon name={dim.icon_name || ''} size={16} className="mb-[1px]" />
                        {dim.dimension_name}
                    </button>
                ))}
            </div>

            {/* Reading Sub-Tabs */}
            {isReadingDimension && (
                <div className="px-4 py-2 bg-white flex border-b border-gray-100">
                    <div className="flex bg-gray-100 p-1 rounded-full w-full max-w-xs">
                        <button
                            onClick={() => setSubTab("books")}
                            className={cn(
                                "flex-1 py-1.5 text-xs font-medium rounded-full transition-all",
                                subTab === "books" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            阅读追踪
                        </button>
                        <button
                            onClick={() => setSubTab("knowledge")}
                            className={cn(
                                "flex-1 py-1.5 text-xs font-medium rounded-full transition-all",
                                subTab === "knowledge" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            知识沉淀
                        </button>
                    </div>
                </div>
            )}

            {/* Health Sub-Tabs */}
            {isHealthDimension && (
                <div className="px-4 py-2 bg-white flex border-b border-gray-100">
                    <div className="flex bg-gray-100 p-1 rounded-full w-full max-w-xs">
                        <button
                            onClick={() => setSubTabHealth("knowledge")}
                            className={cn(
                                "flex-1 py-1.5 text-xs font-medium rounded-full transition-all",
                                subTabHealth === "knowledge" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            行为
                        </button>
                        <button
                            onClick={() => setSubTabHealth("weight")}
                            className={cn(
                                "flex-1 py-1.5 text-xs font-medium rounded-full transition-all",
                                subTabHealth === "weight" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            体重数据
                        </button>
                    </div>
                </div>
            )}

            <main className="px-4 pb-4 mt-4 space-y-4">
                {isReadingDimension && subTab === "books" ? (
                    // Books UI - Refined Morandi Library Style
                    <div className="space-y-4">
                        {books.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-3xl shadow-sm border border-gray-100 items-center justify-center flex flex-col">
                                <div className="w-16 h-16 bg-[#F5F5F5] rounded-full flex items-center justify-center mb-4">
                                    <BookOpen size={32} className="text-gray-300" />
                                </div>
                                <p className="text-gray-400 text-sm font-medium">No books tracked yet.</p>
                            </div>
                        ) : (
                            books.map(book => (
                                <div key={book.id} className="bg-[#FAF9F6] rounded-[24px] p-5 shadow-sm border border-[#E5E2DB] flex gap-5 items-stretch hover:bg-[#F5F4EF] transition-all duration-300">
                                    {/* Book Cover Placeholder - Morandi Pink/Gray */}
                                    <div className="w-20 h-28 bg-gradient-to-br from-[#E9D8D6] to-[#D9B8B5] rounded-xl flex flex-col items-center justify-center flex-shrink-0 shadow-inner relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Book size={32} className="text-white/80 mb-1 drop-shadow-sm" />
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/5" />
                                    </div>

                                    <div className="flex-1 flex flex-col justify-between py-0.5">
                                        <div>
                                            <div className="flex justify-between items-start gap-2 mb-1">
                                                <h3 className="font-bold text-base text-[#5F6368] line-clamp-2 leading-tight tracking-tight">{book.book_title}</h3>
                                                {book.reading_status === 'completed' ? (
                                                    <div className="flex-shrink-0 w-6 h-6 bg-[#B0B7A4]/30 rounded-full flex items-center justify-center">
                                                        <Check size={16} strokeWidth={3} className="text-[#6B705C]" />
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] bg-[#D9B8B5]/30 text-[#A56B6B] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Reading</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-[#A8A8A8] font-medium tracking-tight mb-4">{book.author || "Unknown Author"}</p>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[9px] font-bold text-[#A8A8A8] uppercase tracking-widest leading-none">Progress</span>
                                                <span className="text-xs font-black text-[#5F6368] leading-none">{book.progress_percent}%</span>
                                            </div>
                                            <div className="h-1.5 bg-[#E5E2DB] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#91A8B1] rounded-full transition-all duration-700 ease-out"
                                                    style={{ width: `${book.progress_percent}%` }}
                                                />
                                            </div>

                                            {/* Progress Controls */}
                                            <div className="flex justify-end mt-4 gap-3">
                                                {book.reading_status !== 'completed' && (
                                                    <button
                                                        onClick={() => updateBook(book.id, { progress_percent: Math.min(100, book.progress_percent + 10), reading_status: book.progress_percent + 10 >= 100 ? 'completed' : 'reading' })}
                                                        className="flex items-center gap-1 text-[11px] font-bold text-[#A8A8A8] hover:text-[#91A8B1] transition-colors"
                                                    >
                                                        <PlusCircle size={14} />
                                                        <span>10%</span>
                                                    </button>
                                                )}
                                                {book.reading_status !== 'completed' && (
                                                    <button
                                                        onClick={() => updateBook(book.id, { progress_percent: 100, reading_status: 'completed' })}
                                                        className="px-3 py-1 bg-[#5F6368] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-[#4A4E52] transition-all active:scale-95"
                                                    >
                                                        Finish
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : isHealthDimension && subTabHealth === "weight" ? (
                    // Weight Chart UI
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Scale className="text-[#A8C3A9]" size={24} />
                                Weight Trend
                            </h3>
                            {weights.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-6">No weight data. Click + to add.</p>
                            ) : (
                                <div className="h-48 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={weights}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis
                                                dataKey="record_date"
                                                tick={{ fill: '#9ca3af', fontSize: 10 }}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={(v) => v.slice(5)}
                                            />
                                            <YAxis
                                                domain={['dataMin - 2', 'dataMax + 2']}
                                                tick={{ fill: '#9ca3af', fontSize: 10 }}
                                                axisLine={false}
                                                tickLine={false}
                                                width={30}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                labelStyle={{ color: '#6b7280', fontSize: '12px' }}
                                                itemStyle={{ color: '#1f2937', fontWeight: 'bold' }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="weight_kg"
                                                stroke="#A8C3A9"
                                                strokeWidth={3}
                                                dot={{ r: 4, fill: "#A8C3A9", strokeWidth: 2, stroke: "#fff" }}
                                                activeDot={{ r: 6, fill: "#A8C3A9", stroke: "#fff" }}
                                                name="Weight (kg)"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                ) : isExpenseDimension ? (
                    // Expense Monthly Summary - Compact Morandi Style
                    <div className="space-y-4">
                        {monthlyExpenses.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
                                <div className="w-14 h-14 bg-[#F2F2F2] rounded-full flex items-center justify-center mb-4">
                                    <Wallet size={32} className="text-gray-300" />
                                </div>
                                <p className="text-gray-400 text-sm font-medium">No financial records yet.</p>
                            </div>
                        ) : (
                            monthlyExpenses.map(stat => (
                                <div key={stat.month} className="bg-[#FAF9F6] rounded-[20px] p-4 shadow-sm border border-[#E5E2DB] relative overflow-hidden transition-all hover:bg-[#F5F4EF]">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 bg-[#91A8B1] text-white rounded-lg flex items-center justify-center">
                                                <Calendar size={18} />
                                            </div>
                                            <h3 className="font-bold text-[#5F6368] text-base leading-none">{stat.month}</h3>
                                        </div>
                                        <div className={cn(
                                            "px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1",
                                            stat.savings >= 0 ? "bg-[#B0B7A4]/20 text-[#6B705C]" : "bg-[#D9B8B5]/20 text-[#A56B6B]"
                                        )}>
                                            {stat.savings >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                            {stat.income > 0 ? ((stat.savings / stat.income) * 100).toFixed(0) : 0}% SAVED
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="bg-white/60 rounded-xl p-3 border border-white/40">
                                            <p className="text-[9px] text-[#A8A8A8] font-bold uppercase tracking-widest mb-0.5">Income</p>
                                            <p className="text-sm font-bold text-[#5F6368]">¥{stat.income.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white/60 rounded-xl p-3 border border-white/40">
                                            <p className="text-[9px] text-[#A8A8A8] font-bold uppercase tracking-widest mb-0.5">Exp.</p>
                                            <p className="text-sm font-bold text-[#5F6368]">¥{stat.expense.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="bg-[#C6C4BC] rounded-xl p-3 flex justify-between items-center shadow-inner mb-3">
                                        <div>
                                            <p className="text-[9px] text-white/70 font-bold uppercase tracking-widest mb-0.5">Month Net</p>
                                            <p className="text-base font-black text-white tracking-tight">¥{stat.savings.toLocaleString()}</p>
                                        </div>
                                        <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                            <PiggyBank size={20} className="text-white" />
                                        </div>
                                    </div>

                                    {/* AI Summary Section */}
                                    <div className="bg-white/40 rounded-xl p-3 border border-dashed border-[#C6C4BC]">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <Brain size={14} className="text-[#91A8B1]" />
                                            <span className="text-[10px] font-black text-[#91A8B1] uppercase tracking-wider">AI Summary</span>
                                        </div>
                                        <p className="text-[11px] text-[#5F6368] leading-relaxed italic">
                                            “{stat.aiSummary}”
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : displayedEntries.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-2xl shadow-sm border border-gray-100 mt-4">
                        <BookOpen size={36} className="text-gray-300 mb-2 mx-auto" />
                        <p className="text-gray-500 text-sm">No insights recorded yet.</p>
                    </div>
                ) : (
                    displayedEntries.map(entry => {
                        const dim = dimensions.find(d => d.id === entry.dimension_id);
                        const cycle = cycles.find(c => c.id === entry.cycle_id);
                        return (
                            <div key={entry.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white flex items-center gap-1"
                                            style={{ backgroundColor: dim?.color_code || "#999" }}
                                        >
                                            <DynamicIcon name={dim?.icon_name || ''} size={14} /> {dim?.dimension_name}
                                        </span>
                                        <span className="text-xs text-gray-400 font-medium">Period {cycle?.cycle_number}</span>
                                    </div>
                                    <span className="text-xs text-gray-400">{entry.record_date}</span>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                            </div>
                        );
                    })
                )}
            </main>

            {/* Add FABs */}
            {isReadingDimension && subTab === "books" ? (
                <button
                    onClick={() => setIsBookModalOpen(true)}
                    className="absolute bottom-[104px] right-6 w-14 h-14 bg-[#E8C996] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-20"
                >
                    <BookPlus size={28} />
                </button>
            ) : isHealthDimension && subTabHealth === "weight" ? (
                <button
                    onClick={() => setIsWeightModalOpen(true)}
                    className="absolute bottom-[104px] right-6 w-14 h-14 bg-[#A8C3A9] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-20"
                >
                    <Scale size={28} />
                </button>
            ) : isExpenseDimension ? (
                <div /> // Do not show Add Knowledge for Expense Summary view, handled on Record page
            ) : (
                <button
                    onClick={() => {
                        setIsModalOpen(true);
                        if (typeof activeTab === 'number') {
                            setSelectedDimId(activeTab);
                        }
                    }}
                    className="absolute bottom-[104px] right-6 w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-20"
                >
                    <Plus size={28} />
                </button>
            )}

            {/* Add Book Modal */}
            {isBookModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
                    <div className="bg-white max-w-md w-full rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-800">Track New Book</h2>
                            <button onClick={() => setIsBookModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Book Title</label>
                                <input
                                    type="text"
                                    value={bookTitle}
                                    onChange={e => setBookTitle(e.target.value)}
                                    placeholder="E.g. Thinking, Fast and Slow"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Author (Optional)</label>
                                <input
                                    type="text"
                                    value={bookAuthor}
                                    onChange={e => setBookAuthor(e.target.value)}
                                    placeholder="E.g. Daniel Kahneman"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                />
                            </div>
                            <button
                                onClick={handleAddBook}
                                disabled={!bookTitle.trim()}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98] mt-4"
                            >
                                Start Reading
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Knowledge Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
                    <div className="bg-white w-full max-w-md w-full rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-800">New Insight</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 hide-scrollbar space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Reflection / Note</label>
                                <textarea
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder="What did you learn today?"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all min-h-[120px] resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Dimension</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {dimensions.map(dim => (
                                        <button
                                            key={dim.id}
                                            onClick={() => setSelectedDimId(dim.id)}
                                            className={cn(
                                                "py-2 rounded-lg text-xs font-medium border transition-all flex flex-col items-center justify-center gap-1",
                                                selectedDimId === dim.id
                                                    ? "border-transparent text-white shadow-md"
                                                    : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
                                            )}
                                            style={selectedDimId === dim.id ? { backgroundColor: dim.color_code } : {}}
                                        >
                                            <DynamicIcon name={dim.icon_name || ''} size={24} className="mb-[2px]" />
                                            {dim.dimension_name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Date</label>
                                    <input
                                        type="date"
                                        value={recordDate}
                                        onChange={e => setRecordDate(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Period (Auto-mapped)</label>
                                    <select
                                        value={selectedCycleId}
                                        onChange={e => setSelectedCycleId(Number(e.target.value))}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    >
                                        <option value="" disabled>Select mapping...</option>
                                        {cycles.map(c => (
                                            <option key={c.id} value={c.id}>
                                                Period {c.cycle_number}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100">
                            <button
                                onClick={handleAdd}
                                disabled={!content.trim() || !selectedDimId || !selectedCycleId}
                                className="w-full h-12 bg-gray-900 text-white rounded-xl font-bold shadow-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Save Insight
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Weight Modal */}
            {isWeightModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
                    <div className="bg-white max-w-md w-full rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-800">Record Weight</h2>
                            <button onClick={() => setIsWeightModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Weight (kg)</label>
                                <input
                                    type="number"
                                    value={weightKg}
                                    onChange={e => setWeightKg(e.target.value)}
                                    placeholder="E.g. 65.5"
                                    step="0.1"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#A8C3A9] focus:border-[#A8C3A9]"
                                    autoFocus
                                />
                            </div>
                            <button
                                onClick={handleAddWeight}
                                disabled={!weightKg}
                                className="w-full py-3.5 bg-[#A8C3A9] hover:bg-[#8da88e] disabled:bg-gray-200 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98] mt-4"
                            >
                                Save Weight
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
