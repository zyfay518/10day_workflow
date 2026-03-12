import React, { useState, useEffect } from 'react';
import { IntentItem, SplitDimensionItem } from '../hooks/useAIAnalysis';
import { Bot, Check, X } from 'lucide-react';
import { useLocale } from '../hooks/useLocale';

interface AIResultModalProps {
    isOpen: boolean;
    items: SplitDimensionItem[];
    availableDimensions: string[];
    todoCandidates?: string[];
    goalCandidates?: string[];
    goalDimensionMap?: Record<string, string>;
    intentItems?: IntentItem[];
    onConfirm: (items: SplitDimensionItem[], selectedTodos: string[], selectedGoals: string[], selectedGoalDimensions: Record<string, string>) => void;
    onCancel: () => void;
    onSkip: () => void;
}

export default function AIResultModal({ isOpen, items, availableDimensions, todoCandidates = [], goalCandidates = [], goalDimensionMap = {}, intentItems = [], onConfirm, onCancel, onSkip }: AIResultModalProps) {
    const [editedItems, setEditedItems] = useState<SplitDimensionItem[]>([]);
    const [selectedTodos, setSelectedTodos] = useState<string[]>([]);
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
    const [selectedGoalDimensions, setSelectedGoalDimensions] = useState<Record<string, string>>({});
    const { tr, trDimension } = useLocale();

    useEffect(() => {
        if (isOpen) {
            setEditedItems(items);
            setSelectedTodos(todoCandidates);
            setSelectedGoals(goalCandidates);

            const nextGoalDims: Record<string, string> = {};
            goalCandidates.forEach((goal) => {
                nextGoalDims[goal] = goalDimensionMap[goal] || availableDimensions[0] || 'Other';
            });
            setSelectedGoalDimensions(nextGoalDims);
        }
    }, [isOpen, items, todoCandidates, goalCandidates, goalDimensionMap, availableDimensions]);

    if (!isOpen) return null;

    const handleDimensionChange = (index: number, newDimension: string) => {
        const newItems = [...editedItems];
        newItems[index].dimension = newDimension;
        setEditedItems(newItems);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bot className="text-white" size={24} />
                        <h2 className="text-white font-bold text-lg">{tr('aimodal_title','AI Dimension Split')}</h2>
                    </div>
                    <button onClick={onCancel} className="text-white hover:bg-white/20 p-1 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 bg-gray-50 flex flex-col gap-3">
                    <p className="text-sm text-gray-600 mb-2">
                        {tr('aimodal_desc','AI has organized your thoughts into dimensions. Adjust the categories if needed.')}
                    </p>

                    {editedItems.map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <select
                                    value={item.dimension}
                                    onChange={(e) => handleDimensionChange(idx, e.target.value)}
                                    className="bg-gray-100 text-sm font-medium rounded-lg px-2 py-1 outline-none text-gray-700 w-auto"
                                >
                                    {availableDimensions.map(dim => (
                                        <option key={dim} value={dim}>{trDimension(dim)}</option>
                                    ))}
                                    {!availableDimensions.includes(item.dimension) && (
                                        <option value={item.dimension}>{trDimension(item.dimension)}</option>
                                    )}
                                </select>
                            </div>
                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                {item.content}
                            </p>
                        </div>
                    ))}

                    {intentItems.length > 0 && (
                        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-semibold text-gray-500 mb-1">{tr('aimodal_intent_split', 'Intent split result')}</p>
                            <p className="text-xs text-gray-400">
                                goal: {intentItems.filter(i => i.type === 'goal').length} · record: {intentItems.filter(i => i.type === 'record').length} · todo: {intentItems.filter(i => i.type === 'todo').length}
                            </p>
                        </div>
                    )}

                    {goalCandidates.length > 0 && (
                        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-semibold text-gray-500 mb-2">{tr('aimodal_goal_detected', 'Detected Goals (confirm before add)')}</p>
                            <div className="space-y-2.5">
                                {goalCandidates.map((goal, idx) => {
                                    const checked = selectedGoals.includes(goal);
                                    return (
                                        <div key={`${goal}-${idx}`} className="rounded-lg border border-gray-100 p-2">
                                            <label className="flex items-start gap-2 text-sm text-gray-700">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedGoals(prev => [...prev, goal]);
                                                        } else {
                                                            setSelectedGoals(prev => prev.filter(t => t !== goal));
                                                        }
                                                    }}
                                                    className="mt-0.5"
                                                />
                                                <span>{goal}</span>
                                            </label>

                                            {checked && (
                                                <div className="mt-2 pl-6">
                                                    <select
                                                        value={selectedGoalDimensions[goal] || availableDimensions[0] || 'Other'}
                                                        onChange={(e) => setSelectedGoalDimensions(prev => ({ ...prev, [goal]: e.target.value }))}
                                                        className="w-full bg-gray-50 text-xs rounded-lg px-2 py-1.5 border border-gray-200 outline-none"
                                                    >
                                                        {availableDimensions.map(dim => (
                                                            <option key={dim} value={dim}>{trDimension(dim)}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {todoCandidates.length > 0 && (
                        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-semibold text-gray-500 mb-2">{tr('aimodal_todo_detected', 'Detected ToDo (confirm before add)')}</p>
                            <div className="space-y-2">
                                {todoCandidates.map((todo, idx) => {
                                    const checked = selectedTodos.includes(todo);
                                    return (
                                        <label key={`${todo}-${idx}`} className="flex items-start gap-2 text-sm text-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedTodos(prev => [...prev, todo]);
                                                    } else {
                                                        setSelectedTodos(prev => prev.filter(t => t !== todo));
                                                    }
                                                }}
                                                className="mt-0.5"
                                            />
                                            <span>{todo}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {editedItems.length === 0 && todoCandidates.length === 0 && goalCandidates.length === 0 && (
                        <p className="text-center text-gray-400 py-6 text-sm">
                            {tr('aimodal_empty',"AI couldn't extract any dimensions from your text.")}
                        </p>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-2">
                    <button
                        onClick={() => onConfirm(editedItems, selectedTodos, selectedGoals, selectedGoalDimensions)}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                        <Check size={20} /> {tr('aimodal_confirm', 'Confirm Save')}
                    </button>

                    <button
                        onClick={onSkip}
                        className="w-full h-10 rounded-lg text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                        {tr('aimodal_skip','Skip AI & Save as General Text')}
                    </button>
                </div>
            </div>
        </div>
    );
}
