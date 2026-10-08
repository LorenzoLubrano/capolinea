import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useState, type ReactNode } from 'react';

import { createMemoryRepositories } from './mock/memory';
import { withFaults, type Faults } from './prototype-faults';
import type { Repositories } from './repositories';

const RepositoriesContext = createContext<Repositories | null>(null);

/**
 * Wires the repositories (mock in phase 1, SQLite later) and the query cache. With `faults`, the
 * repositories can be slowed down or made to fail on purpose (prototype panel, development only).
 */
export function DataProvider({ children, repositories, faults }: { children: ReactNode; repositories?: Repositories; faults?: () => Faults }) {
  const [repos] = useState(() => {
    const base = repositories ?? createMemoryRepositories();
    return faults ? withFaults(base, faults) : base;
  });
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: 1 } } }),
  );
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
