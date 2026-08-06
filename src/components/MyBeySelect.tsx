import { useMemo } from 'react';
import { useProfileStore } from '../stores/profile';
import { useBuildsStore } from '../stores/builds';
import { useTranslation } from '../i18n';
import { inputClass } from './formStyles';
import { allBuilds, myBeyRefValue, ownedBeyLabel } from '../utils/matches';
import type { Database } from '../utils/data';

interface MyBeySelectProps {
  database: Database;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id?: string;
}

/**
 * Grouped "my bey" select: owned copies first (preferred for new matches),
 * then saved builds (profile + local drafts), then catalog beys.
 * Values are serialized MyBeyRefs (see myBeyRefValue / parseMyBeyRefValue).
 * Owned copies and profile builds are only available while the profile is unlocked.
 */
export function MyBeySelect({ database, value, onChange, placeholder, id }: MyBeySelectProps) {
  const { t } = useTranslation();
  const profile = useProfileStore((s) => s.profile);
  const localBuilds = useBuildsStore((s) => s.builds);

  const builds = useMemo(() => allBuilds(profile, localBuilds), [profile, localBuilds]);
  // Local drafts whose name already exists as a profile build get a "local"
  // suffix so the two copies stay distinguishable in the list.
  const duplicateLocalIds = useMemo(() => {
    const profileNames = new Set((profile?.builds ?? []).map((b) => b.name));
    return new Set(localBuilds.filter((b) => profileNames.has(b.name)).map((b) => b.id));
  }, [profile, localBuilds]);
  const sortedBeys = useMemo(
    () => [...database.beys].sort((a, b) => a.name.localeCompare(b.name)),
    [database]
  );
  const beyNameById = useMemo(() => {
    const map = new Map<string, string>();
    database.beys.forEach((bey) => map.set(bey.id, bey.name));
    return map;
  }, [database]);

  const ownedBeys = profile?.ownedBeys ?? [];

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    >
      <option value="">{placeholder}</option>
      {ownedBeys.length > 0 && (
        <optgroup label={t('beySource.owned')}>
          {ownedBeys.map((owned) => (
            <option key={owned.id} value={myBeyRefValue({ source: 'ownedBey', ownedBeyId: owned.id })}>
              {ownedBeyLabel(owned, beyNameById.get(owned.beyId))}
            </option>
          ))}
        </optgroup>
      )}
      {builds.length > 0 && (
        <optgroup label={t('beySource.builds')}>
          {builds.map((build) => (
            <option key={build.id} value={myBeyRefValue({ source: 'creation', creationId: build.id })}>
              {duplicateLocalIds.has(build.id) ? `${build.name} (${t('beySource.local')})` : build.name}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label={t('beySource.catalog')}>
        {sortedBeys.map((bey) => (
          <option key={bey.id} value={myBeyRefValue({ source: 'bey', beyId: bey.id })}>
            {bey.name}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
