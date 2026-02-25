/**
 * 本地存储数据层 - 用于开发测试
 *
 * 模拟后端数据库功能，数据存储在 localStorage
 * 完成测试后可以无缝切换到 Supabase
 */

import { Database } from '../types/database';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type Dimension = Database['public']['Tables']['dimensions']['Row'];
type Cycle = Database['public']['Tables']['cycles']['Row'];
type Record = Database['public']['Tables']['records']['Row'];
type Expense = Database['public']['Tables']['expenses']['Row'];
type RecordAttachment = Database['public']['Tables']['record_attachments']['Row'];
type CycleGoal = Database['public']['Tables']['cycle_goals']['Row'];
type DailyGoal = Database['public']['Tables']['daily_goals']['Row'];
type GoalEvaluation = Database['public']['Tables']['goal_evaluations']['Row'];

type KnowledgeBase = Database['public']['Tables']['knowledge_base']['Row'];
type Report = Database['public']['Tables']['reports']['Row'];

// ==================== 存储 Key 定义 ====================
const STORAGE_KEYS = {
  CURRENT_USER: 'current_user',
  USER_PROFILES: 'user_profiles',
  DIMENSIONS: 'dimensions',
  CYCLES: 'cycles',
  RECORDS: 'records',
  EXPENSES: 'expenses',
  ATTACHMENTS: 'attachments',
  READING_BOOKS: 'reading_books',
  CYCLE_GOALS: 'cycle_goals',
  DAILY_GOALS: 'daily_goals',
  GOAL_EVALUATIONS: 'goal_evaluations',
  KNOWLEDGE_BASE: 'knowledge_base',
  REPORTS: 'reports',
  WEIGHT_RECORDS: 'weight_records',
} as const;

// ==================== 通用工具函数 ====================

function getFromStorage<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Failed to read ${key} from localStorage:`, error);
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error);
  }
}

function generateId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

// ==================== 用户认证 ====================

export const localAuth = {
  /**
   * 模拟登录（自动注册）
   */
  login(phone: string): { user: { id: string; phone: string } } {
    const userId = `user_${phone.replace(/\D/g, '')}`;
    const user = { id: userId, phone };

    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));

    // 自动创建用户档案
    const profiles = getFromStorage<UserProfile>(STORAGE_KEYS.USER_PROFILES);
    if (!profiles.find(p => p.user_id === userId)) {
      profiles.push({
        id: generateId(),
        user_id: userId,
        nickname: `用户${phone.slice(-4)}`,
        avatar_url: null,
        password: null,
        ai_api_key: null,
        ai_service_provider: null,
        ai_prompts: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      saveToStorage(STORAGE_KEYS.USER_PROFILES, profiles);
    }

    return { user };
  },

  /**
   * 获取当前用户
   */
  getCurrentUser(): { id: string; phone: string } | null {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  /**
   * 登出
   */
  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },
};

// ==================== 用户档案 ====================

export const localUserProfile = {
  get(userId: string): UserProfile | null {
    const profiles = getFromStorage<UserProfile>(STORAGE_KEYS.USER_PROFILES);
    return profiles.find(p => p.user_id === userId) || null;
  },

  update(userId: string, updates: Partial<UserProfile>): boolean {
    const profiles = getFromStorage<UserProfile>(STORAGE_KEYS.USER_PROFILES);
    const index = profiles.findIndex(p => p.user_id === userId);

    if (index === -1) return false;

    profiles[index] = {
      ...profiles[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    saveToStorage(STORAGE_KEYS.USER_PROFILES, profiles);
    return true;
  },
};

// ==================== 维度配置 ====================

export const localDimensions = {
  getAll(userId: string): Dimension[] {
    const dimensions = getFromStorage<Dimension>(STORAGE_KEYS.DIMENSIONS);
    return dimensions.filter(d => d.user_id === userId);
  },

  update(dimensionId: number, updates: Partial<Dimension>): boolean {
    const dimensions = getFromStorage<Dimension>(STORAGE_KEYS.DIMENSIONS);
    const index = dimensions.findIndex(d => d.id === dimensionId);

    if (index === -1) return false;

    dimensions[index] = {
      ...dimensions[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    saveToStorage(STORAGE_KEYS.DIMENSIONS, dimensions);
    return true;
  },
};

// ==================== 周期管理 ====================

export const localCycles = {
  getAll(userId: string): Cycle[] {
    const cycles = getFromStorage<Cycle>(STORAGE_KEYS.CYCLES);
    return cycles.filter(c => c.user_id === userId).sort((a, b) => a.cycle_number - b.cycle_number);
  },

  getCurrent(userId: string): Cycle | null {
    const cycles = this.getAll(userId);
    return cycles.find(c => c.status === 'active') || cycles[0] || null;
  },

  updateCompletionRate(cycleId: number): void {
    const cycles = getFromStorage<Cycle>(STORAGE_KEYS.CYCLES);
    const records = getFromStorage<Record>(STORAGE_KEYS.RECORDS);
    const dimensions = getFromStorage<Dimension>(STORAGE_KEYS.DIMENSIONS);

    const cycleIndex = cycles.findIndex(c => c.id === cycleId);
    if (cycleIndex === -1) return;

    const cycle = cycles[cycleIndex];
    const cycleRecords = records.filter(r => r.cycle_id === cycleId);
    const dimensionCount = dimensions.filter(d => d.user_id === cycle.user_id).length;

    // 计算完成度: (已记录天数 / 总天数) * 100
    const totalDays = cycle.total_days * dimensionCount;
    const completedDays = cycleRecords.filter(r => r.status === 'published').length;
    const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

    cycles[cycleIndex].completion_rate = completionRate;
    cycles[cycleIndex].updated_at = new Date().toISOString();

    saveToStorage(STORAGE_KEYS.CYCLES, cycles);
  },
};

// ==================== 记录管理 ====================

export const localRecords = {
  get(params: {
    userId: string;
    cycleId: number;
    dimensionId: number;
    date: string;
  }): Record | null {
    const records = getFromStorage<Record>(STORAGE_KEYS.RECORDS);
    return records.find(
      r =>
        r.user_id === params.userId &&
        r.cycle_id === params.cycleId &&
        r.dimension_id === params.dimensionId &&
        r.record_date === params.date
    ) || null;
  },

  save(
    params: {
      userId: string;
      cycleId: number;
      dimensionId: number;
      date: string;
    },
    content: string,
    status: 'draft' | 'published' = 'published',
    aiSuggestions?: string | null,
    aiQuote?: string | null
  ): Record {
    const records = getFromStorage<Record>(STORAGE_KEYS.RECORDS);
    const existing = this.get(params);

    if (existing) {
      // 更新现有记录
      const index = records.findIndex(r => r.id === existing.id);
      records[index] = {
        ...records[index],
        content,
        word_count: content.length,
        ai_suggestions: aiSuggestions !== undefined ? aiSuggestions : records[index].ai_suggestions,
        ai_quote: aiQuote !== undefined ? aiQuote : records[index].ai_quote,
        status,
        updated_at: new Date().toISOString(),
      };
      saveToStorage(STORAGE_KEYS.RECORDS, records);

      // 更新周期完成度
      localCycles.updateCompletionRate(params.cycleId);

      return records[index];
    } else {
      // 插入新记录
      const newRecord: Record = {
        id: generateId(),
        user_id: params.userId,
        cycle_id: params.cycleId,
        dimension_id: params.dimensionId,
        record_date: params.date,
        content,
        word_count: content.length,
        ai_suggestions: aiSuggestions || null,
        ai_quote: aiQuote || null,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      records.push(newRecord);
      saveToStorage(STORAGE_KEYS.RECORDS, records);

      // 更新周期完成度
      localCycles.updateCompletionRate(params.cycleId);

      return newRecord;
    }
  },

  getByDateRange(userId: string, cycleId: number, startDate: string, endDate: string): Record[] {
    const records = getFromStorage<Record>(STORAGE_KEYS.RECORDS);
    return records.filter(
      r =>
        r.user_id === userId &&
        r.cycle_id === cycleId &&
        r.record_date >= startDate &&
        r.record_date <= endDate
    );
  },
};

// ==================== 费用管理 ====================

export const localExpenses = {
  save(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Expense {
    const expenses = getFromStorage<Expense>(STORAGE_KEYS.EXPENSES);
    const newExpense: Expense = {
      ...expense,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expenses.push(newExpense);
    saveToStorage(STORAGE_KEYS.EXPENSES, expenses);
    return newExpense;
  },

  getByDateRange(userId: string, startDate: string, endDate: string): Expense[] {
    const expenses = getFromStorage<Expense>(STORAGE_KEYS.EXPENSES);
    return expenses.filter(
      e =>
        e.user_id === userId &&
        e.expense_date >= startDate &&
        e.expense_date <= endDate
    );
  },

  getByRecordId(recordId: number): Expense[] {
    const expenses = getFromStorage<Expense>(STORAGE_KEYS.EXPENSES);
    return expenses.filter(e => e.record_id === recordId);
  },
};

// ==================== 附件管理 ====================

export const localAttachments = {
  save(attachment: Omit<RecordAttachment, 'id' | 'created_at'>): RecordAttachment {
    const attachments = getFromStorage<RecordAttachment>(STORAGE_KEYS.ATTACHMENTS);
    const newAttachment: RecordAttachment = {
      ...attachment,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    attachments.push(newAttachment);
    saveToStorage(STORAGE_KEYS.ATTACHMENTS, attachments);
    return newAttachment;
  },

  getByRecordId(recordId: number): RecordAttachment[] {
    const attachments = getFromStorage<RecordAttachment>(STORAGE_KEYS.ATTACHMENTS);
    return attachments.filter(a => a.record_id === recordId);
  },

  delete(id: number): boolean {
    const attachments = getFromStorage<RecordAttachment>(STORAGE_KEYS.ATTACHMENTS);
    const index = attachments.findIndex(a => a.id === id);
    if (index === -1) return false;
    attachments.splice(index, 1);
    saveToStorage(STORAGE_KEYS.ATTACHMENTS, attachments);
    return true;
  },
};

// ==================== 周期目标管理 ====================

export const localCycleGoals = {
  save(goal: Omit<CycleGoal, 'id' | 'created_at' | 'updated_at'>): CycleGoal {
    const goals = getFromStorage<CycleGoal>(STORAGE_KEYS.CYCLE_GOALS);
    const newGoal: CycleGoal = {
      ...goal,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    goals.push(newGoal);
    saveToStorage(STORAGE_KEYS.CYCLE_GOALS, goals);
    return newGoal;
  },

  update(id: number, updates: Partial<Omit<CycleGoal, 'id' | 'user_id' | 'created_at'>>): CycleGoal | null {
    const goals = getFromStorage<CycleGoal>(STORAGE_KEYS.CYCLE_GOALS);
    const index = goals.findIndex(g => g.id === id);
    if (index === -1) return null;

    goals[index] = {
      ...goals[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveToStorage(STORAGE_KEYS.CYCLE_GOALS, goals);
    return goals[index];
  },

  delete(id: number): boolean {
    const goals = getFromStorage<CycleGoal>(STORAGE_KEYS.CYCLE_GOALS);
    const index = goals.findIndex(g => g.id === id);
    if (index === -1) return false;
    goals.splice(index, 1);
    saveToStorage(STORAGE_KEYS.CYCLE_GOALS, goals);
    return true;
  },

  getByCycleId(cycleId: number): CycleGoal[] {
    const goals = getFromStorage<CycleGoal>(STORAGE_KEYS.CYCLE_GOALS);
    return goals.filter(g => g.cycle_id === cycleId);
  },

  getByUserAndCycle(userId: string, cycleId: number): CycleGoal[] {
    const goals = getFromStorage<CycleGoal>(STORAGE_KEYS.CYCLE_GOALS);
    return goals.filter(g => g.user_id === userId && g.cycle_id === cycleId);
  },

  getById(id: number): CycleGoal | null {
    const goals = getFromStorage<CycleGoal>(STORAGE_KEYS.CYCLE_GOALS);
    return goals.find(g => g.id === id) || null;
  },
};

// ==================== 每日目标管理 ====================

export const localDailyGoals = {
  save(goal: Omit<DailyGoal, 'id' | 'created_at' | 'updated_at'>): DailyGoal {
    const goals = getFromStorage<DailyGoal>(STORAGE_KEYS.DAILY_GOALS);
    const newGoal: DailyGoal = {
      ...goal,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    goals.push(newGoal);
    saveToStorage(STORAGE_KEYS.DAILY_GOALS, goals);
    return newGoal;
  },

  update(id: number, updates: Partial<Omit<DailyGoal, 'id' | 'user_id' | 'created_at'>>): DailyGoal | null {
    const goals = getFromStorage<DailyGoal>(STORAGE_KEYS.DAILY_GOALS);
    const index = goals.findIndex(g => g.id === id);
    if (index === -1) return null;

    goals[index] = {
      ...goals[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveToStorage(STORAGE_KEYS.DAILY_GOALS, goals);
    return goals[index];
  },

  delete(id: number): boolean {
    const goals = getFromStorage<DailyGoal>(STORAGE_KEYS.DAILY_GOALS);
    const index = goals.findIndex(g => g.id === id);
    if (index === -1) return false;
    goals.splice(index, 1);
    saveToStorage(STORAGE_KEYS.DAILY_GOALS, goals);
    return true;
  },

  getByDate(userId: string, date: string): DailyGoal[] {
    const goals = getFromStorage<DailyGoal>(STORAGE_KEYS.DAILY_GOALS);
    return goals.filter(g => g.user_id === userId && g.goal_date === date);
  },

  getByDateRange(userId: string, startDate: string, endDate: string): DailyGoal[] {
    const goals = getFromStorage<DailyGoal>(STORAGE_KEYS.DAILY_GOALS);
    return goals.filter(
      g => g.user_id === userId && g.goal_date >= startDate && g.goal_date <= endDate
    );
  },

  getById(id: number): DailyGoal | null {
    const goals = getFromStorage<DailyGoal>(STORAGE_KEYS.DAILY_GOALS);
    return goals.find(g => g.id === id) || null;
  },
};

// ==================== ���标评价管理 ====================

export const localGoalEvaluations = {
  getAll(userId: string): GoalEvaluation[] {
    const evaluations = getFromStorage<GoalEvaluation>(STORAGE_KEYS.GOAL_EVALUATIONS);
    return evaluations.filter(e => e.user_id === userId);
  },

  save(evaluation: Omit<GoalEvaluation, 'id' | 'created_at' | 'updated_at'>): GoalEvaluation {
    const evaluations = getFromStorage<GoalEvaluation>(STORAGE_KEYS.GOAL_EVALUATIONS);
    const newEvaluation: GoalEvaluation = {
      ...evaluation,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    evaluations.push(newEvaluation);
    saveToStorage(STORAGE_KEYS.GOAL_EVALUATIONS, evaluations);
    return newEvaluation;
  },

  update(id: number, updates: Partial<Omit<GoalEvaluation, 'id' | 'user_id' | 'created_at'>>): GoalEvaluation | null {
    const evaluations = getFromStorage<GoalEvaluation>(STORAGE_KEYS.GOAL_EVALUATIONS);
    const index = evaluations.findIndex(e => e.id === id);
    if (index === -1) return null;

    evaluations[index] = {
      ...evaluations[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveToStorage(STORAGE_KEYS.GOAL_EVALUATIONS, evaluations);
    return evaluations[index];
  },

  getByGoal(goalId: number, goalType: 'cycle' | 'daily'): GoalEvaluation | null {
    const evaluations = getFromStorage<GoalEvaluation>(STORAGE_KEYS.GOAL_EVALUATIONS);
    return evaluations.find(e => e.goal_id === goalId && e.goal_type === goalType) || null;
  },

  getByCycle(userId: string, cycleId: number): GoalEvaluation[] {
    const evaluations = getFromStorage<GoalEvaluation>(STORAGE_KEYS.GOAL_EVALUATIONS);
    return evaluations.filter(e => e.user_id === userId && e.cycle_id === cycleId);
  },

  getById(id: number): GoalEvaluation | null {
    const evaluations = getFromStorage<GoalEvaluation>(STORAGE_KEYS.GOAL_EVALUATIONS);
    return evaluations.find(e => e.id === id) || null;
  },
};

// ==================== 知识库管理 ====================

export const localKnowledgeBase = {
  getAll(userId: string): KnowledgeBase[] {
    const kb = getFromStorage<KnowledgeBase>(STORAGE_KEYS.KNOWLEDGE_BASE);
    return kb.filter(item => item.user_id === userId);
  },

  getByDimension(userId: string, dimensionId: number): KnowledgeBase[] {
    const kb = this.getAll(userId);
    return kb.filter(item => item.dimension_id === dimensionId);
  },

  add(item: Omit<KnowledgeBase, 'id' | 'created_at' | 'updated_at'>): KnowledgeBase {
    const kb = getFromStorage<KnowledgeBase>(STORAGE_KEYS.KNOWLEDGE_BASE);
    const newItem: KnowledgeBase = {
      ...item,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    kb.push(newItem);
    saveToStorage(STORAGE_KEYS.KNOWLEDGE_BASE, kb);
    return newItem;
  },

  update(id: number, updates: Partial<Omit<KnowledgeBase, 'id' | 'user_id' | 'created_at'>>): KnowledgeBase | null {
    const kb = getFromStorage<KnowledgeBase>(STORAGE_KEYS.KNOWLEDGE_BASE);
    const index = kb.findIndex(item => item.id === id);
    if (index === -1) return null;

    kb[index] = {
      ...kb[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveToStorage(STORAGE_KEYS.KNOWLEDGE_BASE, kb);
    return kb[index];
  },

  remove(id: number): void {
    const kb = getFromStorage<KnowledgeBase>(STORAGE_KEYS.KNOWLEDGE_BASE);
    saveToStorage(STORAGE_KEYS.KNOWLEDGE_BASE, kb.filter(item => item.id !== id));
  }
};

// ==================== 认知报告管理 ====================

export const localReports = {
  getAll(userId: string): Report[] {
    const reports = getFromStorage<Report>(STORAGE_KEYS.REPORTS);
    return reports.filter(r => r.user_id === userId);
  },

  getByCycle(userId: string, cycleId: number): Report[] {
    const reports = this.getAll(userId);
    return reports.filter(r => r.cycle_id === cycleId);
  },

  add(item: Omit<Report, 'id' | 'created_at'>): Report {
    const reports = getFromStorage<Report>(STORAGE_KEYS.REPORTS);
    const newItem: Report = {
      ...item,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    reports.push(newItem);
    saveToStorage(STORAGE_KEYS.REPORTS, reports);
    return newItem;
  }
};


// ==================== 初始化测试数据 ====================

export function initTestData(): void {
  // 检查是否已初始化（通过v9重新初始化以加入更丰富的Lib展示数据）
  if (localStorage.getItem('__test_data_initialized_v9')) {
    return;
  }

  console.log('🚀 初始化测试数据...');

  // 1. 清空现有数据
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });

  // 2. 创建测试用户
  const testUser = localAuth.login('+8613800138000');
  const userId = testUser.user.id;

  // 3. 创建维度配置（6个维度）
  const dimensions: Dimension[] = [
    {
      id: 1,
      user_id: userId,
      dimension_name: '健康',
      icon_name: 'favorite',
      color_code: '#A8C3A9',
      display_order: 1,
      is_active: true,
      ai_persona_prompt: '你是一位资深的三甲医院主治医师与健康规划师，请从医学、作息、饮食的专业角度分析用户的健康状态并给出务实建议。',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      user_id: userId,
      dimension_name: '工作',
      icon_name: 'work',
      color_code: '#E89CAB',
      display_order: 2,
      is_active: true,
      ai_persona_prompt: '你是一位拥有15年经验的500强风险控制总监，风格犀利果断，请以职场进阶和管理视角的专业维度，直击要害地点评用户的工作复盘。',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 3,
      user_id: userId,
      dimension_name: '投资',
      icon_name: 'trending_up',
      color_code: '#81C784',
      display_order: 3,
      is_active: true,
      ai_persona_prompt: '你是一位华尔街资深对冲基金经理与财富顾问，请从风险控制、资产配置的专业维度，分析用户的投资复盘并给出冷静客观的建议。',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 4,
      user_id: userId,
      dimension_name: '阅读',
      icon_name: 'menu_book',
      color_code: '#E8C996',
      display_order: 4,
      is_active: true,
      ai_persona_prompt: '你是一位博览群书的资深书评人与知识架构师。请评估用户的阅读沉淀是否形成了系统性的认知，并引导他们将书中知识应用到生活。',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 5,
      user_id: userId,
      dimension_name: '开销',
      icon_name: 'credit_card',
      color_code: '#9DC5EF',
      display_order: 5,
      is_active: true,
      ai_persona_prompt: '你是一位精通资产配置的私人财富顾问，请理性分析用户的消费记录，指出财务漏洞，并提出有助于财富积累的资产优化建议。',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 6,
      user_id: userId,
      dimension_name: '其他',
      icon_name: 'lightbulb',
      color_code: '#C3B1E1',
      display_order: 6,
      is_active: true,
      ai_persona_prompt: '你是一位经验丰富的人生教练(Life Coach)。请对用户生活中的其他探索和感悟进行温暖而有启发性的回应，鼓励他们发现生活的多样性。',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  saveToStorage(STORAGE_KEYS.DIMENSIONS, dimensions);

  // 4. 创建 37 个周期（全年365/366天）
  const cycles: Cycle[] = [];
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const today = new Date();

  // 重置时间以便准确比较
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let currentStartDate = new Date(yearStart);
  let activeCycleId = 1;

  for (let i = 1; i <= 37; i++) {
    const isLastCycle = i === 37;
    // 第37个周期包含剩余的天数（5天或闰年6天）
    const daysInCycle = isLastCycle ?
      Math.round((new Date(currentYear, 11, 31).getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 :
      10;

    const endDate = new Date(currentStartDate);
    endDate.setDate(currentStartDate.getDate() + daysInCycle - 1);

    // 比较只看日期不看时间
    const cycleStart = new Date(currentStartDate.getFullYear(), currentStartDate.getMonth(), currentStartDate.getDate());
    const cycleEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    // 判断状态
    let status: 'not_started' | 'active' | 'completed' = 'not_started';
    let completion_rate = 0;

    if (todayDateOnly > cycleEnd) {
      status = 'completed';
      completion_rate = 100;
    } else if (todayDateOnly >= cycleStart && todayDateOnly <= cycleEnd) {
      status = 'active';
      completion_rate = 30; // 模拟当前进行中进度
      activeCycleId = i;
    } else {
      status = 'not_started';
      completion_rate = 0;
    }

    // 格式化日期 YYYY-MM-DD
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    cycles.push({
      id: i,
      user_id: userId,
      cycle_number: i,
      start_date: formatDate(currentStartDate),
      end_date: formatDate(endDate),
      total_days: daysInCycle,
      completion_rate,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 下一个周期的开始日期
    currentStartDate = new Date(endDate);
    currentStartDate.setDate(endDate.getDate() + 1);
  }
  saveToStorage(STORAGE_KEYS.CYCLES, cycles);

  // 5. 创建一些测试记录（当前周期的前3天）
  const records: Record[] = [];

  for (let day = 0; day < 3; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() - day);
    const dateStr = date.toISOString().split('T')[0];

    // 为每个维度创建一条记录
    dimensions.forEach((dim, index) => {
      if (index < 3) { // 只为前3个维度创建记录
        records.push({
          id: generateId() + day * 10 + index,
          user_id: userId,
          cycle_id: activeCycleId,
          dimension_id: dim.id,
          record_date: dateStr,
          content: `${dim.dimension_name}的第${day + 1}天记录示例`,
          word_count: 20,
          ai_suggestions: null,
          ai_quote: null,
          status: 'published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });
  }
  saveToStorage(STORAGE_KEYS.RECORDS, records);

  // 6. 添加一些知识库沉淀测试数据
  const knowledgeBase: KnowledgeBase[] = [];
  [
    { dim: 1, content: '今天尝试了16+8轻断食，感觉上午大脑异常清醒。之后要配合晚上做一点拉伸，降低心率，睡眠质量提升很明显。' },
    { dim: 2, content: '在分析风险数据时发现，客户退订的隐患往往藏在二次确认的邮件中，而不是价格。这让我重新思考了所谓的“转化漏斗”模型。' },
    { dim: 3, content: '《思考，快与慢》重读。系统一的直觉很容易被利用，要在复盘环节强制调用系统二去抑制不理性的冲动。' }
  ].forEach((item, index) => {
    // 放入当前周期的前两天
    const date = new Date(today);
    date.setDate(date.getDate() - (index % 3));
    knowledgeBase.push({
      id: generateId() + index,
      user_id: userId,
      dimension_id: item.dim,
      cycle_id: activeCycleId,
      record_date: date.toISOString().split('T')[0],
      content: item.content,
      media_urls: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });
  saveToStorage(STORAGE_KEYS.KNOWLEDGE_BASE, knowledgeBase);

  // 6.6 添加体重测试数据
  const weights: any[] = [];
  for (let i = 0; i < 15; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (14 - i));
    weights.push({
      id: generateId() + i,
      user_id: userId,
      weight_kg: 70 - (i * 0.2) + (Math.random() * 0.5), // 模拟缓慢下降趋势
      record_date: date.toISOString().split('T')[0],
      notes: i % 5 === 0 ? '早起空腹称重' : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  saveToStorage(STORAGE_KEYS.WEIGHT_RECORDS, weights);

  // 6.7 添加开销测试数据（跨越3个月以展示月度统计）
  const expenses: any[] = [];
  const categories = ['餐饮', '交通', '购物', '娱乐', '收入'];
  for (let m = 0; m < 3; m++) {
    const monthBase = new Date(today.getFullYear(), today.getMonth() - m, 15);
    // 每个月加几条支出
    for (let i = 0; i < 5; i++) {
      const date = new Date(monthBase);
      date.setDate(date.getDate() + i);
      expenses.push({
        id: generateId() + m * 20 + i,
        record_id: 0,
        user_id: userId,
        cycle_id: activeCycleId,
        category: categories[Math.floor(Math.random() * 4)],
        item_name: '测试消费项目',
        amount: Math.floor(Math.random() * 200) + 20,
        expense_date: date.toISOString().split('T')[0],
        created_at: new Date().toISOString()
      });
    }
    // 每个月加一笔收入
    expenses.push({
      id: generateId() + m * 20 + 99,
      record_id: 0,
      user_id: userId,
      cycle_id: activeCycleId,
      category: '收入',
      item_name: '工资收入',
      amount: 15000,
      expense_date: monthBase.toISOString().split('T')[0],
      created_at: new Date().toISOString()
    });
  }
  saveToStorage(STORAGE_KEYS.EXPENSES, expenses);

  // 6.8 添加书籍测试数据
  const books: any[] = [
    {
      id: generateId() + 1,
      user_id: userId,
      cycle_id: activeCycleId,
      book_title: '思考，快与慢',
      author: '丹尼尔·卡尼曼',
      cover_url: null,
      reading_status: 'reading',
      progress_percent: 65,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: generateId() + 2,
      user_id: userId,
      cycle_id: activeCycleId,
      book_title: '纳瓦尔宝典',
      author: '埃里克·乔根森',
      cover_url: null,
      reading_status: 'completed',
      progress_percent: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
  saveToStorage('reading_books', books);

  // 6.9 增强知识库内容
  const moreKnowledge: KnowledgeBase[] = [
    {
      id: generateId() + 50,
      user_id: userId,
      dimension_id: 3, // 投资
      cycle_id: activeCycleId,
      record_date: today.toISOString().split('T')[0],
      content: '今日定投了沪深300指数基金。在市场情绪低迷时，反而要坚持执行纪律，避免受到噪音干扰。核心是关注企业的长期价值而非短期波动。',
      media_urls: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: generateId() + 51,
      user_id: userId,
      dimension_id: 6, // 其他
      cycle_id: activeCycleId,
      record_date: today.toISOString().split('T')[0],
      content: '今天在公园散步，突然悟到：生活的意义不在于终点，而在于你如何觉察每一个当下。这种正念的感觉非常棒。',
      media_urls: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ];
  const currentKB = getFromStorage<KnowledgeBase[]>(STORAGE_KEYS.KNOWLEDGE_BASE) || [];
  saveToStorage(STORAGE_KEYS.KNOWLEDGE_BASE, [...currentKB, ...moreKnowledge]);

  // 6.5 生成周期目标数据
  const cycleGoals: CycleGoal[] = [];

  // 为周期 1 (用于历史复盘测试) 生成目标
  dimensions.slice(0, 3).forEach((dim, index) => {
    cycleGoals.push({
      id: generateId() + 200 + index,
      user_id: userId,
      cycle_id: 1,
      dimension_id: dim.id,
      content: `${dim.dimension_name} - 周期 1 测试目标`,
      target_type: 'qualitative',
      target_value: null,
      target_unit: null,
      evaluation_criteria: '通过文字记录和完成度核准',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  // 为当前周期生成目标
  dimensions.slice(0, 2).forEach((dim, index) => {
    cycleGoals.push({
      id: generateId() + 300 + index,
      user_id: userId,
      cycle_id: activeCycleId,
      dimension_id: dim.id,
      content: `${dim.dimension_name} - 当前周期目标`,
      target_type: 'quantitative',
      target_value: 10,
      target_unit: '次',
      evaluation_criteria: '定量数据追踪',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });
  saveToStorage(STORAGE_KEYS.CYCLE_GOALS, cycleGoals);

  // 7. 生成一些目标评估测数据, 特意留空部分人工审核以供测试
  const goalEvaluations: GoalEvaluation[] = [];
  // 获取刚刚创建的周期1的目标
  const cycle1Goals = cycleGoals.filter(g => g.cycle_id === 1);
  cycle1Goals.forEach((goal, index) => {
    const isFirstGoal = index === 0;

    goalEvaluations.push({
      id: generateId() + index,
      user_id: userId,
      cycle_id: 1,
      goal_id: goal.id,
      goal_type: 'cycle',
      dimension_id: goal.dimension_id,
      ai_score: 85,
      ai_analysis: '从记录来看，虽然未能达到满负荷目标，但在核心的步骤上执行得很到位。总体来说，这是一个非常务实且成果显著的阶段。考虑在下个阶段增加精力管理。',
      user_score: isFirstGoal ? null : 80, // 留下第一个目标作为测试
      user_comment: isFirstGoal ? null : '觉得还可以做得更好。',
      final_score: isFirstGoal ? 85 : 82.5,
      evaluated_at: isFirstGoal ? undefined : new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });
  saveToStorage(STORAGE_KEYS.GOAL_EVALUATIONS, goalEvaluations);

  // 8. 产生一些认知报告的测试数据 (针对上个周期)
  const reports: Report[] = [];
  reports.push({
    id: generateId(),
    user_id: userId,
    cycle_id: Math.max(1, activeCycleId - 1),
    dimension_id: 2, // 工作
    report_type: 'cycle',
    content: '**专业表现评估**\n在上一周期中，您的记录显示了强大的风险洞察力。特别是您在二次确认邮件漏洞上的发现，展现了管理层的视角。**优化建议**：目前您的行动倾向于“发现问题”，接下来的10天应更侧重建立自动化预警机制。',
    created_at: new Date().toISOString(),
  });
  saveToStorage(STORAGE_KEYS.REPORTS, reports);

  // 标记已初始化
  localStorage.setItem('__test_data_initialized_v9', 'true');
  console.log('✅ 测试数据初始化完成_v9');
  console.log('📊 数据统计:');
  console.log(`  - 用户: 1`);
  console.log(`  - 维度: ${dimensions.length}`);
  console.log(`  - 周期: ${cycles.length}`);
  console.log(`  - 记录: ${records.length}`);
}

// ==================== 重置数据 ====================

export function resetAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  localStorage.removeItem('__test_data_initialized_v3');
  console.log('🗑️ 所有数据已清空');
}
