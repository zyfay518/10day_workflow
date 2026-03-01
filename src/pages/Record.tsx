import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Calendar, Camera, Mic, Paperclip, Bot, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { useCycles } from "../hooks/useCycles";
import { useDimensions } from "../hooks/useDimensions";
import { useRecords } from "../hooks/useRecords";
import { useAttachments } from "../hooks/useAttachments";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.local";
import { useAIAnalysis } from "../hooks/useAIAnalysis";
import { useMilestones } from "../hooks/useMilestones";
import { useGrowthTags } from "../hooks/useGrowthTags";
import { supabase } from "../lib/supabase";
import AIResultModal from "../components/AIResultModal";
import { SplitDimensionItem } from "../hooks/useAIAnalysis";

export default function Record() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentCycle } = useCycles(user?.id);
  const { dimensions } = useDimensions(user?.id);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // No more tabs, we default to the entire day's record view.
  // The 'activeDimension' logic below will be refactored in Phase 3.
  // For Phase 2, we just keep the note state tied to the day.

  // 获取或保存记录 (In Phase 2/3, we save the raw draft to a default dimension temporarily before AI parse)
  const defaultDimension = dimensions.find(d => d.dimension_name === 'Other') || dimensions[0];

  const { record, saving, saveRecord } = useRecords({
    userId: user?.id,
    cycleId: currentCycle?.id,
    dimensionId: defaultDimension?.id,
    date: selectedDate,
  });

  const [note, setNote] = useState(record?.content || "");
  const [isMilestone, setIsMilestone] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ title: '', message: '', onConfirm: () => { } });

  const [showAIModal, setShowAIModal] = useState(false);
  const [parsedDimensions, setParsedDimensions] = useState<SplitDimensionItem[]>([]);
  const availableDimensions = dimensions.map(d => d.dimension_name);

  const { addMilestone } = useMilestones(user?.id);
  const { addOrIncrementTag } = useGrowthTags(user?.id);

  // 附件管理
  const { attachments, uploading, uploadImage, capturePhoto, deleteAttachment, loadAttachments } = useAttachments(record?.id, user?.id);

  // 语音识别
  const { transcript, isListening, isSupported: speechSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  // AI分析
  const { analyzing, result: aiResult, analyze, splitDimensions, generateQuote, extractTags, clearResult, parseExpenseResult } = useAIAnalysis(user?.id);

  // 当切换日期时，更新 note (Note: 'record' loading logic will need to be updated to load all text for the day, not just one dimension)
  useEffect(() => {
    setNote(record?.content || "");
    setIsMilestone(false);
  }, [record?.content, selectedDate]);

  // 加载附件
  useEffect(() => {
    if (record?.id) {
      loadAttachments();
    }
  }, [record?.id, loadAttachments]);

  // 语音识别结果自动追加到note
  useEffect(() => {
    if (transcript) {
      setNote(prev => prev + transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  // 计算所有维度今日完成状态
  const [overviewStatus, setOverviewStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user || !currentCycle) return;

    const fetchOverviewStatus = async () => {
      const { data, error } = await supabase
        .from('records')
        .select('dimension_id, status')
        .eq('user_id', user.id)
        .eq('cycle_id', currentCycle.id)
        .eq('record_date', selectedDate);

      if (error) {
        console.error('Failed to fetch overview status:', error);
        return;
      }

      const recordsData = data as { dimension_id: number; status: string }[] | null;
      const status: Record<string, boolean> = {};
      dimensions.forEach(dim => {
        const rec = recordsData?.find(r => r.dimension_id === dim.id);
        status[dim.dimension_name] = rec?.status === 'published';
      });
      setOverviewStatus(status);
    };

    fetchOverviewStatus();
  }, [user, currentCycle, selectedDate, dimensions, record?.status]);

  // Show custom dialog
  const showCustomDialog = (title: string, message: string, onConfirm?: () => void) => {
    setDialogConfig({ title, message, onConfirm: onConfirm || (() => { }) });
    setShowDialog(true);
  };

  // Handle photo capture
  const handleCapturePhoto = async () => {
    if (!record) {
      showCustomDialog('Notice', 'Please save the current record first');
      return;
    }
    try {
      await capturePhoto();
      showCustomDialog('Success', 'Photo uploaded');
    } catch (error) {
      showCustomDialog('Error', error instanceof Error ? error.message : 'Photo capture failed');
    }
  };

  // Handle voice recording
  const handleVoiceRecord = () => {
    if (isListening) {
      stopListening();
    } else {
      if (!speechSupported) {
        showCustomDialog('Notice', 'Your browser does not support speech recognition');
        return;
      }
      startListening();
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!record) {
      showCustomDialog('Notice', 'Please save the current record first');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadImage(file);
      showCustomDialog('Success', 'File uploaded');
    } catch (error) {
      showCustomDialog('Error', error instanceof Error ? error.message : 'Upload failed');
    }
  };



  // Save current dimension record (Entry point)
  const handleSaveRecord = async () => {
    console.log('--- handleSaveRecord Triggered ---');
    console.log('Note content:', note);
    if (!note.trim()) {
      showCustomDialog('Notice', 'Please enter record content');
      return;
    }

    try {
      console.log('Calling splitDimensions...');
      const items = await splitDimensions(note);
      console.log('splitDimensions returned items:', items);
      setParsedDimensions(items);
      console.log('Setting showAIModal to true');
      setShowAIModal(true);
      console.log('State updated, wait for render');
    } catch (e) {
      console.error('handleSaveRecord error caught:', e);
    }
  };

  const handleSkipAI = async () => {
    setShowAIModal(false);
    const success = await saveRecord(note, 'published');
    if (success) {
      if (isMilestone && defaultDimension) {
        await addMilestone({
          user_id: user!.id,
          event_date: selectedDate,
          event_title: `Milestone: Journal`,
          event_description: note,
          event_type: 'achievement',
          related_dimension_id: defaultDimension.id
        });
      }

      showCustomDialog('Success', 'Record saved without AI segmentation', () => {
        navigate('/');
      });
    } else {
      showCustomDialog('Failed', 'Save failed, please try again');
    }
  };

  const handleConfirmAI = async (items: SplitDimensionItem[]) => {
    setShowAIModal(false);

    if (items.length === 0) {
      handleSkipAI();
      return;
    }

    try {
      for (const item of items) {
        const dim = dimensions.find(d => d.dimension_name === item.dimension) || defaultDimension;
        if (!dim) continue;

        const { data: existing } = await supabase.from('records')
          .select('*')
          .eq('user_id', user!.id)
          .eq('cycle_id', currentCycle!.id)
          .eq('dimension_id', dim.id)
          .eq('record_date', selectedDate)
          .maybeSingle();

        let finalContent = item.content;
        let savedRecordId;

        if (existing) {
          const existingRecord = existing;
          finalContent = existingRecord.content + '\n\n' + item.content;
          const updatePayload = { content: finalContent, word_count: finalContent.length };
          const { data, error } = await supabase.from('records')
            .update(updatePayload)
            .eq('id', existingRecord.id)
            .select().single();
          if (error) throw error;
          savedRecordId = data?.id;
        } else {
          const insertPayload = {
            user_id: user!.id,
            cycle_id: currentCycle!.id,
            dimension_id: dim.id,
            record_date: selectedDate,
            content: finalContent,
            word_count: finalContent.length,
            status: 'published'
          };
          const { data, error } = await supabase.from('records')
            .insert(insertPayload)
            .select()
            .single();
          if (error) throw error;
          savedRecordId = data?.id;
        }

        if (dim.dimension_name === 'Wealth' || dim.dimension_name === '财富') {
          try {
            const expenseResult = await analyze(finalContent, 'Expense');
            const parsedExpenses = parseExpenseResult(expenseResult);
            if (parsedExpenses && parsedExpenses.length > 0) {
              const newExpenses = parsedExpenses.map(exp => ({
                record_id: savedRecordId,
                user_id: user!.id,
                cycle_id: currentCycle!.id,
                category: exp.category || 'Other',
                item_name: exp.name || 'Expense',
                amount: exp.amount,
                expense_date: selectedDate
              }));
              await supabase.from('expenses').insert(newExpenses);
            }
          } catch (err) {
            console.error('Failed to parse expenses:', err);
          }
        }

        const [aiQuote, tags] = await Promise.all([
          generateQuote(finalContent),
          extractTags(finalContent)
        ]);

        if (tags.length > 0) {
          for (const tag of tags) {
            addOrIncrementTag(tag, dim.id);
          }
        }

        if (aiQuote) {
          const quotePayload = { ai_quote: aiQuote };
          await supabase.from('records').update(quotePayload).eq('id', savedRecordId);
        }
      }

      if (isMilestone && defaultDimension) {
        await addMilestone({
          user_id: user!.id,
          event_date: selectedDate,
          event_title: `Milestone: Journal`,
          event_description: note,
          event_type: 'achievement',
          related_dimension_id: defaultDimension.id
        });
      }

      showCustomDialog('Success', 'AI records organized and saved!', () => {
        navigate('/');
      });
    } catch (err) {
      console.error('Save AI records failed:', err);
      showCustomDialog('Failed', 'Failed to save organized records.');
    }
  };



  return (
    <div className="h-[100dvh] bg-gray-50 flex justify-center font-sans text-gray-900 overflow-hidden">
      <div className="w-full max-w-md bg-white h-full relative shadow-xl flex flex-col">

        <header className="px-4 py-2 bg-white flex flex-col flex-shrink-0 relative z-10">
          <div className="flex items-center justify-between h-11">
            <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
              <ChevronLeft className="text-gray-700" size={24} />
            </Link>
            <h1 className="text-[20px] font-bold text-gray-800">Record</h1>
            <div className="w-10"></div>
          </div>
          <div className="flex justify-center items-center gap-2 pb-2">
            <span className="text-sm font-medium text-[#B8C5D0] bg-slate-50 px-3 py-1 rounded-full">
              {selectedDate}
            </span>
            <button
              onClick={() => dateInputRef.current?.showPicker()}
              className="p-1 cursor-pointer rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-blue-600"
            >
              <Calendar size={20} />
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="absolute opacity-0 pointer-events-none"
            />
          </div>
        </header>



        <main className="flex-1 overflow-y-auto bg-[#F9FAFB] p-4 flex flex-col gap-4">
          <div className="bg-white rounded-[12px] p-4 shadow-sm min-h-[55%] flex flex-col relative">
            <textarea
              className="w-full flex-1 resize-none border-none p-0 text-base text-gray-700 placeholder:text-gray-300 focus:ring-0 leading-relaxed bg-transparent"
              placeholder={`Pour your thoughts for today...`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <div className="flex gap-4 mt-6 pt-4 border-t border-gray-50">
              <button
                onClick={handleCapturePhoto}
                disabled={uploading}
                className="w-[48px] h-[48px] flex items-center justify-center rounded-[8px] bg-[#F3F4F6] text-gray-500 transition-all active:scale-95 hover:bg-gray-200 disabled:opacity-50"
              >
                <Camera size={24} />
              </button>
              <button
                onClick={handleVoiceRecord}
                className={cn(
                  "w-[48px] h-[48px] flex items-center justify-center rounded-[8px] transition-all active:scale-95",
                  isListening ? "bg-red-500 text-white" : "bg-[#F3F4F6] text-gray-500 hover:bg-gray-200"
                )}
              >
                <Mic size={24} />
              </button>
              <label className="w-[48px] h-[48px] flex items-center justify-center rounded-[8px] bg-[#F3F4F6] text-gray-500 transition-all active:scale-95 hover:bg-gray-200 cursor-pointer">
                <Paperclip size={24} />
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {/* 显示附件 */}
            {attachments.length > 0 && (
              <div className="mt-4 flex gap-2 flex-wrap">
                {attachments.map(att => (
                  <div key={att.id} className="relative">
                    <img src={att.file_url} alt={att.file_name} className="w-16 h-16 object-cover rounded" />
                    <button
                      onClick={() => deleteAttachment(att.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Display AI suggestions */}
            {record?.ai_suggestions && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-medium text-blue-800 mb-1">AI Suggestions:</p>
                <p className="text-xs text-blue-700 whitespace-pre-wrap">{record.ai_suggestions}</p>
              </div>
            )}
          </div>

          <div className="px-2 mt-2">
            <label className="flex items-center gap-2 cursor-pointer p-3 bg-white rounded-xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all mb-4">
              <input
                type="checkbox"
                checked={isMilestone}
                onChange={(e) => setIsMilestone(e.target.checked)}
                className="w-5 h-5 rounded text-amber-500 focus:ring-amber-400 focus:ring-offset-0 border-gray-300 transition-all bg-gray-50"
              />
              <span className="text-sm font-medium text-gray-800 flex items-center gap-2">
                <span className="text-amber-500 text-lg">🏆</span>
                Mark as Milestone
              </span>
            </label>

            <p className="text-[12px] text-gray-400 mb-2 font-medium">Today's Overview</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(overviewStatus).map(([key, isActive]) => (
                <div
                  key={key}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[12px] shadow-sm",
                    isActive
                      ? "bg-white border-green-200 text-gray-800"
                      : "bg-white border-gray-200 text-gray-400"
                  )}
                >
                  {isActive ? (
                    <CheckCircle2 size={14} className="text-green-500" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                  )}
                  {key}
                </div>
              ))}
            </div>
          </div>
        </main>

        <div
          className="bg-white px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t border-gray-100 flex gap-3 z-20 sticky bottom-0"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleSaveRecord}
            disabled={saving || analyzing}
            className="w-full h-14 rounded-full bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white font-bold shadow-lg hover:opacity-90 transition-all flex items-center justify-center"
          >
            {saving || analyzing ? 'Processing...' : 'Save & Organize'}
          </button>
        </div>

        {/* Custom Dialog */}
        {showDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-[12px] p-6 max-w-sm mx-4 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-3">{dialogConfig.title}</h3>
              <p className="text-sm text-gray-600 mb-6 whitespace-pre-wrap">{dialogConfig.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDialog(false)}
                  className="flex-1 h-10 rounded-[8px] border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                >
                  Close
                </button>
                {dialogConfig.onConfirm && (
                  <button
                    onClick={() => {
                      dialogConfig.onConfirm();
                      setShowDialog(false);
                    }}
                    className="flex-1 h-10 rounded-[8px] bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white font-medium"
                  >
                    Confirm
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <AIResultModal
          isOpen={showAIModal}
          items={parsedDimensions}
          availableDimensions={availableDimensions}
          onConfirm={handleConfirmAI}
          onCancel={() => setShowAIModal(false)}
          onSkip={handleSkipAI}
        />
      </div>
    </div>
  );
}
