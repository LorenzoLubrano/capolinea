import { oneConnectionAtATime } from './one-connection';

/** A database whose connections take a moment to close, like the native one. */
function fakeDatabase() {
  let open = 0;
  let mostAtOnce = 0;
  const connect = async () => {
    open += 1;
    mostAtOnce = Math.max(mostAtOnce, open);
    return {
      closeAsync: () =>
        new Promise<void>((resolve) =>
          setTimeout(() => {
            open -= 1;
            resolve();
          }, 5),
        ),
    };
  };
  return { connect, mostAtOnce: () => mostAtOnce };
}

describe('oneConnectionAtATime', () => {
  it('opens the next connection only once the previous one is closed', async () => {
    const database = fakeDatabase();
    const connections = oneConnectionAtATime(database.connect);

    // A reload or a retry: the old connection is let go and a new one asked for at once.
    const first = connections.open();
    await first;
    connections.close(first);
    await connections.open();

    expect(database.mostAtOnce()).toBe(1);
  });

  it('still opens after a connection that failed', async () => {
    const database = fakeDatabase();
    let fail = true;
    const connections = oneConnectionAtATime(() => (fail ? Promise.reject(new Error('locked')) : database.connect()));

    const first = connections.open();
    await expect(first).rejects.toThrow('locked');
    connections.close(first);
    fail = false;

    await expect(connections.open()).resolves.toBeDefined();
  });
});
