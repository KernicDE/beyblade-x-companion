import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { PartPicker } from '../components/PartPicker';
import { RadarChart } from '../components/RadarChart';
import { useConfiguratorStore } from '../stores/configurator';
import { useProfileStore } from '../stores/profile';
import { calculateComboRatings } from '../utils/data';

export function Configurator() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { database, loading, error } = useData();
  const {
    bladeId,
    assistBladeId,
    ratchetId,
    bitId,
    setBlade,
    setAssistBlade,
    setRatchet,
    setBit,
    loadCombo,
  } = useConfiguratorStore();
  const { addCreation, updateCreation, creations } = useProfileStore();

  const [saveName, setSaveName] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const editingId = searchParams.get('edit');

  useEffect(() => {
    if (editingId) {
      const creation = creations.find((c) => c.id === editingId);
      if (creation) {
        loadCombo({
          bladeId: creation.bladeId,
          assistBladeId: creation.assistBladeId,
          ratchetId: creation.ratchetId,
          bitId: creation.bitId,
        });
        setSaveName(creation.name);
      }
    }
  }, [editingId, creations, loadCombo]);

  if (loading) return <p className="text-gray-600">Loading database…</p>;
  if (error || !database) return <p className="text-red-600">Failed to load database.</p>;

  const combo = { bladeId, assistBladeId, ratchetId, bitId };
  const ratings = calculateComboRatings(database, combo);
  const canSave = bladeId && ratchetId && bitId && saveName.trim();

  const handleSave = () => {
    if (!canSave) return;
    const data = {
      name: saveName.trim(),
      bladeId,
      assistBladeId,
      ratchetId,
      bitId,
    };

    if (editingId) {
      updateCreation(editingId, data);
      setSavedMessage('Creation updated.');
    } else {
      const creation = addCreation(data);
      setSearchParams({ edit: creation.id });
      setSavedMessage('Creation saved.');
    }

    setTimeout(() => setSavedMessage(''), 3000);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Configurator</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <PartPicker
          category="blade"
          label="Blade"
          parts={database.blades}
          selectedId={bladeId}
          onSelect={(id) => id && setBlade(id)}
        />
        <PartPicker
          category="assistBlade"
          label="Assist Blade"
          parts={database.assistBlades}
          selectedId={assistBladeId}
          onSelect={setAssistBlade}
          allowNone
        />
        <PartPicker
          category="ratchet"
          label="Ratchet"
          parts={database.ratchets}
          selectedId={ratchetId}
          onSelect={(id) => id && setRatchet(id)}
        />
        <PartPicker
          category="bit"
          label="Bit"
          parts={database.bits}
          selectedId={bitId}
          onSelect={(id) => id && setBit(id)}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Resulting Ratings</h2>
          <RadarChart ratings={ratings} size={320} />
          <p className="mt-4 text-sm text-gray-500">
            Attack {ratings.attack} · Defense {ratings.defense} · Stamina {ratings.stamina} · Balance {ratings.balance}
          </p>
        </div>

        <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Save Creation</h2>
          <div className="flex flex-col gap-2">
            <label htmlFor="creation-name" className="text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="creation-name"
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="My custom combo"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {editingId ? 'Update Creation' : 'Save Creation'}
          </button>
          {savedMessage && (
            <p className="text-sm text-green-600">{savedMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
