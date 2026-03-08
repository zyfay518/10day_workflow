import React, { useEffect, useMemo, useState } from 'react';
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

const MAX_DURATION_SEC = 120;

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
  const { transcript, isListening, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();
  const { parseVoiceQuickEntry, classifyVoiceDimension, analyzing } = useAIAnalysis(user?.id);

  const [text, setText] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [draft, setDraft] = useState<VoiceParsedResult | null>(null);
  const [draftText, setDraftText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setText('');
    setSeconds(0);
    setDraft(null);
    setDraftText('');
    setMessage('');
    resetTranscript();
    if (isSupported) startListening();
  }, [open]);

  useEffect(() => {
    if (!transcript) return;
    setText(prev => (prev ? `${prev}\n${transcript}` : transcript));
    resetTranscript();
  }, [transcript]);

  useEffect(() => {
    if (!open || !isListening) return;
    const timer = setInterval(() => {
      setSeconds(prev => {
        const next = prev + 1;
        if (next >= MAX_DURATION_SEC) {
          stopListening();
          return MAX_DURATION_SEC;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [open, isListening]);

  const remain = useMemo(() => Math.max(0, MAX_DURATION_SEC - seconds), [seconds]);

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

  const handleParse = async () => {
    if (!text.trim()) return;
    const parsed = await parseVoiceQuickEntry(text);
    if (!parsed) {
      setMessage('解析失败，请重试');
      return;
    }
    setDraft(parsed);
    setDraftText(JSON.stringify(parsed, null, 2));
    await persistVoiceEntry('parsed_to_records_goals', parsed, 'confirmed');
  };

  const handleApplyParsed = async () => {
    if (!user?.id || !currentCycle?.id) return;

    try {
      setSaving(true);
      const payload = JSON.parse(draftText) as VoiceParsedResult;
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
      setMessage('已解析并写入记录/目标');
      setTimeout(() => onClose(), 600);
    } catch (e) {
      console.error(e);
      setMessage('确认写入失败，请检查 JSON 格式');
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
        setMessage('找不到维度配置，请先创建维度');
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
      setMessage('已保存到 Library');
      setTimeout(() => onClose(), 600);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-end justify-center">
      <div className="w-full max-w-md bg-white rounded-t-3xl p-4 pb-6 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-800">Voice Quick Capture</h3>
          <button onClick={() => { stopListening(); onClose(); }} className="p-2 rounded-full hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-500">{isListening ? 'Listening…' : 'Stopped'}</div>
          <div className="text-xs text-gray-500">{Math.floor(remain / 60)}:{String(remain % 60).padStart(2, '0')}</div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="语音转文字会显示在这里..."
          className="w-full h-40 p-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none"
        />

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => (isListening ? stopListening() : startListening())}
            className={`flex-1 h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${isListening ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {isListening ? <Square size={16} /> : <Mic size={16} />} {isListening ? 'Stop' : 'Resume'}
          </button>
          <button
            onClick={handleParse}
            disabled={saving || analyzing || !text.trim()}
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles size={16} /> 解析并确认
          </button>
          <button
            onClick={handleSaveLibrary}
            disabled={saving || analyzing || !text.trim()}
            className="flex-1 h-11 rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <BookOpen size={16} /> 直接存库
          </button>
        </div>

        {draft && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-600 mb-1">确认面板（可手动编辑 JSON）</p>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              className="w-full h-40 p-3 rounded-xl border border-gray-200 bg-gray-50 text-xs font-mono outline-none"
            />
            <button
              onClick={handleApplyParsed}
              disabled={saving}
              className="mt-2 w-full h-10 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-50"
            >
              一键确认写入记录/目标
            </button>
          </div>
        )}

        {message && <p className="mt-2 text-xs text-gray-500">{message}</p>}
      </div>
    </div>
  );
}
