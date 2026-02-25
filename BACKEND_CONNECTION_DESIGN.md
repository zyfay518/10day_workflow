# 前后端接口设计文档 - 10日工作流管理系统

> **项目名称**: 10-Day Flow (10日工作流管理)
> **文档版本**: v1.1
> **更新日期**: 2026-02-25
> **基础架构**: React + TypeScript + localStorage (本地测试) → Supabase (云端部署)

---

## 📋 目录

1. [总体架构](#一总体架构)
2. [页面交互分析](#二页面交互分析)
3. [数据接口设计](#三数据接口设计)
4. [Hook设计](#四hook设计)
5. [实时数据同步](#五实时数据同步)
6. [API调用流程](#六api调用流程)
7. [错误处理与验证](#七错误处理与验证)
8. [性能优化建议](#八性能优化建议)
9. [迁移计划](#九迁移计划-localstorage--supabase)
10. [测试清单](#十测试清单)

---

## 一、总体架构

### 1.1 系统分层

```
┌─────────────────────────────────────────┐
│           User Interface Layer           │
│  Home / Record / History / Report / ...  │
│  (React Components + Tailwind CSS)       │
└──────────────────┬──────────────────────┘
                   │ Hooks + Context
┌──────────────────▼──────────────────────┐
│        Data Access Layer (Hooks)         ���
│ useAuth / useCycles / useRecords / ...   │
└──────────────────┬──────────────────────┘
                   │ localStorage / Supabase
┌──────────────────▼──────────────────────┐
│      Backend Storage (可切换)            │
│   localStorage (开发) / Supabase (生产)   │
└─────────────────────────────────────────┘
```

### 1.2 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端框架** | React 19 + TypeScript | 组件开发和类型安全 |
| **状态管理** | React Hooks | 轻量级状态管理 |
| **路由** | React Router v7 | 页面路由和导航 |
| **样式** | Tailwind CSS v4 | 原子化CSS框架 |
| **图表库** | Recharts | 数据可视化 |
| **图标** | Material Symbols | 图标库 |
| **存储** | localStorage (开发) / Supabase Storage (生产) | 文件和图片存储 |
| **数据库** | Supabase (PostgreSQL) | 后端数据库 (未来) |
| **认证** | Supabase Auth | 用户认证管理 (未来) |
| **AI服务** | 用户自定义API (通过Settings配置) | AI文字识别和解析 (未来) |
| **语音识别** | Web Speech API (浏览器原生) | 语音转文字 |

### 1.3 数据流向图

```
用户操作 (UI Event)
    ↓
React Event Handler
    ↓
Custom Hook (useRecords/useCycles/...)
    ↓
localStorage.ts (本地存储层)
    ↓
浏览器 localStorage
    ↓
数据变更通知
    ↓
Hook State 更新
    ↓
React Re-render
    ↓
UI 更新显示
```

---

## 二、页面交互分析

### 2.1 首页 (Home.tsx) ✅ 已连接后端 + 🔄 需更新

#### 页面功能概述

首页是应用的核心入口，展示用户的37个周期完成情况矩阵，当前周期进度，以及今日记录状态。

#### 页面元素与交互

| 元素 | 类型 | 功能说明 | 数据源 | 操作后 | 状态 |
|------|------|--------|--------|--------|------|
| **状态栏** | Status Bar | 显示时间、信号、WiFi、电量 | - | - | 🔄 需添加 |
| **用户头像** | 圆形头像 | 显示用户基本信息 | user_profiles.nickname | 点击跳转到Profile页 | ✅ |
| **设置按钮** | Icon Button | 打开设置页面 | - | 跳转 /profile | ✅ |
| **37周期矩阵** | Grid Layout (6×6+1) | 展示所有周期完成度 | cycles.completion_rate | **点击已完成/当前周期圆点跳转到History页，自动设置该周期日期范围并筛选记录；未来周期不可点击** | 🔄 需实现 |
| **当前周期卡片** | Card | 显示进度条和百分比 | cycles 表当前周期数据 | 刷新数据 | ✅ |
| **今日记录状态** | Tag 列表 | 显示各维度记录状态 | records 表今日数据 | 实时更新 | ✅ |
| **开始记录按钮** | Primary Button | 跳转到记录页 | - | 导航到 /record | ✅ |
| **查看报告按钮** | Secondary Button | 跳转到报告页 | - | 导航到 /report | ✅ |

#### 新增功能说明

**周期矩阵交互逻辑**:
- 已完成的周期（前13个蓝色圆点）可点击
- 当前周期（黄色圆点）可点击
- 未来周期（白色圆点）不可点击，添加禁用样式
- 点击后跳转到 `/history?cycleId=${cycleId}`
- History页面接收cycleId参数，自动设置日期筛选器为该周期的`start_date`到`end_date`
- 自动筛选出该周期内所有记录显示在列表中

#### 涉及的数据表

- `user_profiles` - 用户基本信息 ✅
- `cycles` - 周期数据 ✅
- `dimensions` - 维度配置 ✅
- `records` - 记录数据（用于计算今日状态）✅

---

### 2.2 记录页 (Record.tsx) ✅ 已连接后端 + 🔄 需重大更新 ⭐ 核心页面

#### 页面功���概述

记录页是应用的核心功能页面，用户在此输入各维度的日记内容。支持维度切换、日期选择、附件上传、AI解析。

#### 页面元素与交互

| 元素 | 类型 | 功能说明 | 数据源 | 操作后 | 状态 |
|------|------|--------|--------|--------|------|
| **状态栏** | Status Bar | 显示时间、信号、WiFi、电量 | - | - | ✅ |
| **返回按钮** | Icon Button | 返回首页 | - | 导航到 / | ✅ |
| **日历按钮** | Icon Button | 打开日期选择器 | cycles 的日期范围 | 弹出日期选择 | ✅ |
| **选中日期显示** | Text | 显示当前选中日期 | state: selectedDate | 更新为新选中日期 | ✅ |
| **维度 Tab栏** | Tab Group | 切换五个维度 | dimensions 表 | 加载对应维度的记录 | ✅ |
| **文本输入框** | Textarea | 输入维度内容 | record.content | 保存记录 | ✅ |
| **拍照按钮** | Icon Button | **调用设备摄像头拍照** | - | **拍照后上传到Supabase Storage，添加到attachments，图片限制5MB** | 🔄 需实现 |
| **语音按钮** | Icon Button | **录制语音转文字** | - | **使用Web Speech API，实时转换并追加到textarea** | 🔄 需实现 |
| **图片按钮** | Icon Button | **选择本地图片** | - | **打开本地相册，上传到Supabase Storage，添加到attachments，图片限制5MB** | 🔄 需实现 |
| **AI解析按钮** | Primary Button | **所��维度都显示（不仅Expense）** | record.content | **调用用户设置的AI API，分析内容生成总结和建议，显示在AI建议文本框中** | 🔄 需实现 |
| **AI建议文本框** | Read-only Textarea | **显示AI分析结果** | record.ai_suggestions | **在输入框下方新增区域展示AI建议** | 🔄 需新增 |
| **今日记录概览** | Tag 列表 | **显示5个维度的完成状态** | **查询所有维度的records数据** | **实时更新，修复Bug：切换维度时应查询所有维度状态，而不是只显示当前维度** | 🔄 需修复 |
| **保存记录按钮** | Gradient Button | **保存当前维度记录** | record.content + attachments | **调用 saveRecord()，按钮文字固定为"Save"，不随维度切换** | 🔄 需修改 |
| **今日完成按钮** | Primary Button | **标记今日全部完成** | - | **弹出自定义确认框（非原生alert），确认后保存所有维度内容（遍历5个维度），然后导航回首页** | 🔄 需修改 |

#### 新增功能说明

**1. 附件上传功能**:
- 图片上传限制：单个文件最大5MB
- 支持格式：JPEG, PNG, WEBP
- 存储位置：Supabase Storage (生产环境) / localStorage base64 (测试环境)
- 数据结构：新增 `record_attachments` 表记录附件关系

**2. 语音转文字**:
- 使用浏览器原生 Web Speech API
- 实时转换语音为文字
- 转换结果自动追加到当前textarea
- 无需外部API调用

**3. AI解析功能**:
- 在每个维度都显示AI解析按钮（不仅Expense）
- 点击后调用用户在Settings页面配置的AI API Key
- 测试阶段使用mock数据
- 分析内容：
  - Expense维度：拆解开销分类和金额
  - 其他维度：生成简要总结和建议
- 显示位置：在textarea下方新增只读文本框展示AI建议
- 数据存储：AI建议保存到 `records.ai_suggestions` 字段

**4. 今日记录概览Bug修复**:
- 当前问题：切换维度后，已保存的其他维度不显示为完成状态
- 修复方案：查询所有5个维度的今日records数据，而不是只查当前维度
- 实现逻辑：
  ```typescript
  const getTodayOverviewStatus = () => {
    const today = new Date().toISOString().split('T')[0];
    return dimensions.map(dim => {
      const rec = localRecords.get({
        userId: user.id,
        cycleId: currentCycle.id,
        dimensionId: dim.id,
        date: today
      });
      return {
        name: dim.dimension_name,
        completed: rec?.status === 'published'
      };
    });
  };
  ```

**5. 今日完成按钮逻辑**:
- 点击后弹出自定义确认对话框（样式参考现有UI设计）
- 确认框内容："确定完成今日所有维度的记录吗？"
- 确认后执行：
  1. 遍历所有5个维度
  2. 保存每个维度的当前textarea内容（如果有内容）
  3. 状态设置为'published'
  4. 触发完成度更新
  5. 导航回首页
- 不需要验证所有维度是否都有内容

#### 涉及的数据表

- `user_profiles` - 用户信息 ✅
- `cycles` - 周期数据 ✅
- `dimensions` - 维度配置 ✅
- `records` - 核心记录表 ✅ + 需扩展字段
- `record_attachments` - 附件表 🔄 需创建

---

### 2.3 费用记录特殊页 (Expense.tsx) 🔄 需连接后端并重构 ⭐ 高优先级

#### 页面功能概述

费用记录页面提供AI智能解析账单功能，自动识别开销信息并分类。**支持3列数据编辑、保存文本和解析结果**。

#### 页面元素与交互

| 元素 | 类型 | 功能说明 | 数据源 | 操作后 | 状态 |
|------|------|--------|--------|--------|------|
| **状态栏** | Status Bar | 显示时间、信号、WiFi、电量 | - | - | ✅ |
| **返回按钮** | Icon Button | 返回记录页 | - | 导航到 /record | ✅ |
| **快速输入框** | Textarea | 输入开销信息 | state: text | 实时保存 | ✅ |
| **AI解析按钮** | Primary Button | **调用AI API解析开销** | 用户配置的API | **解析出3列数据：消费类目、具体内容、金额** | 🔄 需实现 |
| **解析结果表格** | Table (3列) | **显示解析结果** | expenses 临时state | **每列可编辑：类目下拉选择、内容文本输入、金额数字输入** | 🔄 需实现 |
| **编辑按钮** | Icon Button × N | **每行一个Edit按钮** | - | **切换该行为编辑模式** | 🔄 需实现 |
| **批量操作区** | Button Group | **全部删除、批量调整类目** | - | **优化建议功能** | 🔄 需实现 |
| **总金额显示** | Summary | 显示解析后总开销 | expenses 计算 | 实时更新 | ✅ |
| **确认记录按钮** | Gradient Button | **保存文本+解析结果** | **expenses 表 + records 表** | **同时保存text和所有expense项** | 🔄 需实现 |

#### 新增功能说明

**1. AI解析特殊逻辑（Expense维度）:**

与其他维度不同，Expense维度的AI解析输出结构化数据：

```typescript
// AI解析输出格式
interface ExpenseItem {
  category: string;      // 消费类目（餐饮、交通、购物、娱乐等）
  name: string;          // 具体消费内容
  amount: number;        // 金额
  icon?: string;         // 显示图标（可选）
}

// 解析示例
输入: "午餐 50, 打车 20, 买书 120"
输出: [
  { category: "餐饮", name: "午餐", amount: 50, icon: "restaurant" },
  { category: "交通", name: "打车", amount: 20, icon: "directions_car" },
  { category: "购物", name: "买书", amount: 120, icon: "shopping_bag" }
]
```

**2. 3列编辑表格:**

- **列1: 消费类目** - 下拉选择框，预设类别：餐饮、交通、购物、娱乐、教育、医疗、其他
- **列2: 具体内容** - 文本输入框，可修改AI识别的名称
- **列3: 金额** - 数字输入框，只允许输入数字和小数点

每行右侧有Edit按钮，点击切换为编辑模式：
```typescript
const [editingIndex, setEditingIndex] = useState<number | null>(null);

// Edit按钮点击
const handleEdit = (index: number) => {
  setEditingIndex(index);
};

// 保存编辑
const handleSaveEdit = (index: number, updates: Partial<ExpenseItem>) => {
  const newExpenses = [...expenses];
  newExpenses[index] = { ...newExpenses[index], ...updates };
  setExpenses(newExpenses);
  setEditingIndex(null);
};
```

**3. 批量操作功能（优化建议）:**

- **全部删除**: 清空所有解析结果，重新输入
- **批量调整类目**: 选中多行，统一修改类目
- **无法识别处理**: AI解析失败的项显示"无法识别"标签，提供手动添加按钮

**4. 历史模板功能（优化建议）:**

```typescript
// 保存常用开销模板
interface ExpenseTemplate {
  id: number;
  name: string;         // 模板名称："日常午餐"
  items: ExpenseItem[]; // 模板内容
  userId: string;
}

// 用户可保存"午餐 30"这样的常用模板，下次快速填充
```

**5. 金额校验:**

```typescript
const validateAmount = (value: string): boolean => {
  // 只允许数字和小数点
  return /^\d+(\.\d{0,2})?$/.test(value);
};

const handleAmountChange = (index: number, value: string) => {
  if (!validateAmount(value) && value !== '') {
    showToast('请输入有效金额', 'error');
    return;
  }
  // 更新金额
  updateExpenseAmount(index, parseFloat(value));
};
```

**6. 保存逻辑（重点）:**

点击"确认记录"按钮时，需要同时保存两部分数据：

```typescript
const handleConfirmRecord = async () => {
  // 1. 保存文本内容到 records 表
  const record = await saveRecord({
    userId: user.id,
    cycleId: currentCycle.id,
    dimensionId: expenseDimension.id, // Expense维度ID
    date: selectedDate,
    content: text, // 原始输入文本
    status: 'published'
  });

  // 2. 批量保存解析后的开销项到 expenses 表
  for (const item of expenseItems) {
    await saveExpense({
      recordId: record.id,
      userId: user.id,
      cycleId: currentCycle.id,
      category: item.category,
      item_name: item.name,
      amount: item.amount,
      expenseDate: selectedDate
    });
  }

  showToast('开销记录已保存', 'success');
  navigate('/record');
};
```

#### 数据结构

**expenses 表:**
```typescript
interface Expense {
  id: number;
  record_id: number;      // 关联 records 表
  user_id: string;
  cycle_id: number;
  category: string;       // 消费类目
  item_name: string;      // 具体内容
  amount: number;         // 金额
  expense_date: string;   // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}
```

#### 涉及的数据表

- `records` - 保存原始文本输入 ✅
- `expenses` - 保存解析后的结构化开销 🔄 需创建
- `user_profiles` - 获取AI配置 ✅
- `expense_templates` - 常用模板（优化功能）🔄 可选

#### 需要开发的功能

- [ ] 连接后端：创建 `useExpenses.local.ts` Hook
- [ ] AI解析：输出3列结构化数据
- [ ] 3列编辑表格组件
- [ ] ���量操作功能（全部删除、批量类目调整）
- [ ] 金额输入校验
- [ ] 保存逻辑：同时保存 text + expenses
- [ ] 无法识别处理UI
- [ ] 历史模板功能（可选）

---

### 2.4 历史记录页 (History.tsx) ❌ 未连接后端 + 🔄 需新增功能

#### 页面功能概述

展示当前周期或指定周期内的所有记录，支持日期范围筛选、维度筛选、全文搜索。**支持从首页周期矩阵跳转并自动筛选**。

#### 页面元素与交互

| 元素 | 类型 | 功能说明 | 数据源 | 状态 |
|------|------|--------|--------|------|
| **搜索按钮** | Icon Button | 打开搜索框 | - | 🟡 静态 |
| **搜索输入框** | Input | 输入关键词搜索 | state | 🟡 静态 |
| **日期筛选** | Dropdown Button | **选择日期范围，支持URL参数自动设置** | cycles | 🔄 需实现 |
| **维度筛选** | Dropdown Button | 选择特定维度 | dimensions | 🔄 需实现 |
| **记录卡片** | Card List | 显示记录内容 | records | 🔄 需实现 |
| **附件缩略图** | Image Grid | 显示上传的图片 | record_attachments | 🔄 需实现 |
| **开销明细** | Expense List | 显示该记录的开销 | expenses | 🔄 需实现 |

#### 新增功能：URL参数支持

**从首页跳转时接收cycleId参数**:
```typescript
// 路由示例: /history?cycleId=2
// History.tsx 需要读取URL参数
const searchParams = useSearchParams();
const cycleId = searchParams.get('cycleId');

// 如果有cycleId，自动设置日期筛选器
useEffect(() => {
  if (cycleId) {
    const cycle = cycles.find(c => c.id === parseInt(cycleId));
    if (cycle) {
      setDateFilter(`${cycle.start_date} - ${cycle.end_date}`);
      // 自动加载该周期的记录
      loadRecordsByCycle(cycle.id);
    }
  }
}, [cycleId]);
```

#### 需要开发的功能

- [ ] 创建 `useHistory` Hook 或扩展 `useRecords`
- [ ] 实现日期范围查询（支持cycleId参数）
- [ ] 实现维度过��
- [ ] 实现全文搜索

---

### 2.5 报告页 (Report.tsx) ❌ 未连接后端

#### 页面功能概述

展示周期报告、时间轴和数据洞察。需要AI聚合分析功能。

#### Tab 1: 周期报告 ❌ TODO

| 元素 | 功能说明 | 状态 |
|------|--------|------|
| **周期选择器** | 选择查看哪个周期 | ❌ |
| **AI评价卡片** | 显示完成度和建议 | ❌ |
| **各维度卡片** | 显示各维度总结 | ❌ |
| **导出按钮** | 导出PDF/Markdown | ❌ |

#### Tab 2: 时间轴 ❌ TODO

| 元素 | 功能说明 | 状态 |
|------|--------|------|
| **完成度趋势图** | 显示各周期完成度曲线 | ❌ |
| **里程碑时间轴** | 显示重要事件 | ❌ |

#### Tab 3: 数据洞察 ❌ TODO

| 元素 | 功能说明 | 状态 |
|------|--------|------|
| **全局统计卡片** | 显示累计数据 | ❌ |
| **维度分布雷达图** | 各维度活跃度对比 | ❌ |
| **开销趋势图** | 按周期显示开销 | ❌ |
| **关键词词云** | 显示提取的关键词 | ❌ |

#### 需要开发的功能

- [ ] 创建 `useReport` Hook
- [ ] 创建 `useMilestones` Hook
- [ ] 实现AI报告生成接口（未来）
- [ ] 实现导出功能

---

### 2.6 个人设置页 (Profile.tsx) ❌ 未连接后端 + 🔄 需新增API Key配置

#### 页面功能概述

用户个人信息管理和应用设置。**新增AI API Key配置功能**。

#### 页面元素与交互

| 元素 | 功能说明 | 数据源 | 状态 |
|------|--------|--------|------|
| **头像上传** | 上传/更换头像 | user_profiles.avatar_url | 🔄 需实现 |
| **昵称编辑** | 修改用户昵称 | user_profiles.nickname | 🔄 需实现 |
| **AI API Key配置** | **输入并保存AI服务API Key** | **user_profiles.ai_api_key** | 🔄 需新增 |
| **API服务选择** | **选择AI服务商（OpenAI/Gemini/通义千问等）** | **user_profiles.ai_service_provider** | 🔄 需新增 |
| **推送通知开关** | 启用/禁用通知 | user_profiles | 🔄 需实现 |
| **退出登录** | 清除会话 | - | 🔄 需实现 |

#### 新增功能：AI配置

**API Key管理**:
- 用户可在此页面输入自己的AI服务API Key
- 支持的AI服务：
  - OpenAI (ChatGPT)
  - Google Gemini
  - 阿里通义千问
  - 百度文心一言
  - 自定义API端点
- 安全存储：加密后存储到 `user_profiles.ai_api_key`
- 测试按钮：验证API Key是否有效

#### 需要开发的功能

- [ ] 扩展 `useUserProfile` Hook 支持更新功能
- [ ] 实现头像上传到 Storage（未来）
- [ ] **新增AI配置相关字段和逻辑**

---

## 三、数据接口设计

### 3.1 用户相关接口

#### 3.1.1 获取用户信息

```typescript
// Hook: useUserProfile(userId)
const getUserProfile = (userId: string) => {
  const profiles = getFromStorage<UserProfile>('user_profiles');
  return profiles.find(p => p.user_id === userId) || null;
};

// 返回数据结构 (扩展版)
{
  id: number;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  ai_api_key: string | null;           // 新增：AI API密钥（加密存储）
  ai_service_provider: string | null;  // 新增：AI服务商 (openai/gemini/qwen/ernie/custom)
  created_at: string;
  updated_at: string;
}
```

#### 3.1.2 更新用户信息

```typescript
// Hook: updateProfile(updates)
const updateUserProfile = (userId: string, updates: Partial<UserProfile>) => {
  const profiles = getFromStorage<UserProfile>('user_profiles');
  const index = profiles.findIndex(p => p.user_id === userId);

  if (index === -1) return false;

  profiles[index] = {
    ...profiles[index],
    ...updates,
    updated_at: new Date().toISOString()
  };

  saveToStorage('user_profiles', profiles);
  return true;
};
```

---

### 3.2 周期相关接口

#### 3.2.1 获取所有周期

```typescript
// Hook: useCycles(userId)
const getCycles = (userId: string): Cycle[] => {
  const cycles = getFromStorage<Cycle>('cycles');
  return cycles.filter(c => c.user_id === userId)
                .sort((a, b) => a.cycle_number - b.cycle_number);
};

// 返回数据结构 (数组)
[
  {
    id: number;
    user_id: string;
    cycle_number: number;        // 1-37
    start_date: string;          // YYYY-MM-DD
    end_date: string;            // YYYY-MM-DD
    total_days: number;          // 10 or 5
    completion_rate: number;     // 0-100
    status: 'pending' | 'active' | 'completed';
    created_at: string;
    updated_at: string;
  }
]
```

#### 3.2.2 获取当前周期

```typescript
// Hook: currentCycle from useCycles()
const getCurrentCycle = (userId: string): Cycle | null => {
  const cycles = getCycles(userId);
  return cycles.find(c => c.status === 'active') || cycles[0] || null;
};
```

---

### 3.3 记录相关接口

#### 3.3.1 获取单条记录

```typescript
// Hook: useRecords({ userId, cycleId, dimensionId, date })
const getRecord = (params: {
  userId: string;
  cycleId: number;
  dimensionId: number;
  date: string;
}): Record | null => {
  const records = getFromStorage<Record>('records');
  return records.find(r =>
    r.user_id === params.userId &&
    r.cycle_id === params.cycleId &&
    r.dimension_id === params.dimensionId &&
    r.record_date === params.date
  ) || null;
};

// 返回数据结构 (扩展版)
{
  id: number;
  user_id: string;
  cycle_id: number;
  dimension_id: number;
  record_date: string;         // YYYY-MM-DD
  content: string;
  word_count: number;
  ai_suggestions: string | null;  // 新增：AI分析建议
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}
```

#### 3.3.2 保存/更新记录 (Upsert)

```typescript
// Hook: saveRecord(content, status, aiSuggestions)
const saveRecord = (params: {
  userId: string;
  cycleId: number;
  dimensionId: number;
  date: string;
  content: string;
  status?: 'draft' | 'published';
  aiSuggestions?: string;  // 新增：保存AI建议
}): Record => {
  const records = getFromStorage<Record>('records');
  const existing = getRecord(params);

  if (existing) {
    // 更新现有记录
    const index = records.findIndex(r => r.id === existing.id);
    records[index] = {
      ...records[index],
      content: params.content,
      word_count: params.content.length,
      ai_suggestions: params.aiSuggestions || records[index].ai_suggestions,
      status: params.status || 'published',
      updated_at: new Date().toISOString()
    };
    saveToStorage('records', records);

    // 触发完成度更新
    updateCycleCompletionRate(params.cycleId);

    return records[index];
  } else {
    // 插入新记录
    const newRecord: Record = {
      id: generateId(),
      user_id: params.userId,
      cycle_id: params.cycleId,
      dimension_id: params.dimensionId,
      record_date: params.date,
      content: params.content,
      word_count: params.content.length,
      ai_suggestions: params.aiSuggestions || null,
      status: params.status || 'published',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    records.push(newRecord);
    saveToStorage('records', records);

    // 触发完成度更新
    updateCycleCompletionRate(params.cycleId);

    return newRecord;
  }
};
```

#### 3.3.3 按日期范围获取记录 (History 页需要)

```typescript
// TODO: 需要创建新的 Hook 或扩展 useRecords
const getRecordsByDateRange = (params: {
  userId: string;
  cycleId: number;
  startDate: string;
  endDate: string;
}): Record[] => {
  const records = getFromStorage<Record>('records');
  return records.filter(r =>
    r.user_id === params.userId &&
    r.cycle_id === params.cycleId &&
    r.record_date >= params.startDate &&
    r.record_date <= params.endDate
  ).sort((a, b) => b.record_date.localeCompare(a.record_date));
};
```

---

### 3.4 附件相关接口 (新增)

#### 3.4.1 上传附件

```typescript
// Hook: useAttachments - uploadFile(file, fileType)
const uploadAttachment = async (params: {
  userId: string;
  recordId: number;
  file: File;
  fileType: 'image' | 'audio';
}): Promise<RecordAttachment> => {
  // 验证文件大小（5MB限制）
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (params.file.size > maxSize) {
    throw new Error('文件大小超过5MB限制');
  }

  // 本地测试：转base64存储
  if (USE_LOCAL_STORAGE) {
    const base64 = await fileToBase64(params.file);
    const attachments = getFromStorage<RecordAttachment>('record_attachments');
    const newAttachment: RecordAttachment = {
      id: generateId(),
      record_id: params.recordId,
      user_id: params.userId,
      file_type: params.fileType,
      file_url: base64,
      file_name: params.file.name,
      file_size: params.file.size,
      created_at: new Date().toISOString()
    };
    attachments.push(newAttachment);
    saveToStorage('record_attachments', attachments);
    return newAttachment;
  }

  // 生产环境：上传到Supabase Storage
  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(`${params.userId}/${params.recordId}/${params.file.name}`, params.file);

  if (error) throw error;

  // 保存附件记录到数据库
  const attachment: RecordAttachment = {
    id: generateId(),
    record_id: params.recordId,
    user_id: params.userId,
    file_type: params.fileType,
    file_url: data.path,
    file_name: params.file.name,
    file_size: params.file.size,
    created_at: new Date().toISOString()
  };

  // 保存到数据库
  // ... (Supabase insert)

  return attachment;
};

// 附件数据结构
interface RecordAttachment {
  id: number;
  record_id: number;
  user_id: string;
  file_type: 'image' | 'audio';
  file_url: string;           // Supabase路径 或 base64
  file_name: string;
  file_size: number;          // 字节
  created_at: string;
}
```

#### 3.4.2 获取记录的所有附件

```typescript
const getAttachments = (recordId: number): RecordAttachment[] => {
  const attachments = getFromStorage<RecordAttachment>('record_attachments');
  return attachments.filter(a => a.record_id === recordId);
};
```

---

### 3.5 AI解析接口 (新增)

#### 3.5.1 调用AI分析

```typescript
// 测试阶段：Mock AI解析
const mockAIAnalysis = async (content: string, dimension: string): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1500)); // 模拟延迟

  if (dimension === 'Expense') {
    return `分析结果：
- 餐饮: ¥150
- 交通: ¥35
- 其他: ¥20
总计: ¥205

建议：本周餐饮支出偏高，可以考虑自己做饭降低成本。`;
  } else {
    return `总结：${content.substring(0, 50)}...

建议：
1. 保持现有节奏
2. 可以添加更多细节
3. 定期回顾进展`;
  }
};

// 生产环境：调用真实AI API
const callAIAnalysis = async (params: {
  userId: string;
  content: string;
  dimension: string;
}): Promise<string> => {
  // 获取用户配置的API Key
  const profile = getUserProfile(params.userId);
  if (!profile?.ai_api_key) {
    throw new Error('请先在Settings页面配置AI API Key');
  }

  // 根据服务商调用不同API
  const provider = profile.ai_service_provider || 'openai';

  switch (provider) {
    case 'openai':
      return await callOpenAI(profile.ai_api_key, params.content, params.dimension);
    case 'gemini':
      return await callGemini(profile.ai_api_key, params.content, params.dimension);
    // ... 其他服务商
    default:
      throw new Error('不支持的AI服务商');
  }
};
```

---

## 四、Hook设计

### 4.1 已实现的Hooks ✅

#### 4.1.1 useAuth.local.ts ✅

```typescript
/**
 * 用户认证 Hook
 */
export function useAuth(): UseAuthReturn {
  user: User | null;           // 当前用户 { id, phone }
  loading: boolean;
  login: (phone: string) => void;
  logout: () => void;
}

// 使用示例
const { user, login, logout } = useAuth();
```

#### 4.1.2 useUserProfile.local.ts ✅ + 需扩展

```typescript
/**
 * 用户档案 Hook (需扩展AI配置)
 */
export function useUserProfile(userId?: string) {
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => boolean;
  // 新增：AI配置相关方法
  updateAIConfig: (apiKey: string, provider: string) => boolean;
  testAIConnection: () => Promise<boolean>;
}
```

#### 4.1.3 useCycles.local.ts ✅

```typescript
/**
 * 周期管理 Hook
 */
export function useCycles(userId?: string): UseCyclesReturn {
  cycles: Cycle[];
  currentCycle: Cycle | null;
  loading: boolean;
  refreshCycles: () => void;
}
```

#### 4.1.4 useRecords.local.ts ✅ + 需扩展

```typescript
/**
 * 记录管理 Hook (需扩展AI建议)
 */
export function useRecords(params: UseRecordsParams): UseRecordsReturn {
  record: Record | null;
  loading: boolean;
  saving: boolean;
  saveRecord: (content: string, status?: 'draft' | 'published', aiSuggestions?: string) => boolean;
  // 新增：AI分析
  analyzeWithAI: () => Promise<string>;
}
```

#### 4.1.5 useDimensions.local.ts ✅

```typescript
/**
 * 维度配置 Hook
 */
export function useDimensions(userId?: string) {
  dimensions: Dimension[];
  loading: boolean;
  updateDimension: (dimensionId: number, updates: Partial<Dimension>) => boolean;
}
```

---

### 4.2 需要创建的新Hooks

#### 4.2.1 useAttachments.local.ts 🔄 优先级高

```typescript
/**
 * 附件管理 Hook
 * 用于 Record.tsx 和 History.tsx
 */
export function useAttachments(recordId?: number, userId?: string) {
  // 返回值
  attachments: RecordAttachment[];
  loading: boolean;
  uploading: boolean;

  // 方法
  uploadImage: (file: File) => Promise<RecordAttachment>;
  capturePhoto: () => Promise<RecordAttachment>;
  recordVoice: () => Promise<{ text: string; attachment?: RecordAttachment }>;
  deleteAttachment: (id: number) => boolean;
}

// 使用示例
const { attachments, uploadImage, capturePhoto, recordVoice, uploading } = useAttachments(record?.id, user?.id);
```

#### 4.2.2 useSpeechRecognition.local.ts 🔄 优先级高

```typescript
/**
 * 语音识别 Hook
 * 使用 Web Speech API
 */
export function useSpeechRecognition() {
  // 返回值
  transcript: string;         // 实时转换的文字
  isListening: boolean;
  isSupported: boolean;       // 浏览器是否支持

  // 方法
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

// 使用示例
const { transcript, isListening, startListening, stopListening } = useSpeechRecognition();
```

#### 4.2.3 useExpenses.local.ts 🔄 中等优先级

```typescript
/**
 * 开销管理 Hook
 * 用于 Expense.tsx 和 History.tsx
 */
export function useExpenses(params: {
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  // 返回值
  expenses: Expense[];
  loading: boolean;

  // 方法
  saveExpense: (expense: ExpenseInput) => Promise<Expense>;
  getExpensesByDateRange: (start: string, end: string) => Expense[];
  deleteExpense: (id: number) => boolean;
  getTotalByCategory: (category: string) => number;
  getTotalAmount: () => number;
}

// 使用示例
const { expenses, saveExpense, getTotalAmount } = useExpenses({
  userId: user.id,
  startDate: '2026-02-24',
  endDate: '2026-03-05'
});
```

#### 4.2.4 useHistory.local.ts 🔄 中等优先级

```typescript
/**
 * 历史记录 Hook
 * 用于 History.tsx
 */
export function useHistory(params: {
  userId?: string;
  cycleId?: number;
}) {
  // 返回值
  records: RecordWithDetails[];  // 包含维度、附件、开销信息
  loading: boolean;

  // 方法
  searchRecords: (query: string) => RecordWithDetails[];
  filterByDimension: (dimensionId: number) => RecordWithDetails[];
  filterByDateRange: (start: string, end: string) => RecordWithDetails[];
  loadRecordsByCycle: (cycleId: number) => void;  // 新增：加载指定周期
}
```

#### 4.2.5 useAIAnalysis.local.ts 🔄 优先级高

```typescript
/**
 * AI分析 Hook
 * 用于 Record.tsx 和 Expense.tsx
 */
export function useAIAnalysis(userId?: string) {
  // 返回值
  analyzing: boolean;
  result: string | null;
  error: string | null;

  // 方法
  analyze: (content: string, dimension: string) => Promise<string>;
  clearResult: () => void;
}

// 使用示例
const { analyzing, result, analyze } = useAIAnalysis(user?.id);
```

---

## 五、实时数据同步

### 5.1 localStorage 版本（当前）

- 数据存储在浏览器 localStorage
- 无实时同步功能
- 刷新页面时重新加载数据

### 5.2 Supabase 版本（未来）

```typescript
// 示例: Home.tsx - 订阅周期完成度变化
useEffect(() => {
  if (!userId) return;

  const channel = supabase
    .channel(`cycles-${userId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'cycles',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      // 更新本地周期数据
      setCycles(prev =>
        prev.map(c =>
          c.id === payload.new.id
            ? { ...c, completion_rate: payload.new.completion_rate }
            : c
        )
      );
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [userId]);
```

---

## 六、API调用流程

### 6.1 场景: 保存记录（更新版）

```
用户在 Record.tsx 输入内容
  ↓
点击"Save"按钮
  ↓
handleSaveRecord()
  ├─ 验证: note 不为空
  ├─ 调用: saveRecord(note, 'published', aiSuggestions)
  │    ↓
  │   useRecords.saveRecord()
  │    ├─ localRecords.save({ userId, cycleId, dimensionId, date, content, aiSuggestions })
  │    ├─ 写入 localStorage
  │    └─ 触发 localCycles.updateCompletionRate(cycleId)
  │         ├─ 计算完成度百分比
  │         └─ 更新 cycles 数据
  │
  ├─ 返回成功/失败
  └─ 显示 Toast 提示
```

### 6.2 场景: 上传图片

```
用户点击"图片按钮"
  ↓
打开文件选择器
  ↓
选择图片文件
  ↓
handleImageUpload(file)
  ├─ 验证: 文件大小 <= 5MB
  ├─ 验证: 文件类型为图片
  ├─ 调用: uploadImage(file)
  │    ↓
  │   useAttachments.uploadImage()
  │    ├─ 本地环境: 转base64存localStorage
  │    └─ 生产环境: 上传到Supabase Storage
  │         ├─ supabase.storage.upload()
  │         └─ 保存附件记录到 record_attachments
  │
  ├─ 更新UI显示缩略图
  └─ 显示上传成功提示
```

### 6.3 场景: AI分析

```
用户输入内容后点击"AI Parse"按钮
  ↓
handleAIAnalysis()
  ├─ 获取当前textarea内容
  ├─ 调用: analyzeWithAI()
  │    ↓
  │   useAIAnalysis.analyze(content, dimension)
  │    ├─ 测试环境: 调用mockAIAnalysis()
  │    └─ 生产环境:
  │         ├─ 获取用户AI配置 (API Key + Provider)
  │         ├─ 调用对应AI服务API
  │         └─ 返回分析结果
  │
  ├─ 显示结果到AI建议文本框
  └─ 可选：保存到record.ai_suggestions
```

---

## 七、错误处理与验证

### 7.1 数据验证规则

| 字段 | 验证规则 | 错误提示 |
|------|--------|---------|
| **记录内容** | 不能为空 | "请输入记录内容" |
| **选中日期** | 必须在周期范围内 | "只能编辑当前周期的记录" |
| **附件大小** | 单个文件 <= 5MB | "文件大小超过5MB限制" |
| **附件类型** | 图片格式：JPEG/PNG/WEBP | "不支持的文件格式" |
| **AI API Key** | 不能为空且格式有效 | "请输入有效的API Key" |
| **开销金额** | 必须大于0 | "金额必须大于0" |
| **用户昵称** | 1-50字符 | "昵称长度不符" |

### 7.2 错误处理示例

```typescript
const handleSaveRecord = async () => {
  try {
    if (!note.trim()) {
      showToast('请输入记录内容', 'error');
      return;
    }

    if (!user || !currentCycle) {
      showToast('用户信息加载失败', 'error');
      return;
    }

    const success = await saveRecord(note, 'published', aiSuggestions);
    if (success) {
      showToast('记录已保存', 'success');
      setNote('');
    } else {
      showToast('保存失败，请重试', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('发生未知错误', 'error');
  }
};
```

---

## 八、性能优化建议

### 8.1 数据加载优化

1. **缓存机制**: localStorage 本身就是缓存
2. **按需加载**: 只加载当前周期的数据
3. **分页加载**: History 页面限制单次显示 50 条
4. **图片懒加载**: 使用Intersection Observer延迟加载图片
5. **Base64优化**: 本地测试时图片压缩后存储

### 8.2 渲染优化

1. **使用 React.memo**: 对不常更新的组件使用 memo
2. **防抖/节流**: 搜索、日期选择等输入加防抖
3. **虚拟列表**: History 页面长列表使用虚拟滚动
4. **语音识别节流**: 语音转文字结果节流更新

---

## 九、迁移计划 (localStorage → Supabase)

### 9.1 迁移步骤

1. **第一阶段** ✅: 使用 localStorage 实现核心功能
2. **第二阶段** 🔄: 完善附件、AI等新功能
3. **第三阶段**: 配置 Supabase 项目和数据库
4. **第四阶段**: 创建 Supabase 版本的 Hooks
5. **第五阶段**: 修改导入路径完成切换
6. **第六阶段**: 数据迁移脚本

### 9.2 Hook 命名约定

```
当前:   useRecords.local.ts  (localStorage)
迁移后: useRecords.ts        (Supabase)
```

---

## 十、测试清单

### 10.1 功能测试

#### Home页 ✅ + 🔄
- [x] 显示用户信息
- [x] 显示当前周期进度
- [x] 显示今日各维度完成状态
- [ ] 添加状态栏
- [ ] 周期矩阵点击交互（已完成+当前可点，未来禁用）
- [ ] 点击跳转History并自动筛选

#### Record页 ✅ + 🔄
- [x] 维度切换
- [x] 日期选择
- [x] 保存记录
- [ ] 修复今日概览Bug（查询所有维度）
- [ ] 保存按钮固定"Save"
- [ ] 拍照功能（调用摄像头）
- [ ] 语音转文字（Web Speech API）
- [ ] 图片上传（5MB限制）
- [ ] AI解析（所有维度）
- [ ] AI建议显示框
- [ ] 今日完成按钮（自定义确认框）
- [ ] 保存所有维度逻辑

#### History页 ❌ + 🔄
- [ ] 显示记录列表
- [ ] 日期范围筛选
- [ ] 维度筛选
- [ ] 全文搜索
- [ ] 接收cycleId参数自动筛选
- [ ] 显示附件缩略图

#### Report页 ❌
- [ ] 周期报告生成
- [ ] 时间轴显示
- [ ] 数据洞察图表

#### Profile页 ❌ + 🔄
- [ ] 修改昵称
- [ ] 上传头像
- [ ] AI API Key配置
- [ ] AI服务商选择
- [ ] API连接测试
- [ ] 退出登录

---

## 十一、开发优先级

### P0 - 核心功能 ✅ 已完成

- [x] Home 页显示周期和今日状态
- [x] Record 页记录保存
- [x] 周期完成度自动计算

### P1 - 重要功能 🔄 本次更新重点

**首页改进:**
- [ ] 添加状态栏
- [ ] 周期矩阵点击跳转History

**Record页改进（优先级最高）:**
- [ ] 修复今日概览Bug
- [ ] 保存按钮改为"Save"
- [ ] 拍照功能
- [ ] 语音转文字
- [ ] 图片上传
- [ ] AI解析（所有维度）
- [ ] AI建议显示框
- [ ] 今日完成确认框

**History页基础功能:**
- [ ] 查看历史记录
- [ ] 日期筛选（支持cycleId参数）
- [ ] 维度筛选

**Profile页AI配置:**
- [ ] API Key配置
- [ ] 服务商选择

### P2 - 增强功能 ❌ 未来开发

- [ ] Report 页数据可视化
- [ ] OCR图片识别
- [ ] 高级AI分析
- [ ] 导出报告功能

---

## 十二、总结

### 当前状态

✅ **已完成:**
- Home 页和 Record 页核心功能
- 本地存储数据层
- 5个基础 Hooks

🔄 **本次更新重点:**
- Record页重大功能扩展（拍照、语音、图片、AI）
- 首页周期矩阵交互
- History页接收参数自动筛选
- Profile页AI配置
- 数据结构扩展（附件表、AI字段）

❌ **待开发:**
- Report 页面完整功能
- Expense 页面深度集成
- 迁移到 Supabase

### 下一步工作

**立即实施（P1）:**
1. 修复Record页今日概览Bug
2. 实现附件上传功能（拍照、图片、语音）
3. 实现AI解析功能（所有维度）
4. 完善History页基础功能
5. 添加Profile页AI配置
6. 首页周期矩阵交互

**需要外部服务的功能（后续）:**
- Supabase 数据库和存储（生产环境）
- 用户自定义AI API（用户提供Key）

---

**文档版本**: v1.1
**最后更新**: 2026-02-25
**更新内容**: 添加附件、AI、语音等新功能设计
**维护者**: Claude AI Assistant
