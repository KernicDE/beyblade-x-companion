import { createContext } from 'react';
import type { Database } from '../utils/data';

interface DataContextValue {
  database: Database | null;
  loading: boolean;
  error: Error | null;
}

export const DataContext = createContext<DataContextValue>({
  database: null,
  loading: true,
  error: null,
});
