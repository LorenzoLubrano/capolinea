import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useState, type ReactNode } from 'react';

import { createMemoryRepositories } from './mock/memory';
import type { Repositories } from './repositories';

const RepositoriesContext = createContext<Repositories | null>(null);

/** Wires the repositories (mock in phase 1, SQLite later) and the query cache. */
export function DataProvider({ children, repositories }: { children: ReactNode; repositories?: Repositories }) {
  const [repos] = useState(() => repositories ?? createMemoryRepositories());
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
