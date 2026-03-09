import React, { useState, useEffect } from 'react';
import { SplitDimensionItem } from '../hooks/useAIAnalysis';
import { Bot, Check, X } from 'lucide-react';
import { useLocale } from '../hooks/useLocale';

interface AIResultModalProps {
    isOpen: boolean;
    items: SplitDimensionItem[];
    availableDimensions: string[];
    onConfirm: (items: SplitDimensionItem[]) => void;
    onCancel: () => void;
    onSkip: () => void;
}

export default function AIResultModal({ isOpen, items, availableDimensions, onConfirm, onCancel, onSkip }: AIResultModalProps) {
    const [editedItems, setEditedItems] = useState<SplitDimensionItem[]>([]);
    const { tr } = useLocale();

    useEffect(() => {
        if (isOpen) {
            setEditedItems(items);
        }
    }, [isOpen, items]);

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
                                        <option key={dim} value={dim}>{dim}</option>
                                    ))}
                                    {!availableDimensions.includes(item.dimension) && (
                                        <option value={item.dimension}>{item.dimension}</option>
                                    )}
                                </select>
                            </div>
                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                {item.content}
                            </p>
                        </div>
                    ))}

                    {editedItems.length === 0 && (
                        <p className="text-center text-gray-400 py-6 text-sm">
                            {tr('aimodal_empty',"AI couldn't extract any dimensions from your text.")}
                        </p>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-2">
                    <button
                        onClick={() => onConfirm(editedItems)}
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
