import React, { useEffect, useState } from 'react';
import { X, Mic, Square, Sparkles, BookOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCycles } from '../hooks/useCycles';
import { useDimensions } from '../hooks/useDimensions';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.local';
import { useAIAnalysis, VoiceParsedResult } from '../hooks/useAIAnalysis';
import { supabase } from '../lib/supabase';
import { getLocalDateString } from '../lib/utils';
import { useLocale } from '../hooks/useLocale';

interface Props {
  open: boolean;
  onClose: () => void;
  sourcePage?: string;
}


function mapDimensionId(dimensions: { id: number; dimension_name: string }[], aiDim?: string) {
  const key = (aiDim || '').toLowerCase();
  const byKey = dimensions.find(d => {
    const name = d.dimension_name.toLowerCase();
    if (key.includes('health')) return name.includes('health') || name.includes('健康');
    if (key.includes('work')) return name.includes('work') || name.includes('工作');
    if (key.includes('study')) return name.includes('study') || name.includes('阅读') || name.includes('学习');
    if (key.includes('wealth')) return name.includes('wealth') || name.includes('开销') || name.includes('财');
    if (key.includes('family')) return name.includes('family') || name.includes('家');
    return name.includes('other') || name.includes('其他');
  });
  return byKey?.id ?? dimensions[0]?.id;
}

export default function VoiceQuickCaptureModal({ open, onClose, sourcePage = 'home' }: Props) {
  const { user } = useAuth();
  const { tr, trDimension } = useLocale();
  const { currentCycle } = useCycles(user?.id);
  const { dimensions } = useDimensions(user?.id);
  const { transcript, liveTranscript, isListening, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const { parseVoiceQuickEntry, classifyVoiceDimension, analyzing } = useAIAnalysis(user?.id);

  const [text, setText] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [draft, setDraft] = useState<VoiceParsedResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSavingLibrary, setIsSavingLibrary] = useState(false);
  const [libDimensionId, setLibDimensionId] = useState<number | null>(null);
  const [libDimensions, setLibDimensions] = useState<{ id: number; dimension_name: string }[]>([]);
  const [draftRowId, setDraftRowId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setText('');
    setSeconds(0);
    setDraft(null);
    setDraftRowId(null);
    setLibDimensionId(null);
    setLibDimensions([]);
    setMessage('');
    resetTranscript();

    const autoStartIfGranted = async () => {
      if (!isSupported) return;
      const micGranted = localStorage.getItem('voice_quick_mic_granted') === '1';
      if (!micGranted) return;

      try {
        const nav: any = navigator as any;
        if (nav?.permissions?.query) {
          const status = await nav.permissions.query({ name: 'microphone' as PermissionName });
          // only auto-start when browser already has persistent grant
          if (status.state === 'granted') {
            startListening();
          }
          return;
        }
      } catch {
        // ignore and fallback
      }

      // Fallback for browsers without Permissions API:
      // do NOT auto-request to avoid repeated permission prompts
    };

    autoStartIfGranted();
  }, [open]);

  useEffect(() => {
    if (!transcript) return;
    setText(prev => (prev ? `${prev}\n${transcript}` : transcript));
    resetTranscript();
  }, [transcript]);

  useEffect(() => {
    if (isListening) {
      localStorage.setItem('voice_quick_mic_granted', '1');
    }
  }, [isListening]);

  useEffect(() => {
    if (!open || !isListening) return;
    const timer = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [open, isListening]);

  const persistVoiceEntry = async (mode: 'parsed_to_records_goals' | 'saved_to_library', parseResult: any, status: 'confirmed' | 'applied') => {
    if (!user?.id) return null;
    const { data } = await supabase
      .from('voice_quick_entries' as any)
      .insert({
        user_id: user.id,
        cycle_id: currentCycle?.id || null,
        source_page: sourcePage,
        transcript: text,
        duration_sec: seconds,
        parse_mode: mode,
        parse_result: parseResult || {},
        status,
      })
      .select('id')
      .single();

    return data?.id ?? null;
  };

  const normalizeDate = (value: string | undefined, fallback: string) => {
    if (!value) return fallback;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return fallback;
    const year = d.getFullYear();
    const nowYear = new Date(fallback).getFullYear();
    if (year < nowYear - 1 || year > nowYear + 1) return fallback;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const handleParse = async () => {
    if (!text.trim()) return;

    try {
      setIsParsing(true);
      setMessage('');

      const today = getLocalDateString();
      const tomorrowDate = new Date(today);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = getLocalDateString(tomorrowDate);

      const parsed = await parseVoiceQuickEntry(text, { currentDate: today, timezone: 'Asia/Singapore' });
      if (!parsed) {
        setMessage(tr('voice_msg_parse_failed', 'Parsing failed. Please try again.'));
        return;
      }

      const saysTomorrow = /明天/.test(text);
      const saysToday = /今天/.test(text);
      const saysCycleGoal = /(本周期|这个周期|这周期|本轮|这十天|10天|周期目标|本周目标|长期目标)/.test(text);

      parsed.daily_goals = (parsed.daily_goals || []).map((g) => ({
        ...g,
        goal_date: saysTomorrow
          ? tomorrow
          : saysToday
            ? today
            : normalizeDate(g.goal_date, today),
      }));

      parsed.records = (parsed.records || []).map((r) => ({
        ...r,
        record_date: normalizeDate(r.record_date, today),
      }));

      parsed.expenses = (parsed.expenses || []).map((e) => ({
        ...e,
        expense_date: normalizeDate(e.expense_date, today),
      }));

      // Heuristic guard: explicit cycle intent must produce at least one cycle goal
      if (saysCycleGoal && (!parsed.cycle_goals || parsed.cycle_goals.length === 0)) {
        const sentence = text
          .split(/[。！!？?\n]/)
          .map(s => s.trim())
          .find(s => /(本周期|这个周期|这周期|本轮|这十天|10天|周期目标|本周目标|长期目标)/.test(s));

        const seed = sentence
          || (parsed.daily_goals && parsed.daily_goals[0]?.content)
          || (parsed.records && parsed.records[0]?.content)
          || parsed.summary
          || text;

        parsed.cycle_goals = [{
          dimension: parsed.dimension || 'Other',
          content: seed,
          evaluation_criteria: 'Voice quick capture cycle goal',
          target_type: 'qualitative',
          target_value: null,
          target_unit: null,
        }];
      }

      setDraft(parsed);
      const voiceEntryId = await persistVoiceEntry('parsed_to_records_goals', parsed, 'confirmed');

      if (voiceEntryId && user?.id) {
        const { data } = await supabase
          .from('voice_parsed_drafts' as any)
          .upsert({
            voice_entry_id: voiceEntryId,
            user_id: user.id,
            draft_payload: parsed,
            confirmed: false,
            applied: false,
          }, { onConflict: 'voice_entry_id' })
          .select('id')
          .single();

        setDraftRowId(data?.id ?? null);
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyParsed = async () => {
    if (!user?.id || !draft) return;
    if (!currentCycle?.id) {
      setMessage(tr('voice_msg_cycle_missing', 'Current cycle is missing. Please refresh Home first.'));
      return;
    }
    if (!dimensions || dimensions.length === 0) {
      setMessage(tr('voice_msg_dim_not_ready', 'Dimensions are not ready. Please reopen this panel in 1-2 seconds.'));
      return;
    }

    try {
      setSaving(true);
      const payload = draft;
      const today = getLocalDateString();
      let savedRecords = 0;
      let savedCycleGoals = 0;
      let savedDailyGoals = 0;

      for (const rec of payload.records || []) {
        const dimensionId = mapDimensionId(dimensions, rec.dimension);
        if (!dimensionId || !rec.content?.trim()) continue;
        const { error } = await supabase.from('records').insert({
          user_id: user.id,
          cycle_id: currentCycle.id,
          dimension_id: dimensionId,
          record_date: rec.record_date || today,
          content: rec.content,
          word_count: rec.content.length,
          status: 'published',
        });
        if (!error) savedRecords++;
      }

      for (const goal of payload.cycle_goals || []) {
        const dimensionId = mapDimensionId(dimensions, goal.dimension);
        if (!dimensionId || !goal.content?.trim()) continue;
        const { error } = await supabase.from('cycle_goals').insert({
          user_id: user.id,
          cycle_id: currentCycle.id,
          dimension_id: dimensionId,
          content: goal.content,
          evaluation_criteria: goal.evaluation_criteria || 'Voice quick capture',
          target_type: goal.target_type || 'qualitative',
          target_value: goal.target_value ?? null,
          target_unit: goal.target_unit ?? null,
        });
        if (!error) savedCycleGoals++;
      }

      for (const goal of payload.daily_goals || []) {
        const dimensionId = mapDimensionId(dimensions, goal.dimension);
        if (!dimensionId || !goal.content?.trim()) continue;
        const { error } = await supabase.from('daily_goals').insert({
          user_id: user.id,
          cycle_id: currentCycle.id,
          goal_date: goal.goal_date || today,
          dimension_id: dimensionId,
          content: goal.content,
          evaluation_criteria: goal.evaluation_criteria || 'Voice quick capture',
          target_type: goal.target_type || 'qualitative',
          target_value: goal.target_value ?? null,
          target_unit: goal.target_unit ?? null,
        });
        if (!error) savedDailyGoals++;
      }

      await persistVoiceEntry('parsed_to_records_goals', payload, 'applied');

      if (draftRowId && user?.id) {
        await supabase
          .from('voice_parsed_drafts' as any)
          .update({ confirmed: true, applied: true, draft_payload: payload })
          .eq('id', draftRowId)
          .eq('user_id', user.id);
      }

      setMessage(`Saved: records ${savedRecords}, cycle goals ${savedCycleGoals}, daily goals ${savedDailyGoals}.`);
      setTimeout(() => onClose(), 600);
    } catch (e) {
      console.error(e);
      setMessage(tr('voice_msg_save_failed', 'Save failed. Please review and try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLibrary = async () => {
    if (!user?.id || !text.trim()) {
      setMessage(tr('voice_msg_save_failed', 'Save failed. Please review and try again.'));
      return;
    }

    try {
      setSaving(true);
      setIsSavingLibrary(true);
      setMessage('');

      let workingDimensions = dimensions;
      if (!workingDimensions || workingDimensions.length === 0) {
        const { data: dimRows } = await supabase
          .from('dimensions')
          .select('id, dimension_name')
          .eq('user_id', user.id)
          .order('display_order', { ascending: true });
        workingDimensions = (dimRows as any[]) || [];
      }

      if (!workingDimensions || workingDimensions.length === 0) {
        setMessage(tr('voice_msg_no_dimension', 'No dimension configuration found. Please set up dimensions first.'));
        return;
      }

      const dim = await classifyVoiceDimension(text);
      let detectedId = mapDimensionId((workingDimensions || []) as any, dim);

      if (!detectedId) {
        detectedId = workingDimensions[0]?.id;
      }
      if (!detectedId) {
        setMessage(tr('voice_msg_no_dimension', 'No dimension configuration found. Please set up dimensions first.'));
        return;
      }

      setLibDimensions(workingDimensions as any);
      setLibDimensionId(detectedId);
      setMessage(tr('voice_msg_dim_detected', `Detected dimension: ${dim || 'Other'}. You can adjust it before confirming save.`));
    } catch (e: any) {
      console.error(e);
      const detail = e?.message ? ` (${e.message})` : '';
      setMessage(`${tr('voice_msg_save_failed', 'Save failed. Please review and try again.')}${detail}`);
    } finally {
      setIsSavingLibrary(false);
      setSaving(false);
    }
  };

  const handleConfirmSaveLibrary = async () => {
    if (!user?.id || !text.trim() || !libDimensionId) return;

    try {
      setSaving(true);
      setIsSavingLibrary(true);
      setMessage('');

      const today = getLocalDateString();
      let cycleId = currentCycle?.id ?? null;
      if (!cycleId) {
        const { data: matchedCycle } = await supabase
          .from('cycles')
          .select('id')
          .eq('user_id', user.id)
          .lte('start_date', today)
          .gte('end_date', today)
          .order('cycle_number', { ascending: false })
          .limit(1)
          .maybeSingle();
        cycleId = matchedCycle?.id ?? null;
      }

      const { error } = await supabase.from('knowledge_base').insert({
        user_id: user.id,
        cycle_id: cycleId,
        dimension_id: libDimensionId,
        record_date: today,
        content: text,
        media_urls: null,
      });
      if (error) throw error;

      await persistVoiceEntry('saved_to_library', { dimension_id: libDimensionId }, 'applied');
      setMessage(tr('voice_msg_saved_library', 'Saved to Library.'));
      setTimeout(() => onClose(), 600);
    } catch (e: any) {
      console.error(e);
      const detail = e?.message ? ` (${e.message})` : '';
      setMessage(`${tr('voice_msg_save_failed', 'Save failed. Please review and try again.')}${detail}`);
    } finally {
      setIsSavingLibrary(false);
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/45 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-4 shadow-2xl border border-gray-100 font-['Inter','SF_Pro_Text',system-ui,sans-serif] max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <h3 className="text-base font-bold text-gray-800">{tr('voice_title', 'Voice Quick Capture')}</h3>
          <button onClick={() => { stopListening(); onClose(); }} className="p-2 rounded-full hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-[#A8B6C8] animate-bounce' : 'bg-gray-300'}`} />
              <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-[#C7B6A6] animate-bounce [animation-delay:120ms]' : 'bg-gray-300'}`} />
              <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-[#D8AFAF] animate-bounce [animation-delay:240ms]' : 'bg-gray-300'}`} />
            </div>
            {isListening ? tr('voice_listening', 'Listening') : tr('voice_paused', 'Paused')}
          </div>
          <div className="text-xs text-gray-500">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</div>
        </div>

        <div className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tr('voice_live_placeholder', 'Live transcript will appear here... You can edit manually.')}
            className="w-full min-h-[140px] max-h-[220px] p-2 bg-white border border-gray-200 rounded-lg text-sm leading-relaxed text-gray-700 outline-none resize-y"
          />
          {liveTranscript && (
            <div className="mt-2 px-2 py-1.5 rounded-md bg-blue-50 text-blue-600 text-xs whitespace-pre-wrap">
              Listening: {liveTranscript}
            </div>
          )}
        </div>

        {!draft && (
          <div className="mt-3 space-y-2">
            <button
              onClick={() => (isListening ? stopListening() : startListening())}
              className={`w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${isListening ? 'bg-[#E8E3DD] text-[#6D6A66]' : 'bg-[#EEF1F4] text-[#6D6A66]'}`}
            >
              {isListening ? <Square size={16} /> : <Mic size={16} />} {isListening ? tr('voice_pause', 'Pause') : tr('voice_start_listening', 'Start Listening')}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleParse}
                disabled={saving || analyzing || isParsing || !text.trim()}
                className="h-11 rounded-xl bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isParsing ? (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/95 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/95 animate-bounce [animation-delay:120ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/95 animate-bounce [animation-delay:240ms]" />
                    </span>
                    {tr('voice_parsing', 'Parsing...')}
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> {tr('voice_parse_review', 'Parse & Review')}
                  </>
                )}
              </button>
              <button
                onClick={handleSaveLibrary}
                disabled={saving || analyzing || isParsing || isSavingLibrary || !text.trim()}
                className="h-11 rounded-xl bg-gradient-to-r from-[#C7B6A6] to-[#D8AFAF] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingLibrary ? (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600/90 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600/90 animate-bounce [animation-delay:120ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600/90 animate-bounce [animation-delay:240ms]" />
                    </span>
                    {tr('voice_saving_library', 'Saving...')}
                  </>
                ) : (
                  <>
                    <BookOpen size={16} /> {tr('voice_save_library_oneclick', 'One-click Save to Library')}
                  </>
                )}
              </button>
            </div>

            {libDimensionId && (
              <div className="mt-2 p-2 rounded-lg border border-blue-100 bg-blue-50/40 space-y-2">
                <select
                  value={libDimensionId}
                  onChange={(e) => setLibDimensionId(Number(e.target.value))}
                  className="w-full h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm"
                >
                  {libDimensions.map((d) => (
                    <option key={d.id} value={d.id}>{trDimension(d.dimension_name)}</option>
                  ))}
                </select>
                <button
                  onClick={handleConfirmSaveLibrary}
                  disabled={saving || isSavingLibrary}
                  className="w-full h-10 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {isSavingLibrary ? tr('voice_saving_library', 'Saving...') : tr('voice_save_library', 'Save to Library')}
                </button>
              </div>
            )}
          </div>
        )}

        {draft && (
          <div className="mt-3 space-y-3">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">{tr('voice_summary', 'Summary')}</p>
              <textarea
                value={draft.summary || ''}
                onChange={(e) => setDraft(prev => prev ? { ...prev, summary: e.target.value } : prev)}
                className="w-full h-16 bg-white border border-gray-200 rounded-lg p-2 text-sm"
              />
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-2">{tr('voice_records_editable', 'Records (editable)')}</p>
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {(draft.records || []).map((r, i) => (
                  <textarea
                    key={i}
                    value={r.content}
                    onChange={(e) => setDraft(prev => {
                      if (!prev) return prev;
                      const next = [...(prev.records || [])];
                      next[i] = { ...next[i], content: e.target.value };
                      return { ...prev, records: next };
                    })}
                    className="w-full h-16 bg-white border border-gray-200 rounded-lg p-2 text-sm"
                  />
                ))}
              </div>
            </div>

            {(draft.cycle_goals || []).length > 0 && (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-500 mb-2">{tr('voice_cycle_goals_editable', 'Cycle Goals (editable)')}</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(draft.cycle_goals || []).map((g, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-2">
                      <textarea
                        value={g.content}
                        onChange={(e) => setDraft(prev => {
                          if (!prev) return prev;
                          const next = [...(prev.cycle_goals || [])];
                          next[i] = { ...next[i], content: e.target.value };
                          return { ...prev, cycle_goals: next };
                        })}
                        className="w-full h-14 text-sm border border-gray-200 rounded p-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(draft.daily_goals || []).length > 0 && (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-500 mb-2">{tr('voice_daily_goals_editable', 'Daily Goals (editable date)')}</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(draft.daily_goals || []).map((g, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-2">
                      <input
                        type="date"
                        value={g.goal_date || ''}
                        onChange={(e) => setDraft(prev => {
                          if (!prev) return prev;
                          const next = [...(prev.daily_goals || [])];
                          next[i] = { ...next[i], goal_date: e.target.value };
                          return { ...prev, daily_goals: next };
                        })}
                        className="w-full text-xs border border-gray-200 rounded px-2 py-1 mb-2"
                      />
                      <textarea
                        value={g.content}
                        onChange={(e) => setDraft(prev => {
                          if (!prev) return prev;
                          const next = [...(prev.daily_goals || [])];
                          next[i] = { ...next[i], content: e.target.value };
                          return { ...prev, daily_goals: next };
                        })}
                        className="w-full h-14 text-sm border border-gray-200 rounded p-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDraft(null)}
                disabled={saving}
                className="h-10 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold disabled:opacity-50"
              >
                {tr('common_back_edit', 'Back to Edit')}
              </button>
              <button
                onClick={handleApplyParsed}
                disabled={saving}
                className="h-10 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-50"
              >
                {tr('voice_confirm_save', 'Confirm & Save to Records/Goals')}
              </button>
            </div>
          </div>
        )}
        </div>

        {message && <p className="mt-2 text-xs text-gray-500 flex-shrink-0">{message}</p>}
      </div>
    </div>
  );
}
