/**
 * useExpenses Hook - 费用管理
 *
 * 功能:
 * - 查询费用记录
 * - 解析费用文本 (调用 Gemini AI)
 * - 保存费用记录
 *
 * 参考: DATA_FLOW.md "3.3 Expense Parsing 页面"
 */

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { parseExpense } from '../lib/gemini';
import { Database } from '../types/database';

type Expense = Database['public']['Tables']['expenses']['Row'];
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];

interface ParsedExpense {
  amount: number;
  category: string;
  merchant?: string;
  date?: string;
}

interface UseExpensesReturn {
  parsing: boolean;
  saving: boolean;
  error: string | null;
  parseExpenseText: (text: string) => Promise<ParsedExpense | null>;
  saveExpense: (expense: ExpenseInsert) => Promise<boolean>;
}

export function useExpenses(userId?: string): UseExpensesReturn {
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 解析费用文本
   *
   * 调用 Gemini AI 提取:
   * - 金额
   * - 类目
   * - 商户 (可选)
   * - 日期 (可选)
   *
   * @param text - 费用描述文本
   * @returns 解析结果
   */
  const parseExpenseText = async (text: string): Promise<ParsedExpense | null> => {
    try {
      setParsing(true);
      setError(null);

      const result = await parseExpense(text);

      if (!result || result.length === 0) {
        throw new Error('Failed to parse expense from text');
      }

      // 返回第一个解析结果
      const firstItem = result[0];
      return {
        amount: firstItem.amount,
        category: firstItem.category,
        merchant: firstItem.name,
        date: undefined, // Gemini 不提取日期,使用当前日期
      };
    } catch (err) {
      console.error('Failed to parse expense:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setParsing(false);
    }
  };

  /**
   * 保存费用记录
   *
   * @param expense - 费用数据
   * @returns 是否成功
   */
  const saveExpense = async (expense: ExpenseInsert): Promise<boolean> => {
    if (!userId) {
      setError('User not authenticated');
      return false;
    }

    try {
      setSaving(true);
      setError(null);

      const { error: insertError } = await supabase.from('expenses').insert({
        ...expense,
        user_id: userId,
      });

      if (insertError) throw insertError;

      return true;
    } catch (err) {
      console.error('Failed to save expense:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    parsing,
    saving,
    error,
    parseExpenseText,
    saveExpense,
  };
}
