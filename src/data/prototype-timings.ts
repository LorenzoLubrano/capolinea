import type { Repositories, Snapshot } from './repositories';

interface TimingOptions {
  now: () => number;
  log: (line: string) => void;
}

const DEFAULTS: TimingOptions = { now: () => performance.now(), log: (line) => console.log(line) };

/**
 * Development only: writes how long every data call takes to the Metro terminal, so the speed on
 * the phone can be read while using it (prototype panel, «Anni di dati»).
 */
export function withTimings(repos: Repositories, { now, log }: TimingOptions = DEFAULTS): Repositories {
  return new Proxy(repos, {
    get(target, key, receiver) {
      const value: unknown = Reflect.get(target, key, receiver);
      if (typeof value !== 'function') return value;
      return async (...args: unknown[]) => {
        const start = now();
        const result: unknown = await value.apply(target, args);
        const ms = Math.round(now() - start);
        log(key === 'snapshot' ? `[dati] snapshot ${ms} ms, ${(result as Snapshot).transactions.length} movimenti` : `[dati] ${String(key)} ${ms} ms`);
        return result;
      };
    },
  });
}
