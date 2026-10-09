import { createMemoryRepositories } from './mock/memory';
import { createDataset } from './mock/seed';
import { withTimings } from './prototype-timings';

describe('withTimings', () => {
  it('reports how long each call took and how many movements a read returned', async () => {
    const lines: string[] = [];
    let clock = 0;
    const repos = withTimings(createMemoryRepositories(createDataset(), 0), {
      now: () => (clock += 40),
      log: (line) => lines.push(line),
    });

    const snapshot = await repos.snapshot();
    await repos.addPerson('Sara');

    expect(lines).toEqual([`[dati] snapshot 40 ms, ${snapshot.transactions.length} movimenti`, '[dati] addPerson 40 ms']);
  });

  it('passes errors through', async () => {
    const repos = withTimings(createMemoryRepositories(createDataset(), 0), { now: () => 0, log: () => undefined });

    await expect(repos.updatePerson('nobody', 'X')).rejects.toThrow('Person not found');
  });
});
