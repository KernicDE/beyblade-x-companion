import { useThemeStore } from '../stores/theme';
import { useTranslation } from '../i18n';

export function Settings() {
  const { t, locale, setLocale } = useTranslation();
  const { theme, setTheme } = useThemeStore();

  const themeOptions: Array<{ value: typeof theme; labelKey: string }> = [
    { value: 'system', labelKey: 'theme.auto' },
    { value: 'light', labelKey: 'theme.light' },
    { value: 'dark', labelKey: 'theme.dark' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('nav.settings')}</h1>

      <div className="rounded-xl bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">{t('settings.appearance')}</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('settings.theme')}</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as typeof theme)}
              className="rounded border border-gray-300 dark:border-slate-600 bg-[var(--bg)] px-3 py-2 text-sm"
            >
              {themeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('settings.language')}</label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as typeof locale)}
              className="rounded border border-gray-300 dark:border-slate-600 bg-[var(--bg)] px-3 py-2 text-sm"
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
