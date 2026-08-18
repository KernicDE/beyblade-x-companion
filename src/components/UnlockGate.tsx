import type { ReactNode } from 'react';

export function UnlockGate({ children }: { children: ReactNode }) {
  // Legacy local encryption is replaced by server-side user management.
  return <>{children}</>;
}
