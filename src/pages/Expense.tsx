import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Signal, Wifi, BatteryFull, ArrowLeft, FileEdit, RefreshCw, Bot, Sparkles, Edit2, Trash2, PlusCircle, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { useCycles } from "../hooks/useCycles";
import { useDimensions } from "../hooks/useDimensions";
import { useRecords } from "../hooks/useRecords";
import { useExpenses } from "../hooks/useExpenses";
import { useAIAnalysis } from "../hooks/useAIAnalysis";

interface ExpenseItem {
  category: string;
  name: string;
  amount: number;
  icon?: string;
}

export default function Expense() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentCycle } = useCycles(user?.id);
  const { dimensions } = useDimensions(user?.id);

  const selectedDate = new Date().toISOString().split('T')[0];

  // Get "Expense" dimension
  const expenseDimension = dimensions.find(d => d.dimension_name === 'Expense');

  // 获取当前记录
  const { record, saveRecord } = useRecords({
    userId: user?.id,
    cycleId: currentCycle?.id,
    dimensionId: expenseDimension?.id,
    date: selectedDate,
  });

  // 费用管理
  const { saveExpenses } = useExpenses({
    userId: user?.id,
    startDate: selectedDate,
    endDate: selectedDate,
  });

  // AI分析
  const { analyzing, analyze, parseExpenseResult } = useAIAnalysis(user?.id);

  const [text, setText] = useState(record?.content || "");
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [parsed, setParsed] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  // 加载现有记录
  useEffect(() => {
    if (record?.content) {
      setText(record.content);
      // 如果有AI建议，尝试解析为表格数据
      if (record.ai_suggestions) {
        const parsed = parseExpenseResult(record.ai_suggestions);
        if (parsed.length > 0) {
          setItems(parsed);
          setParsed(true);
        }
      }
    }
  }, [record, parseExpenseResult]);

  // AI parsing
  const handleParse = async () => {
    if (!text.trim()) {
      showMessage("Please enter expense information");
      return;
    }

    try {
      const aiResult = await analyze(text, 'Expense');
      const parsedItems = parseExpenseResult(aiResult);

      if (parsedItems.length === 0) {
        showMessage("AI couldn't parse valid expense items, please check input format");
        return;
      }

      setItems(parsedItems);
      setParsed(true);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Parse failed");
    }
  };

  // 显示消息
  const showMessage = (message: string) => {
    setDialogMessage(message);
    setShowDialog(true);
  };

  // 编辑行
  const handleEdit = (index: number, field: keyof ExpenseItem, value: string | number) => {
    const newItems = [...items];
    if (field === 'amount') {
      newItems[index][field] = parseFloat(value as string) || 0;
    } else {
      newItems[index][field] = value as string;
    }
    setItems(newItems);
  };

  // 删除行
  const handleDelete = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Add empty row
  const handleAddRow = () => {
    setItems([...items, { category: 'Other', name: '', amount: 0, icon: 'receipt' }]);
    setEditingIndex(items.length);
  };

  // Save expense record
  const handleSave = async () => {
    if (!user || !currentCycle || !expenseDimension || !record) {
      showMessage("Missing required information, unable to save");
      return;
    }

    if (items.length === 0) {
      showMessage("Please parse expenses or manually add items first");
      return;
    }

    try {
      // 1. Save record text and AI suggestions
      await saveRecord(text, 'published');

      // 2. Save expense details
      const expenseInputs = items.map(item => ({
        recordId: record.id,
        userId: user.id,
        cycleId: currentCycle.id,
        category: item.category,
        itemName: item.name,
        amount: item.amount,
        expenseDate: selectedDate,
      }));

      await saveExpenses(expenseInputs);

      showMessage("Expense record saved!");

      // Delay navigation to Record page
      setTimeout(() => {
        navigate('/record');
      }, 1000);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Save failed");
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      <div className="h-12 w-full bg-white flex items-end justify-between px-6 pb-2 text-xs font-medium text-gray-900 z-10">
        <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
        <div className="flex gap-1.5 items-center">
          <Signal size={16} strokeWidth={2.5} />
          <Wifi size={16} strokeWidth={2.5} />
          <BatteryFull size={18} strokeWidth={2.5} />
        </div>
      </div>

      <header className="flex items-center justify-between py-3 bg-white px-5 sticky top-0 z-10">
        <Link to="/record" className="p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-[20px] font-bold text-gray-800">Record Expense</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 px-4 py-2 overflow-y-auto pb-24 hide-scrollbar">
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Quick Input</label>
          <div className="relative group">
            <textarea
              className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 text-[14px] text-gray-800 focus:ring-1 focus:ring-[#9DC5EF] focus:border-transparent outline-none resize-none transition-all placeholder-gray-400"
              placeholder="e.g., Lunch 50, Taxi 20, Books 120..."
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="absolute bottom-3 right-3 text-gray-300 pointer-events-none">
              <FileEdit size={20} />
            </div>
          </div>
          <button
            onClick={handleParse}
            disabled={analyzing || !text.trim()}
            className={cn(
              "mt-4 w-full bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white py-3.5 px-6 rounded-[8px] font-bold shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2 group",
              (analyzing || !text.trim()) && "opacity-70 cursor-not-allowed"
            )}
          >
            {analyzing ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              <Bot size={20} className="group-hover:rotate-12 transition-transform" />
            )}
            {analyzing ? "Parsing..." : "AI Smart Parse"}
          </button>
        </div>

        {parsed && items.length > 0 && (
          <div className="bg-white rounded-[12px] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="px-5 py-4 border-b border-gray-50 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-[#9DC5EF]" />
                <h2 className="font-bold text-gray-800 text-sm">AI Parse Result</h2>
              </div>
              <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100">{items.length} items</span>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[1.5fr_2fr_1.5fr_0.5fr] gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-600">
              <div>Category</div>
              <div>Item</div>
              <div>Amount</div>
              <div></div>
            </div>

            {/* Data Rows */}
            <div className="divide-y divide-gray-50">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-[1.5fr_2fr_1.5fr_0.5fr] gap-2 px-4 py-2 items-center hover:bg-gray-50">
                  {editingIndex === index ? (
                    <>
                      <input
                        type="text"
                        value={item.category}
                        onChange={(e) => handleEdit(index, 'category', e.target.value)}
                        onBlur={() => setEditingIndex(null)}
                        className="text-sm p-1 border border-gray-300 rounded"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleEdit(index, 'name', e.target.value)}
                        className="text-sm p-1 border border-gray-300 rounded"
                      />
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => handleEdit(index, 'amount', e.target.value)}
                        className="text-sm p-1 border border-gray-300 rounded"
                      />
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-gray-600">{item.category}</div>
                      <div className="text-sm font-medium text-gray-800 truncate">{item.name}</div>
                      <div className="text-sm font-bold text-gray-800">¥{item.amount.toFixed(2)}</div>
                    </>
                  )}
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingIndex(index)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 bg-gray-50/50 flex items-center justify-between border-t border-gray-100">
              <span className="text-sm font-medium text-gray-500">Total Amount</span>
              <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1]">¥{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            onClick={handleAddRow}
            className="text-sm text-gray-400 flex items-center justify-center gap-1 hover:text-gray-600 transition-colors"
          >
            <PlusCircle size={16} />
            Add Item Manually
          </button>
        </div>
      </main>

      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-100 px-5 py-4 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="text-xs text-gray-400">
            Period: <span className="text-gray-600 font-medium">Cycle {currentCycle?.cycle_number || 1}</span>
          </div>
          <div className="text-xs text-gray-400">
            Category: <span className="bg-[#D4A5A5]/20 text-[#D4A5A5] px-2 py-0.5 rounded-full font-medium ml-1">Expense</span>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={items.length === 0}
          className={cn(
            "w-full bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white text-[18px] font-bold py-3.5 rounded-[8px] shadow-lg shadow-[#FFB3C1]/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2",
            items.length === 0 && "opacity-50 cursor-not-allowed"
          )}
        >
          <CheckCircle2 size={20} />
          Confirm and Record
        </button>
      </div>

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[12px] p-6 max-w-sm mx-4 shadow-xl">
            <p className="text-sm text-gray-800 mb-6">{dialogMessage}</p>
            <button
              onClick={() => setShowDialog(false)}
              className="w-full h-10 rounded-[8px] bg-gradient-to-r from-[#9DC5EF] to-[#FFB3C1] text-white font-medium"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
