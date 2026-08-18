import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useBuildsStore } from '../stores/builds';
import { decompressProfile } from '../utils/links';
import { useTranslation } from '../i18n';
import type { Build } from '../types';

export function Import() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { builds, add } = useBuildsStore();
  const [status, setStatus] = useState<'idle' | 'confirm' | 'importing' | 'imported' | 'error'>('idle');
  const [incoming, setIncoming] = useState<Build[]>([]);

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

    const incomingBuilds = profile.builds.map((build) => ({
      ...build,
      name: build.name || `${t('configurator.placeholder')} (Import)`,
    }));
    setIncoming(incomingBuilds);

    if (builds.length === 0) {
      void importBuilds(incomingBuilds);
    } else {
      setStatus('confirm');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, builds.length]);

  const importBuilds = async (buildsToImport: Build[]) => {
    setStatus('importing');
    try {
      await Promise.all(
        buildsToImport.map((build) =>
          add({
            name: build.name,
            note: build.note,
            bladeId: build.bladeId,
            assistBladeId: build.assistBladeId,
            ratchetId: build.ratchetId,
            bitId: build.bitId,
            isPublic: false,
          })
        )
      );
      setStatus('imported');
    } catch {
      setStatus('error');
    }
  };

  const handleConfirm = () => {
    void importBuilds(incoming);
  };

  if (status === 'error') {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h1 className="text-xl font-bold text-red-600 dark:text-red-400">{t('import.invalidLink')}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t('import.decodeError')}</p>
      </div>
    );
  }

  if (status === 'importing') {
    return <p className="text-gray-600 dark:text-gray-400">{t('import.decoding')}</p>;
  }

  if (status === 'imported') {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <h1 className="text-xl font-bold text-green-600 dark:text-green-400">{t('import.imported')}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{t('import.importedDesc')}</p>
        <button
          type="button"
          onClick={() => navigate('/builds')}
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
            local: builds.length,
            localS: builds.length === 1 ? '' : 'n',
            incoming: incoming.length,
            incomingS: incoming.length === 1 ? '' : 'n',
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
            onClick={() => navigate('/builds')}
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
