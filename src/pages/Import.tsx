import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profile';
import { decompressProfile } from '../utils/links';

export function Import() {
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
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-red-600">Invalid import link</h1>
        <p className="mt-2 text-gray-600">The link could not be decoded.</p>
      </div>
    );
  }

  if (status === 'imported') {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-green-600">Profile imported</h1>
        <p className="mt-2 text-gray-600">Your saved creations have been updated.</p>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Go to Profile
        </button>
      </div>
    );
  }

  if (status === 'confirm') {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">Import Profile</h1>
        <p className="mt-2 text-gray-700">
          This will replace your {creations.length} locally saved creation
          {creations.length === 1 ? '' : 's'} with {incomingCount} creation
          {incomingCount === 1 ? '' : 's'} from the link.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          This cannot be undone. Make sure you have exported your current profile if you want to keep it.
        </p>
        <div className="mt-6 flex gap-4">
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Replace and Import
          </button>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-900 hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return <p className="text-gray-600">Decoding link…</p>;
}
