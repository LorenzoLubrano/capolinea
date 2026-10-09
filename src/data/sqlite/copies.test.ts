import { isMigrationCopy, migrationCopyName } from './copies';

describe('copies made before a migration', () => {
  it('are named after the version they had and the time', () => {
    expect(migrationCopyName(1, 1_760_000_000_000)).toBe('capolinea-v1-1760000000000.db');
  });

  it('are told apart from the database and its other files', () => {
    expect(isMigrationCopy('capolinea-v1-1760000000000.db')).toBe(true);
    for (const name of ['capolinea.db', 'capolinea.db-wal', 'capolinea.db-shm', 'ExpoSQLiteStorage', 'capolinea-v1-x.db']) {
      expect(isMigrationCopy(name)).toBe(false);
    }
  });
});
