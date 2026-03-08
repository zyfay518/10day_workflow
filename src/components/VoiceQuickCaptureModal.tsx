import React, { useEffect, useState } from 'react';
import { X, Mic, Square, Sparkles, BookOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCycles } from '../hooks/useCycles';
import { useDimensions } from '../hooks/useDimensions';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.local';
import { useAIAnalysis, VoiceParsedResult } from '../hooks/useAIAnalysis';
import { supabase } from '../lib/supabase';
import { getLocalDateString } from '../lib/utils';

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
  const { currentCycle } = useCycles(user?.id);
  const { dimensions } = useDimensions(user?.id);
  const { transcript, liveTranscript, isListening, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const { parseVoiceQuickEntry, classifyVoiceDimension, analyzing } = useAIAnalysis(user?.id);

  const [text, setText] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [draft, setDraft] = useState<VoiceParsedResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setText('');
    setSeconds(0);
    setDraft(null);
    setMessage('');
    resetTranscript();

    const micGranted = localStorage.getItem('voice_quick_mic_granted') === '1';
    if (isSupported && micGranted) {
      startListening();
    }
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
    if (!user?.id) return;
    await supabase.from('voice_quick_entries' as any).insert({
      user_id: user.id,
      cycle_id: currentCycle?.id || null,
      source_page: sourcePage,
      transcript: text,
      duration_sec: seconds,
      parse_mode: mode,
      parse_result: parseResult || {},
      status,
    });
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

    const today = getLocalDateString();
    const tomorrowDate = new Date(today);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = getLocalDateString(tomorrowDate);

    const parsed = await parseVoiceQuickEntry(text, { currentDate: today, timezone: 'Asia/Singapore' });
    if (!parsed) {
      setMessage('Parsing failed. Please try again.');
      return;
    }

    const saysTomorrow = /明天/.test(text);
    const saysToday = /今天/.test(text);

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

    setDraft(parsed);
    await persistVoiceEntry('parsed_to_records_goals', parsed, 'confirmed');
  };

  const handleApplyParsed = async () => {
    if (!user?.id || !currentCycle?.id || !draft) return;

    try {
      setSaving(true);
      const payload = draft;
      const today = getLocalDateString();

      for (const rec of payload.records || []) {
        const dimensionId = mapDimensionId(dimensions, rec.dimension);
        if (!dimensionId || !rec.content?.trim()) continue;
        await supabase.from('records').insert({
          user_id: user.id,
          cycle_id: currentCycle.id,
          dimension_id: dimensionId,
          record_date: rec.record_date || today,
          content: rec.content,
          word_count: rec.content.length,
          status: 'published',
        });
      }

      for (const goal of payload.cycle_goals || []) {
        const dimensionId = mapDimensionId(dimensions, goal.dimension);
        if (!dimensionId || !goal.content?.trim()) continue;
        await supabase.from('cycle_goals').insert({
          user_id: user.id,
          cycle_id: currentCycle.id,
          dimension_id: dimensionId,
          content: goal.content,
          evaluation_criteria: goal.evaluation_criteria || 'Voice quick capture',
          target_type: goal.target_type || 'qualitative',
          target_value: goal.target_value ?? null,
          target_unit: goal.target_unit ?? null,
        });
      }

      for (const goal of payload.daily_goals || []) {
        const dimensionId = mapDimensionId(dimensions, goal.dimension);
        if (!dimensionId || !goal.content?.trim()) continue;
        await supabase.from('daily_goals').insert({
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
      }

      await persistVoiceEntry('parsed_to_records_goals', payload, 'applied');
      setMessage('Parsed and saved to records/goals.');
      setTimeout(() => onClose(), 600);
    } catch (e) {
      console.error(e);
      setMessage('Save failed. Please review and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLibrary = async () => {
    if (!user?.id || !currentCycle?.id || !text.trim()) return;

    try {
      setSaving(true);
      const dim = await classifyVoiceDimension(text);
      const dimensionId = mapDimensionId(dimensions, dim);
      const today = getLocalDateString();

      if (!dimensionId) {
        setMessage('No dimension configuration found. Please set up dimensions first.');
        return;
      }

      await supabase.from('knowledge_base').insert({
        user_id: user.id,
        cycle_id: currentCycle.id,
        dimension_id: dimensionId,
        record_date: today,
        content: text,
        media_urls: null,
      });

      await persistVoiceEntry('saved_to_library', { dimension: dim }, 'applied');
      setMessage('Saved to Library.');
      setTimeout(() => onClose(), 600);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/45 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-4 shadow-2xl border border-gray-100 font-['Inter','SF_Pro_Text',system-ui,sans-serif]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-800">Voice Quick Capture</h3>
          <button onClick={() => { stopListening(); onClose(); }} className="p-2 rounded-full hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-[#A8B6C8] animate-bounce' : 'bg-gray-300'}`} />
              <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-[#C7B6A6] animate-bounce [animation-delay:120ms]' : 'bg-gray-300'}`} />
              <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-[#D8AFAF] animate-bounce [animation-delay:240ms]' : 'bg-gray-300'}`} />
            </div>
            {isListening ? 'Listening' : 'Paused'}
          </div>
          <div className="text-xs text-gray-500">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</div>
        </div>

        <div className="w-full min-h-[140px] max-h-[220px] overflow-y-auto p-3 rounded-xl border border-gray-200 bg-gray-50 text-sm leading-relaxed">
          {text || liveTranscript ? (
            <>
              {text && <div className="text-gray-700 whitespace-pre-wrap">{text}</div>}
              {liveTranscript && <div className="text-blue-600 whitespace-pre-wrap">{liveTranscript}</div>}
            </>
          ) : (
            <span className="text-gray-400">Live transcript will appear here...</span>
          )}
        </div>

        {!draft && (
          <div className="mt-3 space-y-2">
            <button
              onClick={() => (isListening ? stopListening() : startListening())}
              className={`w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${isListening ? 'bg-[#E8E3DD] text-[#6D6A66]' : 'bg-[#EEF1F4] text-[#6D6A66]'}`}
            >
              {isListening ? <Square size={16} /> : <Mic size={16} />} {isListening ? 'Pause' : 'Start Listening'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleParse}
                disabled={saving || analyzing || !text.trim()}
                className="h-11 rounded-xl bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles size={16} /> Parse & Review
              </button>
              <button
                onClick={handleSaveLibrary}
                disabled={saving || analyzing || !text.trim()}
                className="h-11 rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <BookOpen size={16} /> Save to Library
              </button>
            </div>
          </div>
        )}

        {draft && (
          <div className="mt-3 space-y-3">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Summary</p>
              <textarea
                value={draft.summary || ''}
                onChange={(e) => setDraft(prev => prev ? { ...prev, summary: e.target.value } : prev)}
                className="w-full h-16 bg-white border border-gray-200 rounded-lg p-2 text-sm"
              />
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Records (editable)</p>
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

            {(draft.daily_goals || []).length > 0 && (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Daily Goals (editable date)</p>
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

            <button
              onClick={handleApplyParsed}
              disabled={saving}
              className="w-full h-10 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-50"
            >
Confirm & Save to Records/Goals
            </button>
          </div>
        )}

        {message && <p className="mt-2 text-xs text-gray-500">{message}</p>}
      </div>
    </div>
  );
}
