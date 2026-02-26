import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Signal, Wifi, BatteryFull, ChevronLeft, Calendar, Camera, Mic, Paperclip, Bot, CheckCircle2 } from "lucide-react";
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

export default function Record() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentCycle } = useCycles(user?.id);
  const { dimensions } = useDimensions(user?.id);

  const [activeTab, setActiveTab] = useState(dimensions[0]?.dimension_name || "Work");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // 获取当前激活维度的ID
  const activeDimension = dimensions.find(d => d.dimension_name === activeTab);

  // 获取或保存记录
  const { record, saving, saveRecord } = useRecords({
    userId: user?.id,
    cycleId: currentCycle?.id,
    dimensionId: activeDimension?.id,
    date: selectedDate,
  });

  const [note, setNote] = useState(record?.content || "");
  const [isMilestone, setIsMilestone] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ title: '', message: '', onConfirm: () => { } });

  const { addMilestone } = useMilestones(user?.id);
  const { addOrIncrementTag } = useGrowthTags(user?.id);

  // 附件管理
  const { attachments, uploading, uploadImage, capturePhoto, deleteAttachment, loadAttachments } = useAttachments(record?.id, user?.id);

  // 语音识别
  const { transcript, isListening, isSupported: speechSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  // AI分析
  const { analyzing, result: aiResult, analyze, generateQuote, extractTags, clearResult } = useAIAnalysis(user?.id);

  // 当切换维度或日期时，更新 note
  useEffect(() => {
    setNote(record?.content || "");
    setIsMilestone(false);
  }, [record?.content, activeTab, selectedDate]);

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

  // Handle AI parsing
  const handleAIParse = async () => {
    if (!note.trim()) {
      showCustomDialog('Notice', 'Please enter content before AI parsing');
      return;
    }

    try {
      const result = await analyze(note, activeTab);
      showCustomDialog('AI Analysis Complete', result);
    } catch (error) {
      showCustomDialog('Error', error instanceof Error ? error.message : 'AI parsing failed');
    }
  };

  // Save current dimension record
  const handleSaveRecord = async () => {
    if (!note.trim()) {
      showCustomDialog('Notice', 'Please enter record content');
      return;
    }

    // Check if record exists and has content, and user modified it
    if (record?.content && record.content.trim() && note !== record.content) {
      // Show options dialog: Overwrite, Cancel, or Append
      const dialogElement = document.createElement('div');
      dialogElement.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      dialogElement.innerHTML = `
        <div class="bg-white rounded-[12px] p-6 max-w-sm mx-4 shadow-xl">
          <h3 class="text-lg font-bold text-gray-800 mb-3">Content Already Exists</h3>
          <p class="text-sm text-gray-600 mb-6">This record already has content. What would you like to do?</p>
          <div class="flex flex-col gap-2">
            <button id="overwrite-btn" class="w-full h-10 rounded-[8px] bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white font-medium">
              Overwrite
            </button>
            <button id="append-btn" class="w-full h-10 rounded-[8px] border border-gray-300 text-gray-700 font-medium hover:bg-gray-50">
              Append Content
            </button>
            <button id="cancel-btn" class="w-full h-10 rounded-[8px] border border-gray-300 text-gray-700 font-medium hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(dialogElement);

      // Handle button clicks
      const handleChoice = async (choice: 'overwrite' | 'append' | 'cancel') => {
        document.body.removeChild(dialogElement);

        if (choice === 'cancel') {
          return;
        }

        let finalContent = note;
        if (choice === 'append') {
          finalContent = record.content + '\n\n' + note;
        }

        const success = await saveRecord(finalContent, 'published');
        if (success) {
          if (isMilestone && activeDimension) {
            await addMilestone({
              user_id: user!.id,
              event_date: selectedDate,
              event_title: `Milestone: ${activeTab}`,
              event_description: finalContent,
              event_type: 'achievement',
              related_dimension_id: activeDimension.id
            });
          }

          // Generate AI quote and Extract Tags
          const [aiQuote, tags] = await Promise.all([
            generateQuote(finalContent),
            extractTags(finalContent)
          ]);

          if (tags.length > 0 && activeDimension) {
            for (const tag of tags) {
              addOrIncrementTag(tag, activeDimension.id);
            }
          }

          // Update record with AI suggestions and quote
          if ((aiResult || aiQuote) && activeDimension) {
            // @ts-ignore - Supabase type inference issue with update
            await supabase
              .from('records')
              .update({
                ai_suggestions: aiResult || record.ai_suggestions,
                ai_quote: aiQuote || record.ai_quote
              })
              .eq('id', record.id);
          }
          showCustomDialog('Success', `${activeTab} record saved!`);
        } else {
          showCustomDialog('Failed', 'Save failed, please try again');
        }
      };

      dialogElement.querySelector('#overwrite-btn')?.addEventListener('click', () => handleChoice('overwrite'));
      dialogElement.querySelector('#append-btn')?.addEventListener('click', () => handleChoice('append'));
      dialogElement.querySelector('#cancel-btn')?.addEventListener('click', () => handleChoice('cancel'));
    } else {
      // No existing content or content unchanged, save directly
      const success = await saveRecord(note, 'published');
      if (success) {
        if (isMilestone && activeDimension) {
          await addMilestone({
            user_id: user!.id,
            event_date: selectedDate,
            event_title: `Milestone: ${activeTab}`,
            event_description: note,
            event_type: 'achievement',
            related_dimension_id: activeDimension.id
          });
        }

        // Generate AI quote and Extract Tags
        const [aiQuote, tags] = await Promise.all([
          generateQuote(note),
          extractTags(note)
        ]);

        if (tags.length > 0 && activeDimension) {
          for (const tag of tags) {
            addOrIncrementTag(tag, activeDimension.id);
          }
        }

        // Update record with AI suggestions and quote
        if ((aiResult || aiQuote) && activeDimension) {
          // @ts-ignore - Supabase type inference issue with update
          await supabase
            .from('records')
            .update({
              ai_suggestions: aiResult,
              ai_quote: aiQuote
            })
            // @ts-ignore - Supabase type inference issue with return value
            .eq('id', (success as any)?.id || record?.id || 0);
        }
        showCustomDialog('Success', `${activeTab} record saved!`);
      } else {
        showCustomDialog('Failed', 'Save failed, please try again');
      }
    }
  };

  // Complete today's records
  const handleCompleteDay = () => {
    const completedCount = Object.values(overviewStatus).filter(Boolean).length;
    if (completedCount === dimensions.length) {
      showCustomDialog('Congratulations', 'All dimension records for today are complete!', () => {
        navigate('/');
      });
    } else {
      showCustomDialog('Notice', `${dimensions.length - completedCount} dimension(s) remaining`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center font-sans text-gray-900">
      <div className="w-full max-w-md bg-white min-h-screen relative shadow-xl overflow-hidden flex flex-col">
        <div className="h-12 w-full bg-white flex items-end justify-between px-6 pb-2 text-xs font-medium text-gray-900 z-10">
          <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
          <div className="flex gap-1.5 items-center">
            <Signal size={16} strokeWidth={2.5} />
            <Wifi size={16} strokeWidth={2.5} />
            <BatteryFull size={18} strokeWidth={2.5} />
          </div>
        </div>

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

        <div className="bg-white border-b border-gray-100 flex-shrink-0">
          <div className="flex overflow-x-auto no-scrollbar px-4 pb-3 pt-1 items-center gap-5">
            {dimensions.map((dim) => (
              <button
                key={dim.id}
                onClick={() => setActiveTab(dim.dimension_name)}
                className={cn(
                  "flex flex-col items-center flex-shrink-0 transition-colors",
                  activeTab === dim.dimension_name ? "text-gray-900 font-bold relative" : "text-gray-400 font-medium"
                )}
              >
                <span className="text-[14px]">{dim.dimension_name}</span>
                {activeTab === dim.dimension_name && (
                  <div className="absolute -bottom-3 w-6 h-0.5 bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto bg-[#F9FAFB] p-4 flex flex-col gap-4">
          <div className="bg-white rounded-[12px] p-4 shadow-sm min-h-[55%] flex flex-col relative">
            <textarea
              className="w-full flex-1 resize-none border-none p-0 text-base text-gray-700 placeholder:text-gray-300 focus:ring-0 leading-relaxed bg-transparent"
              placeholder={`Record today's ${activeTab} details...`}
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
              <button
                onClick={handleAIParse}
                disabled={analyzing}
                className="ml-auto px-4 h-[48px] flex items-center justify-center rounded-[8px] bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white font-medium shadow-sm active:scale-95 hover:opacity-90 disabled:opacity-50"
              >
                <Bot size={20} className="mr-2" />
                {analyzing ? 'Parsing...' : 'AI Parse'}
              </button>
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
                标记为里程碑 (Mark as Milestone)
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

        <div className="bg-white px-4 py-3 pb-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t border-gray-100 flex gap-3 z-20 sticky bottom-0">
          <button
            onClick={handleSaveRecord}
            disabled={saving}
            className="flex-1 h-12 rounded-[8px] relative flex items-center justify-center font-medium active:bg-gray-50 transition-colors group bg-white active:scale-[0.98]"
          >
            <div className="absolute inset-0 rounded-[8px] p-[2px] bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] -z-10 pointer-events-none">
              <div className="w-full h-full bg-white rounded-[6px]" />
            </div>
            <span className="bg-gradient-to-r from-[#7BA5D6] to-[#E08596] bg-clip-text text-transparent font-bold">
              {saving ? 'Saving...' : 'Save'}
            </span>
          </button>
          <button
            onClick={handleCompleteDay}
            className="flex-1 h-12 rounded-[8px] bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white font-bold shadow-lg shadow-blue-200/50 flex items-center justify-center active:brightness-95 transition-all active:scale-[0.98]"
          >
            Today Complete
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
      </div>
    </div>
  );
}
