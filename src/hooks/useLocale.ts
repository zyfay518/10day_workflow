import { useEffect, useMemo, useState } from 'react';
import { getLocaleSetting, onLocaleChange, resolveLocale, setLocaleSetting, t, type LocaleResolved, type LocaleSetting } from '../lib/i18n';

export function useLocale() {
  const [setting, setSetting] = useState<LocaleSetting>(() => getLocaleSetting());

  useEffect(() => {
    return onLocaleChange(() => setSetting(getLocaleSetting()));
  }, []);

  const locale: LocaleResolved = useMemo(() => resolveLocale(setting), [setting]);

  return {
    setting,
    locale,
    setSetting: (next: LocaleSetting) => setLocaleSetting(next),
    tr: (key: string, fallback?: string) => t(key, locale, fallback),
  };
}
