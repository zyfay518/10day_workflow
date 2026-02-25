/**
 * 开销管理 Hook (localStorage版本)
 *
 * 用于处理费用记录的保存、查询、删除
 */

import { useState, useCallback, useEffect } from 'react';
import { localExpenses } from '../lib/localStorage';
import { Database } from '../types/database';

type Expense = Database['public']['Tables']['expenses']['Row'];

interface ExpenseInput {
  recordId: number;
  userId: string;
  cycleId: number;
  category: string;
  itemName: string;
  amount: number;
  expenseDate: string;
}

export function useExpenses(params?: {
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载费用列表
  const loadExpenses = useCallback(() => {
    if (!params?.userId || !params?.startDate || !params?.endDate) return;

    setLoading(true);
    const list = localExpenses.getByDateRange(params.userId, params.startDate, params.endDate);
    setExpenses(list);
    setLoading(false);
  }, [params]);

  // 自动加载
  useEffect(() => {
    if (params?.userId && params?.startDate && params?.endDate) {
      loadExpenses();
    }
  }, [params, loadExpenses]);

  // 保存费用
  const saveExpense = useCallback(async (input: ExpenseInput): Promise<Expense> => {
    const expense = localExpenses.save({
      record_id: input.recordId,
      user_id: input.userId,
      cycle_id: input.cycleId,
      category: input.category,
      item_name: input.itemName,
      amount: input.amount,
      expense_date: input.expenseDate,
    });

    // 更新列表
    setExpenses(prev => [...prev, expense]);

    return expense;
  }, []);

  // 批量保存费用
  const saveExpenses = useCallback(
    async (inputs: ExpenseInput[]): Promise<Expense[]> => {
      const savedExpenses = inputs.map(input =>
        localExpenses.save({
          record_id: input.recordId,
          user_id: input.userId,
          cycle_id: input.cycleId,
          category: input.category,
          item_name: input.itemName,
          amount: input.amount,
          expense_date: input.expenseDate,
        })
      );

      // 更新列表
      setExpenses(prev => [...prev, ...savedExpenses]);

      return savedExpenses;
    },
    []
  );

  // 按日期范围查询
  const getExpensesByDateRange = useCallback((start: string, end: string): Expense[] => {
    if (!params?.userId) return [];
    return localExpenses.getByDateRange(params.userId, start, end);
  }, [params?.userId]);

  // 按类目统计
  const getTotalByCategory = useCallback((category: string): number => {
    return expenses.filter(e => e.category === category).reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // 计算总金额
  const getTotalAmount = useCallback((): number => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // 获取指定record的expenses
  const getByRecordId = useCallback((recordId: number): Expense[] => {
    return localExpenses.getByRecordId(recordId);
  }, []);

  return {
    expenses,
    loading,
    saveExpense,
    saveExpenses,
    getExpensesByDateRange,
    getTotalByCategory,
    getTotalAmount,
    getByRecordId,
    loadExpenses,
  };
}
