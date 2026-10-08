import type { Repositories } from './repositories';

/** What the prototype panel simulates on the data: a slow phone, a storage that cannot be read. */
export interface Faults {
  delayMs: number;
  failReads: boolean;
}

const READS = new Set<PropertyKey>(['snapshot'] satisfies (keyof Repositories)[]);

/**
 * Wraps any repositories (the mock now, SQLite later) so loading and error states can be seen on
 * purpose. `faults` is read at every call, so a change applies from the next one.
 */
export function withFaults(repos: Repositories, faults: () => Faults): Repositories {
  return new Proxy(repos, {
    get(target, key, receiver) {
      const value: unknown = Reflect.get(target, key, receiver);
      if (typeof value !== 'function') return value;
      return async (...args: unknown[]) => {
        const { delayMs, failReads } = faults();
        if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
        if (failReads && READS.has(key)) throw new Error('Simulated read failure (prototype panel)');
        return value.apply(target, args);
      };
    },
  });
}
