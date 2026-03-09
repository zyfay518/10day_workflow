export type LocaleSetting = 'system' | 'zh' | 'en';
export type LocaleResolved = 'zh' | 'en';

const LOCALE_KEY = 'app_locale';
const LOCALE_EVENT = 'app-locale-change';

const dict: Record<string, { en: string; zh: string }> = {
  nav_home: { en: 'Home', zh: '首页' },
  nav_goals: { en: 'Goals', zh: '目标' },
  nav_lib: { en: 'Lib', zh: '知识库' },
  nav_history: { en: 'History', zh: '历史' },
  nav_report: { en: 'Report', zh: '报告' },
  nav_profile: { en: 'Profile', zh: '我的' },
  nav_record_hold: { en: 'Click to record, hold 2 seconds for voice', zh: '点击记录，长按2秒语音输入' },

  voice_title: { en: 'Voice Quick Capture', zh: '语音快记' },
  voice_listening: { en: 'Listening', zh: '监听中' },
  voice_paused: { en: 'Paused', zh: '已暂停' },
  voice_start_listening: { en: 'Start Listening', zh: '开始监听' },
  voice_pause: { en: 'Pause', zh: '暂停' },
  voice_parse_review: { en: 'Parse & Review', zh: '解析并预览' },
  voice_parsing: { en: 'Parsing...', zh: '解析中...' },
  voice_save_library: { en: 'Save to Library', zh: '保存到知识库' },
  voice_live_placeholder: { en: 'Live transcript will appear here... You can edit manually.', zh: '实时转写会显示在这里…你可以手动编辑。' },
  voice_summary: { en: 'Summary', zh: '摘要' },
  voice_records_editable: { en: 'Records (editable)', zh: '记录（可编辑）' },
  voice_cycle_goals_editable: { en: 'Cycle Goals (editable)', zh: '周期目标（可编辑）' },
  voice_daily_goals_editable: { en: 'Daily Goals (editable date)', zh: '每日目标（日期可编辑）' },
  voice_confirm_save: { en: 'Confirm & Save to Records/Goals', zh: '确认并保存到记录/目标' },
  voice_msg_parse_failed: { en: 'Parsing failed. Please try again.', zh: '解析失败，请重试。' },
  voice_msg_cycle_missing: { en: 'Current cycle is missing. Please refresh Home first.', zh: '当前周期缺失，请先刷新首页。' },
  voice_msg_dim_not_ready: { en: 'Dimensions are not ready. Please reopen this panel in 1-2 seconds.', zh: '维度尚未就绪，请1-2秒后重新打开。' },
  voice_msg_save_failed: { en: 'Save failed. Please review and try again.', zh: '保存失败，请检查后重试。' },
  voice_msg_saved_library: { en: 'Saved to Library.', zh: '已保存到知识库。' },

  profile_settings: { en: 'Settings', zh: '设置' },
  profile_account: { en: 'Account', zh: '账号' },
  profile_integration: { en: 'Integration', zh: '集成' },
  profile_language: { en: 'Language', zh: '语言' },
  profile_follow_system: { en: 'Follow System', zh: '跟随系统' },
  profile_language_desc: { en: 'Non-Chinese system languages default to English.', zh: '非中文系统默认使用英文。' },
  profile_language_value_system: { en: 'System', zh: '系统' },
  profile_language_value_zh: { en: '中文', zh: '中文' },
  profile_language_value_en: { en: 'English', zh: 'English' },
  profile_select_language: { en: 'Select Language', zh: '选择语言' },

  home_loading: { en: 'Loading...', zh: '加载中...' },
  home_completion_rate: { en: 'Completion Rate', zh: '完成率' },
  home_yellow_current: { en: 'Yellow = Current Period', zh: '黄色 = 当前周期' },
  home_period: { en: 'Period', zh: '周期' },
  home_days_total: { en: 'days total', zh: '天总计' },
  home_period_goals: { en: 'Period Goals:', zh: '周期目标：' },

  auth_welcome_back: { en: 'Welcome back to your journey', zh: '欢迎回来，继续你的成长旅程' },
  auth_start_growth: { en: 'Start your growth loop today', zh: '今天开始你的成长循环' },
  auth_email: { en: 'Email', zh: '邮箱' },
  auth_password: { en: 'Password', zh: '密码' },
  auth_enter_email: { en: 'Enter your email', zh: '输入邮箱' },
  auth_enter_password: { en: 'Enter your password', zh: '输入密码' },
  auth_create_password: { en: 'Create a password (min 6 chars)', zh: '创建密码（至少6位）' },
  auth_log_in: { en: 'Log In', zh: '登录' },
  auth_sign_up: { en: 'Sign Up', zh: '注册' },
  auth_no_account: { en: "Don't have an account?", zh: '还没有账号？' },
  auth_have_account: { en: 'Already have an account?', zh: '已有账号？' },
  auth_log_in_lower: { en: 'Log in', zh: '登录' },
  auth_sign_up_lower: { en: 'Sign up', zh: '注册' },
  profile_edit_nickname: { en: 'Edit Nickname', zh: '编辑昵称' },
  profile_logout: { en: 'Logout', zh: '退出登录' },
  profile_cancel: { en: 'Cancel', zh: '取消' },
  profile_save: { en: 'Save', zh: '保存' },

  loading_workspace: { en: 'Loading your workspace...', zh: '正在加载你的工作空间...' },
};

export function getLocaleSetting(): LocaleSetting {
  const v = localStorage.getItem(LOCALE_KEY) as LocaleSetting | null;
  if (v === 'zh' || v === 'en' || v === 'system') return v;
  return 'system';
}

export function resolveLocale(setting: LocaleSetting): LocaleResolved {
  if (setting === 'zh' || setting === 'en') return setting;
  const lang = (navigator.language || '').toLowerCase();
  return lang.startsWith('zh') ? 'zh' : 'en';
}

export function setLocaleSetting(next: LocaleSetting) {
  localStorage.setItem(LOCALE_KEY, next);
  window.dispatchEvent(new Event(LOCALE_EVENT));
}

export function onLocaleChange(cb: () => void) {
  const fn = () => cb();
  window.addEventListener(LOCALE_EVENT, fn);
  window.addEventListener('storage', fn);
  return () => {
    window.removeEventListener(LOCALE_EVENT, fn);
    window.removeEventListener('storage', fn);
  };
}

export function t(key: string, locale: LocaleResolved, fallback?: string) {
  const item = dict[key];
  if (!item) return fallback || key;
  return item[locale] || fallback || key;
}
