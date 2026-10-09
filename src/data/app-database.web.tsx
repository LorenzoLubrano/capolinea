import { useState, type ReactNode } from 'react';

import { createMemoryRepositories } from './mock/memory';
import type { Repositories } from './repositories';

/**
 * The web preview (development only) keeps the example data in memory: no database in the
 * browser. The phone uses `app-database.tsx`.
 */
export function AppDatabase({ children }: { children: (repos: Repositories) => ReactNode }) {
  const [repos] = useState(() => createMemoryRepositories());
  return children(repos);
}
