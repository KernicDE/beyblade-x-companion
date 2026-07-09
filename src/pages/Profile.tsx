import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { RatingBars } from '../components/RatingBars';
import { useProfileStore } from '../stores/profile';
import { calculateComboRatings } from '../utils/data';
import { compressCreation, compressProfile } from '../utils/links';

export function Profile() {
  const navigate = useNavigate();
  const { database } = useData();
  const { creations, deleteCreation, duplicateCreation } = useProfileStore();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState('');

  const handleShare = async (creationId: string) => {
    const creation = creations.find((c) => c.id === creationId);
    if (!creation) return;
    const compressed = compressCreation(creation);
    const url = `${window.location.origin}${window.location.pathname}#/view/${compressed}`;
    await navigator.clipboard.writeText(url);
    setExportMessage('Share link copied to clipboard.');
    setTimeout(() => setExportMessage(''), 3000);
  };

  const handleExport = async () => {
    const profile = { version: 1, creations };
    const compressed = compressProfile(profile);
    const url = `${window.location.origin}${window.location.pathname}#/import?d=${compressed}`;
    await navigator.clipboard.writeText(url);
    setExportMessage('Profile export link copied to clipboard.');
    setTimeout(() => setExportMessage(''), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300"
        >
          Export Profile
        </button>
      </div>

      {exportMessage && (
        <p className="text-sm text-green-600">{exportMessage}</p>
      )}

      {creations.length === 0 ? (
        <p className="text-gray-600">No saved creations yet. Build one in the configurator.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {creations.map((creation) => {
            const ratings = database
              ? calculateComboRatings(database, creation)
              : { attack: 0, defense: 0, stamina: 0, balance: 0 };

            return (
              <div key={creation.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">{creation.name}</h2>
                    {creation.note && (
                      <p className="text-sm text-gray-500">{creation.note}</p>
                    )}
                  </div>
                  <RatingBars ratings={ratings} size="sm" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/configurator?edit=${creation.id}`)}
                    className="rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateCreation(creation.id)}
                    className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShare(creation.id)}
                    className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(creation.id)}
                    className="rounded-md bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>

                {confirmDelete === creation.id && (
                  <div className="mt-4 rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-800">
                      Delete "{creation.name}"?
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          deleteCreation(creation.id);
                          setConfirmDelete(null);
                        }}
                        className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="rounded-md bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
