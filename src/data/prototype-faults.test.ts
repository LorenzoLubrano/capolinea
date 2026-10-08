import { createMemoryRepositories } from './mock/memory';
import { createDataset } from './mock/seed';
import { withFaults } from './prototype-faults';

describe('prototype faults', () => {
  it('passes every call through when nothing is simulated', async () => {
    const repos = withFaults(createMemoryRepositories(createDataset(), 0), () => ({ delayMs: 0, failReads: false }));
    expect((await repos.snapshot()).transactions.length).toBeGreaterThan(0);
  });

  it('fails the reads and lets the writes through', async () => {
    let failReads = true;
    const repos = withFaults(createMemoryRepositories(createDataset(), 0), () => ({ delayMs: 0, failReads }));
    await expect(repos.snapshot()).rejects.toThrow();
    const person = await repos.addPerson('Anna');
    failReads = false;
    expect((await repos.snapshot()).people).toContainEqual(person);
  });

  it('makes every call wait the chosen delay', async () => {
    jest.useFakeTimers();
    try {
      const repos = withFaults(createMemoryRepositories(createDataset(), 0), () => ({ delayMs: 2000, failReads: false }));
      let done = false;
      const read = repos.snapshot().then(() => {
        done = true;
      });
      await jest.advanceTimersByTimeAsync(1999);
      expect(done).toBe(false);
      await jest.advanceTimersByTimeAsync(10);
      await read;
      expect(done).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
