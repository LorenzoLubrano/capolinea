import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { AppDatabase } from './app-database';
import { readOnAnotherDay } from './freshness';
import { withFaults, type Faults } from './prototype-faults';
import { withTimings } from './prototype-timings';
import type { Repositories } from './repositories';

const RepositoriesContext = createContext<Repositories | null>(null);

/** Everything the screens read is one query: one consistent snapshot. */
export const SNAPSHOT_KEY = ['snapshot'] as const;

/**
 * Wires the repositories (the phone's database; memory in the web preview, or the ones given) and
 * the query cache. With `faults`, the repositories can be slowed down or made to fail on purpose
 * (prototype panel, development only).
 */
export function DataProvider({ children, repositories, faults }: { children: ReactNode; repositories?: Repositories; faults?: () => Faults }) {
  if (repositories) return <Wired base={repositories} faults={faults}>{children}</Wired>;
  return <AppDatabase>{(base) => <Wired base={base} faults={faults}>{children}</Wired>}</AppDatabase>;
}

function Wired({ children, base, faults }: { children: ReactNode; base: Repositories; faults?: () => Faults }) {
  const [repos] = useState(() => {
    // Development: the speed of every call in the Metro terminal, simulated delays left out.
    const timed = __DEV__ ? withTimings(base) : base;
    return faults ? withFaults(timed, faults) : timed;
  });
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: 1 } } }),
  );

  // The data carries «today»: back in the app on another day, it is read again.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const readAt = client.getQueryState(SNAPSHOT_KEY)?.dataUpdatedAt ?? 0;
      if (state === 'active' && readOnAnotherDay(readAt, new Date())) void client.invalidateQueries({ queryKey: SNAPSHOT_KEY });
    });
    return () => subscription.remove();
  }, [client]);

  return (
    <RepositoriesContext.Provider value={repos}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </RepositoriesContext.Provider>
  );
}

export function useRepositories(): Repositories {
  const repos = useContext(RepositoriesContext);
  if (!repos) throw new Error('useRepositories must be used inside <DataProvider>');
  return repos;
}
