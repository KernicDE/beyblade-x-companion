import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profile';
import { decompressProfile } from '../utils/links';
import { useTranslation } from '../i18n';

export function Import() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { creations, replaceProfile } = useProfileStore();
  const [status, setStatus] = useState<'idle' | 'confirm' | 'imported' | 'error'>('idle');
  const [incomingCount, setIncomingCount] = useState(0);

  useEffect(() => {
    const compressed = searchParams.get('d');
    if (!compressed) {
      setStatus('error');
      return;
    }

    const profile = decompressProfile(compressed);
    if (!profile) {
      setStatus('error');
      return;
    }

    setIncomingCount(profile.creations.length);

    if (creations.length === 0) {
      replaceProfile(profile);
      setStatus('imported');
    } else {
      setStatus('confirm');
    }
  }, [searchParams, creations.length, replaceProfile]);

  const handleConfirm = () => {
    const compressed = searchParams.get('d');
    if (!compressed) return;
    const profile = decompressProfile(compressed);
    if (!profile) return;
    replaceProfile(profile);
    setStatus('imported');
  };

  if (status === 'error') {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h1 className="text-xl font-bold text-red-600 dark:text-red-400">{t('import.invalidLink')}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t('import.decodeError')}</p>
      </div>
    );
  }

  if (status === 'imported') {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h1 className="text-xl font-bold text-green-600 dark:text-green-400">{t('import.imported')}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t('import.importedDesc')}</p>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {t('import.goToProfile')}
        </button>
      </div>
    );
  }

  if (status === 'confirm') {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h1 className="text-xl font-bold">{t('import.title')}</h1>
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          {t('import.replaceDesc', {
            local: creations.length,
            localS: creations.length === 1 ? '' : 'n',
            incoming: incomingCount,
            incomingS: incomingCount === 1 ? '' : 'n',
          })}
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('import.cannotUndo')}
        </p>
        <div className="mt-6 flex gap-4">
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {t('import.replaceAndImport')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
          >
            {t('profile.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return <p className="text-gray-600 dark:text-gray-400">{t('import.decoding')}</p>;
}
