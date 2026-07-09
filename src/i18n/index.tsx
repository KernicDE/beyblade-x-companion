import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

type Locale = 'en' | 'de';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'bx-locale';

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && (stored === 'en' || stored === 'de')) return stored;
  const lang = navigator.language || (navigator as unknown as { languages?: string[] }).languages?.[0] || 'en';
  return lang.startsWith('de') ? 'de' : 'en';
}

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
        acc[fullKey] = value;
      } else if (value && typeof value === 'object') {
        Object.assign(acc, flatten(value as Record<string, unknown>, fullKey));
      }
      return acc;
    },
    {} as Record<string, string>
  );
}

async function loadLocale(locale: Locale): Promise<Record<string, string>> {
  const mod = await import(`./locales/${locale}.json`);
  return flatten(mod.default);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
  }, []);

  useEffect(() => {
    const initial = detectLocale();
    setLocaleState(initial);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadLocale(locale).then((msgs) => {
      if (!cancelled) {
        setMessages(msgs);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let text = messages[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
        });
      }
      return text;
    },
    [messages]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {ready ? children : null}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return ctx;
}
