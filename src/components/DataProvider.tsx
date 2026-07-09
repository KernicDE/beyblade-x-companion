import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { DataContext } from '../contexts/DataContext';
import { loadDatabase } from '../utils/data';

export function DataProvider({ children }: { children: ReactNode }) {
  const [database, setDatabase] = useState<import('../utils/data').Database | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadDatabase()
      .then((data) => {
        if (!cancelled) {
          setDatabase(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DataContext.Provider value={{ database, loading, error }}>
      {children}
    </DataContext.Provider>
  );
}
