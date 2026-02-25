import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth.local";
import { useCycles } from "../hooks/useCycles.local";
import { useDimensions } from "../hooks/useDimensions.local";
import { localRecords, localAttachments, localExpenses } from "../lib/localStorage";
import { Database } from "../types/database";
import DateRangePicker from "../components/DateRangePicker";
import { useMilestones } from "../hooks/useMilestones.local";

type Record = Database['public']['Tables']['records']['Row'];
type Milestone = Database['public']['Tables']['milestones']['Row'];
type RecordAttachment = Database['public']['Tables']['record_attachments']['Row'];
type Expense = Database['public']['Tables']['expenses']['Row'];

interface RecordWithDetails extends Record {
  dimension_name: string;
  dimension_color: string;
  dimension_icon: string;
  attachments: RecordAttachment[];
  expenses: Expense[];
}

export default function History() {
  const [searchParams] = useSearchParams();
  const cycleIdParam = searchParams.get('cycleId');

  const { user } = useAuth();
  const { cycles, currentCycle } = useCycles(user?.id);
  const { dimensions } = useDimensions(user?.id);
  const { milestones } = useMilestones(user?.id);

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRangeType, setDateRangeType] = useState<"current" | "2weeks" | "1month" | "custom">("current");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [dimFilter, setDimFilter] = useState<string>("All");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showDimDropdown, setShowDimDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Find the cycle from URL parameter or use current cycle
  const selectedCycle = useMemo(() => {
    if (cycleIdParam) {
      const cycleId = parseInt(cycleIdParam);
      return cycles.find(c => c.id === cycleId) || currentCycle;
    }
    return currentCycle;
  }, [cycleIdParam, cycles, currentCycle]);

  // Calculate date range based on filter type
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();

    switch (dateRangeType) {
      case "current":
        return {
          startDate: selectedCycle?.start_date || today.toISOString().split('T')[0],
          endDate: selectedCycle?.end_date || today.toISOString().split('T')[0]
        };
      case "2weeks": {
        const twoWeeksAgo = new Date(today);
        twoWeeksAgo.setDate(today.getDate() - 14);
        return {
          startDate: twoWeeksAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      }
      case "1month": {
        const oneMonthAgo = new Date(today);
        oneMonthAgo.setDate(today.getDate() - 30);
        return {
          startDate: oneMonthAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      }
      case "custom":
        return {
          startDate: customStartDate || today.toISOString().split('T')[0],
          endDate: customEndDate || today.toISOString().split('T')[0]
        };
      default:
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
    }
  }, [dateRangeType, customStartDate, customEndDate, selectedCycle]);

  // Load records with attachments and expenses
  const records: RecordWithDetails[] = useMemo(() => {
    if (!user) return [];

    // Get all records across all cycles for the user
    const allStoredRecords = JSON.parse(localStorage.getItem('records') || '[]') as Record[];
    const userRecords = allStoredRecords.filter(record => {
      const recordDate = record.record_date;
      return record.user_id === user.id && recordDate >= startDate && recordDate <= endDate;
    });

    return userRecords
      .map(record => {
        const dim = dimensions.find(d => d.id === record.dimension_id);
        return {
          ...record,
          dimension_name: dim?.dimension_name || 'Unknown',
          dimension_color: dim?.color_code || '#999999',
          dimension_icon: dim?.icon_name || '📝',
          attachments: localAttachments.getByRecordId(record.id),
          expenses: localExpenses.getByRecordId(record.id),
        };
      })
      .sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());
  }, [user, startDate, endDate, dimensions]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Dimension filter
      if (dimFilter !== "All" && record.dimension_name !== dimFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          record.content.toLowerCase().includes(query) ||
          record.dimension_name.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [records, dimFilter, searchQuery]);

  // Unified Timeline Items (Merge Records and Milestones)
  const timelineItems = useMemo(() => {
    // Map records to a standard timeline object
    const mappedRecords = filteredRecords.map(r => ({ type: 'record' as const, data: r, date: new Date(r.record_date).getTime() }));

    // Filter and map milestones
    const filteredMilestones = milestones.filter(m => {
      // Date filter
      if (m.event_date < startDate || m.event_date > endDate) return false;
      // Dimension filter
      if (dimFilter !== "All") {
        const dim = dimensions.find(d => d.id === m.related_dimension_id);
        if (dim?.dimension_name !== dimFilter) return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          m.event_title.toLowerCase().includes(query) ||
          (m.event_description && m.event_description.toLowerCase().includes(query))
        );
      }
      return true;
    });

    // To prevent duplicate text if a record was cloned as a milestone:
    const milestoneContentKeys = new Set(filteredMilestones.map(m => `${m.event_date}-${m.event_description}`));
    const uniqueRecords = mappedRecords.filter(r => !milestoneContentKeys.has(`${r.data.record_date}-${r.data.content}`));

    const mappedMilestones = filteredMilestones.map(m => ({ type: 'milestone' as const, data: m, date: new Date(m.event_date).getTime() }));

    return [...uniqueRecords, ...mappedMilestones].sort((a, b) => b.date - a.date);
  }, [filteredRecords, milestones, startDate, endDate, dimFilter, searchQuery, dimensions]);

  // Highlight keywords
  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 text-gray-900">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Get date range label
  const getDateRangeLabel = () => {
    switch (dateRangeType) {
      case "current":
        return "Current Period";
      case "2weeks":
        return "Last 2 Weeks";
      case "1month":
        return "Last Month";
      case "custom":
        if (customStartDate && customEndDate) {
          return `${customStartDate} ~ ${customEndDate}`;
        }
        return "Custom Range";
      default:
        return "Current Period";
    }
  };

  // Handle custom date selection
  const handleCustomDateConfirm = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setDateRangeType("custom");
  };

  // Open image viewer
  const openImageViewer = (images: string[], index: number) => {
    setSelectedImages(images);
    setCurrentImageIndex(index);
    setShowImageModal(true);
  };

  // Navigate images
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % selectedImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + selectedImages.length) % selectedImages.length);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDateDropdown(false);
      setShowDimDropdown(false);
    };
    if (showDateDropdown || showDimDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDateDropdown, showDimDropdown]);

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      {/* Status Bar */}
      <div className="h-12 w-full bg-white flex items-end justify-between px-6 pb-2 text-xs font-medium text-gray-900">
        <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
        <div className="flex gap-1.5 items-center">
          <span className="material-symbols-outlined text-[16px] font-bold">signal_cellular_alt</span>
          <span className="material-symbols-outlined text-[16px] font-bold">wifi</span>
          <span className="material-symbols-outlined text-[18px] font-bold">battery_full</span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <Link to="/" className="p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="text-[18px] font-bold text-gray-800">History</h1>
          <button
            onClick={() => setIsSearching(!isSearching)}
            className="p-2 -mr-2 text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">{isSearching ? 'close' : 'search'}</span>
          </button>
        </div>

        {isSearching && (
          <div className="mb-3 relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-[8px] py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-blue-300 focus:border-transparent"
              autoFocus
            />
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-gray-400 text-[18px]">search</span>
          </div>
        )}

        {/* Date Range Display */}
        <div className="mb-3 bg-gradient-to-r from-blue-50 to-pink-50 rounded-[10px] py-2.5 px-4 flex items-center justify-between border border-gray-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-600 text-[18px]">calendar_today</span>
            <span className="text-sm font-medium text-gray-700">
              {startDate} ~ {endDate}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        <div className="flex gap-2">
          {/* Date Range Dropdown */}
          <div className="flex-1 relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDateDropdown(!showDateDropdown);
                setShowDimDropdown(false);
              }}
              className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 rounded-[8px] py-2 px-3 text-sm hover:bg-gray-100 transition-colors"
            >
              <span className="font-medium text-gray-700 truncate">{getDateRangeLabel()}</span>
              <span className="material-symbols-outlined text-gray-400 text-[18px]">expand_more</span>
            </button>
            {showDateDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-[8px] shadow-lg z-50 overflow-hidden">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDateRangeType("current");
                    setShowDateDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                    dateRangeType === "current" && "bg-blue-50 text-blue-600 font-medium"
                  )}
                >
                  Current Period
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDateRangeType("2weeks");
                    setShowDateDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                    dateRangeType === "2weeks" && "bg-blue-50 text-blue-600 font-medium"
                  )}
                >
                  Last 2 Weeks
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDateRangeType("1month");
                    setShowDateDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                    dateRangeType === "1month" && "bg-blue-50 text-blue-600 font-medium"
                  )}
                >
                  Last Month
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDatePicker(true);
                    setShowDateDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-t border-gray-100",
                    dateRangeType === "custom" && "bg-blue-50 text-blue-600 font-medium"
                  )}
                >
                  Custom Range...
                </button>
              </div>
            )}
          </div>

          {/* Dimension Dropdown */}
          <div className="flex-1 relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDimDropdown(!showDimDropdown);
                setShowDateDropdown(false);
              }}
              className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 rounded-[8px] py-2 px-3 text-sm hover:bg-gray-100 transition-colors"
            >
              <span className="font-medium text-gray-700">{dimFilter}</span>
              <span className="material-symbols-outlined text-gray-400 text-[18px]">expand_more</span>
            </button>
            {showDimDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-[8px] shadow-lg z-50 max-h-48 overflow-y-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDimFilter("All");
                    setShowDimDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                    dimFilter === "All" && "bg-blue-50 text-blue-600 font-medium"
                  )}
                >
                  All
                </button>
                {dimensions.map((dim) => (
                  <button
                    key={dim.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDimFilter(dim.dimension_name);
                      setShowDimDropdown(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                      dimFilter === dim.dimension_name && "bg-blue-50 text-blue-600 font-medium"
                    )}
                  >
                    {dim.dimension_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Timeline Layout */}
      <main className="flex-1 overflow-y-auto px-6 pt-6 pb-6 space-y-0 relative">
        {timelineItems.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">No records found</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-gray-100 pl-6 ml-2 space-y-8">
            {timelineItems.map((item, index) => {
              if (item.type === 'milestone') {
                const milestone = item.data as Milestone;
                const dim = dimensions.find(d => d.id === milestone.related_dimension_id);
                const truncatedContent = milestone.event_description && milestone.event_description.length > 200
                  ? milestone.event_description.substring(0, 200) + '...'
                  : milestone.event_description;

                return (
                  <div key={`milestone-${milestone.id}`} className="relative">
                    {/* Timeline Node */}
                    <div className="absolute -left-[35px] top-4 w-5 h-5 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full border-4 border-white shadow-sm flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>

                    {/* Milestone Card - Full Width Highlight */}
                    <article className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 shadow-sm border border-amber-100 transition-all hover:shadow-md">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-600 tracking-wider uppercase px-2 py-0.5 bg-amber-100/50 rounded-full border border-amber-200/50 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">emoji_events</span>
                            Milestone
                          </span>
                          <span className="text-sm font-bold text-gray-800">
                            {new Date(milestone.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        {dim && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/60 border border-white/80 shadow-sm">
                            <span className="material-symbols-outlined text-[16px]" style={{ color: dim.color_code }}>{dim.icon_name}</span>
                            <span className="text-xs font-medium text-gray-700">{dim.dimension_name}</span>
                          </div>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 mb-2">{highlightText(milestone.event_title, searchQuery)}</h3>

                      {truncatedContent && (
                        <p className="text-sm text-gray-700 leading-relaxed font-medium">
                          {highlightText(truncatedContent, searchQuery)}
                        </p>
                      )}
                    </article>
                  </div>
                );
              }

              // Normal Record
              const record = item.data as RecordWithDetails;
              // Truncate content to 150 characters
              const truncatedContent = record.content.length > 150
                ? record.content.substring(0, 150) + '...'
                : record.content;

              // Truncate AI suggestions to 50 characters
              const truncatedAI = record.ai_suggestions && record.ai_suggestions.length > 50
                ? record.ai_suggestions.substring(0, 50) + '...'
                : record.ai_suggestions;

              return (
                <div key={`record-${record.id}`} className="relative">
                  {/* Timeline Node */}
                  <div className="absolute -left-[31px] top-5 w-3 h-3 bg-blue-300 rounded-full border-2 border-white shadow-sm"></div>

                  {/* Normal Record Card - Compact */}
                  <article className="bg-white rounded-[16px] p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow max-w-[95%]">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">
                          {new Date(record.record_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
                          <span className="material-symbols-outlined text-[16px]" style={{ color: record.dimension_color }}>{record.dimension_icon}</span>
                          <span className="text-xs font-medium text-gray-700">{record.dimension_name}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(record.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 leading-relaxed mb-3">
                      {highlightText(truncatedContent, searchQuery)}
                    </p>

                    {record.attachments.length > 0 && (
                      <div className="flex gap-2 mb-3">
                        {record.attachments.map((att, idx) => (
                          <div
                            key={att.id}
                            onClick={() => openImageViewer(record.attachments.map(a => a.file_url), idx)}
                            className="w-14 h-14 rounded-[8px] bg-gray-100 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <img
                              alt="Attachment"
                              className="w-full h-full object-cover"
                              src={att.file_url}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {record.expenses.length > 0 && (
                      <div className="bg-gray-50 rounded-[8px] p-2.5 space-y-1 mb-3">
                        {record.expenses.map((exp) => (
                          <div key={exp.id} className="flex justify-between text-xs">
                            <span className="text-gray-600">{exp.item_name}</span>
                            <span className="font-medium text-gray-800">¥{exp.amount.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="h-px bg-gray-200 my-1"></div>
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-gray-500">Total</span>
                          <span className="text-gray-900">
                            ¥{record.expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Footer: AI Quote and metadata */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        {record.ai_quote ? (
                          <div className="flex items-center gap-1.5 text-xs italic text-gray-600">
                            <span className="material-symbols-outlined text-[14px] text-gray-400">format_quote</span>
                            <span>{record.ai_quote}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {record.word_count} words
                          </span>
                        )}
                        {record.attachments.length > 0 && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <span className="material-symbols-outlined text-[14px]">image</span>
                              <span>{record.attachments.length}</span>
                            </div>
                          </>
                        )}
                      </div>
                      {record.ai_suggestions && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100">
                          <span className="material-symbols-outlined text-[14px] text-blue-600">auto_awesome</span>
                          <span className="text-xs font-medium text-blue-700">AI Reviewed</span>
                        </div>
                      )}
                    </div>

                    {/* AI suggestions preview */}
                    {truncatedAI && (
                      <div className="mt-3 p-2.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-[8px] border border-blue-100">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-[16px] text-blue-600 mt-0.5">lightbulb</span>
                          <p className="text-xs text-gray-600 leading-relaxed">{truncatedAI}</p>
                        </div>
                      </div>
                    )}
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Image Viewer Modal */}
      {showImageModal && selectedImages.length > 0 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-full max-h-full p-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImages[currentImageIndex]}
              alt="Preview"
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-white rounded-full flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-gray-800">close</span>
            </button>
            {selectedImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-gray-800">chevron_left</span>
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-gray-800">chevron_right</span>
                </button>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full text-xs font-medium">
                  {currentImageIndex + 1} / {selectedImages.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Date Range Picker Modal */}
      {showDatePicker && (
        <DateRangePicker
          onConfirm={handleCustomDateConfirm}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </div>
  );
}
