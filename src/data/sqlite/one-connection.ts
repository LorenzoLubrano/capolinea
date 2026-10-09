/**
 * One connection to the database at a time: a new one waits until the previous one is closed.
 * Opening while the old connection was still closing failed with «database is locked» (seen on the
 * S24 after a reload); a retry after a failed opening is the same case.
 */
export function oneConnectionAtATime<T extends { closeAsync(): Promise<void> }>(connect: () => Promise<T>) {
  let closed: Promise<unknown> = Promise.resolve();
  return {
    open: () => closed.then(connect),
    close: (opened: Promise<T>) => {
      closed = opened.then((db) => db.closeAsync()).catch(() => undefined);
    },
  };
}
