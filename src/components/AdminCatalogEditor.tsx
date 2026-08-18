import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../i18n';
import { useData } from '../hooks/useData';
import * as api from '../api/client';
import type { Bey, Part, PartCategory } from '../types';

type EditorTab = 'beys' | 'parts' | 'barcodes';

const PART_CATEGORIES: PartCategory[] = ['blade', 'assistBlade', 'ratchet', 'bit'];

function formatPrice(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function AdminCatalogEditor() {
  const { t } = useTranslation();
  const { database, loading, error } = useData();
  const [activeTab, setActiveTab] = useState<EditorTab>('beys');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Beys
  const [selectedBeyId, setSelectedBeyId] = useState<string>('');
  const [beyForm, setBeyForm] = useState<Partial<Bey>>({});

  // Parts
  const [selectedCategory, setSelectedCategory] = useState<PartCategory>('blade');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [partForm, setPartForm] = useState<Partial<Part>>({});

  // Barcodes
  const [barcodeBeyId, setBarcodeBeyId] = useState<string>('');
  const [barcodeCode, setBarcodeCode] = useState('');
  const [barcodeFormat, setBarcodeFormat] = useState('');
  const [barcodeManufacturer, setBarcodeManufacturer] = useState('');
  const [barcodeSource, setBarcodeSource] = useState('');

  const sortedBeys = useMemo(() => {
    if (!database) return [];
    return [...database.beys].sort((a, b) => a.name.localeCompare(b.name));
  }, [database]);

  const partsByCategory = useMemo(() => {
    if (!database) return [];
    switch (selectedCategory) {
      case 'blade':
        return database.blades;
      case 'assistBlade':
        return database.assistBlades;
      case 'ratchet':
        return database.ratchets;
      case 'bit':
        return database.bits;
      default:
        return [];
    }
  }, [database, selectedCategory]);

  const sortedParts = useMemo(() => {
    return [...partsByCategory].sort((a, b) => a.name.localeCompare(b.name));
  }, [partsByCategory]);

  useEffect(() => {
    const bey = sortedBeys.find((b) => b.id === selectedBeyId);
    setBeyForm(bey ? { ...bey } : {});
  }, [selectedBeyId, sortedBeys]);

  useEffect(() => {
    const part = sortedParts.find((p) => p.id === selectedPartId);
    setPartForm(part ? { ...part } : {});
  }, [selectedPartId, sortedParts]);

  const showMessage = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      setSaveSuccess(message);
      setSaveError(null);
    } else {
      setSaveError(message);
      setSaveSuccess(null);
    }
    window.setTimeout(() => {
      setSaveSuccess(null);
      setSaveError(null);
    }, 3000);
  };

  const handleBeySave = async () => {
    if (!selectedBeyId) return;
    try {
      await api.editBey(selectedBeyId, {
        name: beyForm.name,
        manufacturer: beyForm.manufacturer,
        releaseDate: beyForm.releaseDate,
        releaseWave: beyForm.releaseWave,
        priceEur: beyForm.priceEur,
        priceUsd: beyForm.priceUsd,
        priceJpy: beyForm.priceJpy,
        imageUrl: beyForm.imageUrl,
        bladeId: beyForm.bladeId,
        assistBladeId: beyForm.assistBladeId,
        ratchetId: beyForm.ratchetId,
        bitId: beyForm.bitId,
      });
      showMessage('success', t('admin.saved'));
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : t('admin.saveFailed'));
    }
  };

  const handlePartSave = async () => {
    if (!selectedPartId) return;
    try {
      await api.editPart(selectedCategory, selectedPartId, {
        name: partForm.name,
        manufacturer: partForm.manufacturer,
        releaseDate: partForm.releaseDate,
        releaseWave: partForm.releaseWave,
        imageUrl: partForm.imageUrl,
      });
      showMessage('success', t('admin.saved'));
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : t('admin.saveFailed'));
    }
  };

  const handleBarcodeSave = async () => {
    if (!barcodeBeyId || !barcodeCode.trim()) return;
    try {
      await api.createBarcode({
        code: barcodeCode.trim(),
        beyId: barcodeBeyId,
        format: barcodeFormat.trim() || undefined,
        manufacturer: barcodeManufacturer.trim() || undefined,
        source: barcodeSource.trim() || undefined,
      });
      showMessage('success', t('admin.barcodeSaved'));
      setBarcodeCode('');
      setBarcodeFormat('');
      setBarcodeManufacturer('');
      setBarcodeSource('');
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : t('admin.saveFailed'));
    }
  };

  if (loading) return <p className="text-[var(--muted)]">{t('errors.loading')}</p>;
  if (error) return <p className="text-sm text-red-600">{error.message}</p>;
  if (!database) return <p className="text-[var(--muted)]">{t('errors.failedDatabase')}</p>;

  return (
    <div className="space-y-6">
      {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      {saveSuccess && <p className="text-sm text-green-600">{saveSuccess}</p>}

      <div role="tablist" className="flex gap-2 border-b border-gray-200 dark:border-slate-700">
        {[
          { key: 'beys', label: t('admin.beys') },
          { key: 'parts', label: t('admin.parts') },
          { key: 'barcodes', label: t('admin.barcodes') },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key as EditorTab)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-[var(--muted)] hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'beys' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="bey-select" className="text-sm font-medium text-[var(--muted)]">
              {t('admin.selectBey')}
            </label>
            <select
              id="bey-select"
              value={selectedBeyId}
              onChange={(e) => setSelectedBeyId(e.target.value)}
              className="rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
            >
              <option value="">{t('admin.selectBey')}</option>
              {sortedBeys.map((bey) => (
                <option key={bey.id} value={bey.id}>
                  {bey.name} ({bey.releaseWave})
                </option>
              ))}
            </select>
          </div>

          {selectedBeyId && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={t('admin.name')}
                value={beyForm.name ?? ''}
                onChange={(value) => setBeyForm((prev) => ({ ...prev, name: value }))}
              />
              <SelectField
                label={t('admin.manufacturer')}
                value={beyForm.manufacturer ?? ''}
                onChange={(value) => setBeyForm((prev) => ({ ...prev, manufacturer: value as Bey['manufacturer'] }))}
                options={[
                  { value: '', label: t('admin.selectManufacturer') },
                  { value: 'Takara Tomy', label: 'Takara Tomy' },
                  { value: 'Hasbro', label: 'Hasbro' },
                ]}
              />
              <TextField
                label={t('admin.releaseDate')}
                value={beyForm.releaseDate ?? ''}
                onChange={(value) => setBeyForm((prev) => ({ ...prev, releaseDate: value }))}
              />
              <TextField
                label={t('admin.releaseWave')}
                value={beyForm.releaseWave ?? ''}
                onChange={(value) => setBeyForm((prev) => ({ ...prev, releaseWave: value }))}
              />
              <TextField
                label={t('admin.priceEur')}
                value={beyForm.priceEur?.toString() ?? ''}
                onChange={(value) => setBeyForm((prev) => ({ ...prev, priceEur: formatPrice(value) }))}
                inputMode="decimal"
              />
              <TextField
                label={t('admin.priceUsd')}
                value={beyForm.priceUsd?.toString() ?? ''}
                onChange={(value) => setBeyForm((prev) => ({ ...prev, priceUsd: formatPrice(value) }))}
                inputMode="decimal"
              />
              <TextField
                label={t('admin.priceJpy')}
                value={beyForm.priceJpy?.toString() ?? ''}
                onChange={(value) => setBeyForm((prev) => ({ ...prev, priceJpy: formatPrice(value) }))}
                inputMode="decimal"
              />
              <TextField
                label={t('admin.imageUrl')}
                value={beyForm.imageUrl ?? ''}
                onChange={(value) => setBeyForm((prev) => ({ ...prev, imageUrl: value }))}
              />
              <TextField
                label={t('admin.bladeId')}
                value={beyForm.bladeId ?? ''}
                onChange={(value) => setBeyForm((prev) => ({ ...prev, bladeId: value }))}
              />
              <TextField
                label={t('admin.assistBladeId')}
                value={beyForm.assistBladeId ?? ''}
                onChange={(value) => setBeyForm((prev) => ({ ...prev, assistBladeId: value || undefined }))}
              />
              <TextField
                label={t('admin.ratchetId')}
                value={beyForm.ratchetId ?? ''}
                onChange={(value) => setBeyForm((prev) => ({ ...prev, ratchetId: value }))}
              />
              <TextField
                label={t('admin.bitId')}
                value={beyForm.bitId ?? ''}
                onChange={(value) => setBeyForm((prev) => ({ ...prev, bitId: value }))}
              />
            </div>
          )}

          {selectedBeyId && (
            <button
              type="button"
              onClick={() => void handleBeySave()}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t('admin.save')}
            </button>
          )}
        </div>
      )}

      {activeTab === 'parts' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="part-category" className="text-sm font-medium text-[var(--muted)]">
                {t('admin.partCategory')}
              </label>
              <select
                id="part-category"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value as PartCategory);
                  setSelectedPartId('');
                }}
                className="rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
              >
                {PART_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`partsDatabase.${cat === 'assistBlade' ? 'assistBlades' : `${cat}s`}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="part-select" className="text-sm font-medium text-[var(--muted)]">
                {t('admin.selectPart')}
              </label>
              <select
                id="part-select"
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
              >
                <option value="">{t('admin.selectPart')}</option>
                {sortedParts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.name} ({part.releaseWave})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedPartId && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={t('admin.name')}
                value={partForm.name ?? ''}
                onChange={(value) => setPartForm((prev) => ({ ...prev, name: value }))}
              />
              <SelectField
                label={t('admin.manufacturer')}
                value={partForm.manufacturer ?? ''}
                onChange={(value) => setPartForm((prev) => ({ ...prev, manufacturer: value as Part['manufacturer'] }))}
                options={[
                  { value: '', label: t('admin.selectManufacturer') },
                  { value: 'Takara Tomy', label: 'Takara Tomy' },
                  { value: 'Hasbro', label: 'Hasbro' },
                ]}
              />
              <TextField
                label={t('admin.releaseDate')}
                value={partForm.releaseDate ?? ''}
                onChange={(value) => setPartForm((prev) => ({ ...prev, releaseDate: value }))}
              />
              <TextField
                label={t('admin.releaseWave')}
                value={partForm.releaseWave ?? ''}
                onChange={(value) => setPartForm((prev) => ({ ...prev, releaseWave: value }))}
              />
              <TextField
                label={t('admin.imageUrl')}
                value={partForm.imageUrl ?? ''}
                onChange={(value) => setPartForm((prev) => ({ ...prev, imageUrl: value }))}
              />
            </div>
          )}

          {selectedPartId && (
            <button
              type="button"
              onClick={() => void handlePartSave()}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t('admin.save')}
            </button>
          )}
        </div>
      )}

      {activeTab === 'barcodes' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="barcode-bey" className="text-sm font-medium text-[var(--muted)]">
              {t('admin.selectBey')}
            </label>
            <select
              id="barcode-bey"
              value={barcodeBeyId}
              onChange={(e) => setBarcodeBeyId(e.target.value)}
              className="rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
            >
              <option value="">{t('admin.selectBey')}</option>
              {sortedBeys.map((bey) => (
                <option key={bey.id} value={bey.id}>
                  {bey.name} ({bey.releaseWave})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t('admin.barcodeCode')}
              value={barcodeCode}
              onChange={setBarcodeCode}
            />
            <TextField
              label={t('admin.barcodeFormat')}
              value={barcodeFormat}
              onChange={setBarcodeFormat}
            />
            <TextField
              label={t('admin.barcodeManufacturer')}
              value={barcodeManufacturer}
              onChange={setBarcodeManufacturer}
            />
            <TextField
              label={t('admin.barcodeSource')}
              value={barcodeSource}
              onChange={setBarcodeSource}
            />
          </div>

          <button
            type="button"
            disabled={!barcodeBeyId || !barcodeCode.trim()}
            onClick={() => void handleBarcodeSave()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('admin.saveBarcode')}
          </button>
        </div>
      )}
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: 'text' | 'decimal';
}

function TextField({ label, value, onChange, inputMode = 'text' }: TextFieldProps) {
  const id = useMemo(() => `field-${label.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`, [label]);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-[var(--muted)]">
        {label}
      </label>
      <input
        id={id}
        type={inputMode === 'decimal' ? 'number' : 'text'}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  const id = useMemo(() => `select-${label.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`, [label]);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-[var(--muted)]">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 dark:border-slate-600 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:border-blue-500 focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
