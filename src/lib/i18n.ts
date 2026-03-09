import en from '../locales/en';
import zh from '../locales/zh';

export type LocaleSetting = 'system' | 'zh' | 'en';
export type LocaleResolved = 'zh' | 'en';

const LOCALE_KEY = 'app_locale';
const LOCALE_EVENT = 'app-locale-change';

const packs = { en, zh } as const;

type MessageKey = keyof typeof en;

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

const dimMap: Record<string, { en: string; zh: string }> = {
  Health: { en: 'Health', zh: '健康' },
  Work: { en: 'Work', zh: '工作' },
  Study: { en: 'Study', zh: '学习' },
  Wealth: { en: 'Wealth', zh: '财富' },
  Family: { en: 'Family', zh: '家庭' },
  Other: { en: 'Other', zh: '其他' },
  健康: { en: 'Health', zh: '健康' },
  工作: { en: 'Work', zh: '工作' },
  学习: { en: 'Study', zh: '学习' },
  财富: { en: 'Wealth', zh: '财富' },
  家庭: { en: 'Family', zh: '家庭' },
  其他: { en: 'Other', zh: '其他' },
};

export function t(key: string, locale: LocaleResolved, fallback?: string) {
  const pack = packs[locale];
  const val = (pack as Record<string, string>)[key];
  return val ?? fallback ?? key;
}

export function tStrict(key: MessageKey, locale: LocaleResolved) {
  return packs[locale][key];
}

export function tDimension(name: string, locale: LocaleResolved) {
  const item = dimMap[name];
  return item ? item[locale] : name;
}
