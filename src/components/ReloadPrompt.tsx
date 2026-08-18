import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n';

export function ReloadPrompt() {
  const { t } = useTranslation();
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        registerSW({
          immediate: true,
          onNeedRefresh() {
            setNeedRefresh(true);
          },
          onOfflineReady() {
            // no-op
          },
        });
      })
      .catch(() => {});
  }, []);

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-blue-600 p-4 text-white shadow-lg">
      <p className="text-sm font-medium">{t('reloadPrompt.title')}</p>
      <p className="mt-1 text-xs text-blue-100">{t('reloadPrompt.description')}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-3 rounded bg-white px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
      >
        {t('reloadPrompt.reload')}
      </button>
    </div>
  );
}
