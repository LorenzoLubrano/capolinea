import { isRunningInExpoGo } from 'expo';
import { getRandomBytes, randomUUID } from 'expo-crypto';
import { Directory, File } from 'expo-file-system';
import * as SplashScreen from 'expo-splash-screen';
import { defaultDatabaseDirectory, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { LoadError } from '@/components/load-state';
import { toLocalDate } from '@/domain/dates';
import { databaseKeyStore } from '@/services/device-storage';
import { usePrototype } from '@/state/prototype';
import { spacing, useTheme } from '@/theme';

import type { Repositories } from './repositories';
import { isMigrationCopy, migrationCopyName } from './sqlite/copies';
import { copyEncryptedDatabaseTo, databaseKey, isPlainDatabase, keyStatement } from './sqlite/encryption';
import { oneConnectionAtATime } from './sqlite/one-connection';
import { createSqliteRepositories, initialiseDatabase } from './sqlite/repositories';
import { copyDatabaseTo } from './sqlite/schema';

const DATABASE = 'capolinea.db';
/** SQLCipher is in the installed app only: inside Expo Go the database stays plain, for test data. */
const ENCRYPTED = !isRunningInExpoGo();

const fileAt = (path: string) => new File(`file://${path}`);

const connections = oneConnectionAtATime(async () => {
  // Before opening, which creates the file: a key is made only for a database that does not exist.
  const key = ENCRYPTED ? databaseKey(databaseKeyStore, fileAt(`${defaultDatabaseDirectory}/${DATABASE}`).exists, getRandomBytes) : null;
  const db = await openDatabaseAsync(DATABASE);
  return { db, key, closeAsync: () => db.closeAsync() };
});

/** Deleting the data or restoring a backup also deletes the copies made before migrations. */
function withoutOldCopies(repos: Repositories): Repositories {
  return {
    ...repos,
    replaceAll: async (data) => {
      await repos.replaceAll(data);
      try {
        for (const entry of new Directory(`file://${defaultDatabaseDirectory}`).list()) {
          if (entry instanceof File && isMigrationCopy(entry.name)) entry.delete();
        }
      } catch {
        // Nothing to delete.
      }
    },
  };
}

/** Today on the phone's clock; in development the prototype panel can move it. */
const today = () => (__DEV__ && usePrototype.getState().today) || toLocalDate(new Date());

async function openAndPrepare(db: SQLiteDatabase, key: string | null) {
  if (key) await unlock(db, key);
  await initialiseDatabase(db, {
    // Next to the database, named after the version it had: the way back if a migration goes wrong.
    backup: (from) => backUp(db, `${defaultDatabaseDirectory}/${migrationCopyName(from, Date.now())}`, key),
  });
  if (__DEV__ && key) await checkEncryption(db, key);
}

/** The first statement on the connection. Without SQLCipher it stops, rather than write data in the clear. */
async function unlock(db: SQLiteDatabase, key: string) {
  await db.execAsync(keyStatement(key));
  const cipher = await db.getFirstAsync<{ cipher_version: string | null }>('PRAGMA cipher_version');
  if (!cipher?.cipher_version) throw new Error('SQLCipher is missing: the database would not be encrypted');
}

/** A copy encrypted like the database, never left in the clear. */
async function backUp(db: SQLiteDatabase, path: string, key: string | null) {
  if (!key) return copyDatabaseTo(db, path);
  await copyEncryptedDatabaseTo(db, path, key);
  if (isPlainDatabase(readHeader(path))) {
    fileAt(path).delete();
    throw new Error('The copy of the database was not encrypted');
  }
}

function readHeader(path: string) {
  const handle = fileAt(path).open();
  try {
    return handle.readBytes(16);
  } finally {
    handle.close();
  }
}

/** Development builds with SQLCipher: shows in the terminal that the file and its copies are encrypted. */
async function checkEncryption(db: SQLiteDatabase, key: string) {
  const copy = `${defaultDatabaseDirectory}/check-${Date.now()}.db`;
  try {
    await backUp(db, copy, key);
    fileAt(copy).delete();
    const plain = isPlainDatabase(readHeader(`${defaultDatabaseDirectory}/${DATABASE}`));
    console.log(`[dati] database ${plain ? 'IN CHIARO' : 'cifrato'}, copia cifrata`);
  } catch (error) {
    console.error('[dati] copia del database', error);
  }
}

type Opening = { attempt: number; repos: Repositories } | { attempt: number; failed: true };

/**
 * The phone's database (`app-database.web.tsx` is the web preview). Renders nothing while it opens,
 * then the app with the repositories; if it cannot be opened, the data stays as it is and the user
 * can try again.
 */
export function AppDatabase({ children }: { children: (repos: Repositories) => ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const [opening, setOpening] = useState<Opening | null>(null);

  useEffect(() => {
    let cancelled = false;
    const opened = connections.open();
    const prepared = opened.then(async (connection) => {
      await openAndPrepare(connection.db, connection.key);
      return connection;
    });
    prepared
      .then(({ db }) => {
        if (!cancelled) setOpening({ attempt, repos: withoutOldCopies(createSqliteRepositories(db, { today, newId: randomUUID })) });
      })
      .catch((error: unknown) => {
        if (__DEV__) console.error('Database not opened', error);
        if (!cancelled) setOpening({ attempt, failed: true });
      });
    return () => {
      cancelled = true;
      // Closed once the migrations and their copy are over, never in the middle of them.
      connections.close(prepared.catch(() => opened));
    };
  }, [attempt]);

  if (!opening || opening.attempt !== attempt) return null;
  if ('failed' in opening) return <OpenFailed onRetry={() => setAttempt((n) => n + 1)} />;
  return children(opening.repos);
}

function OpenFailed({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTheme();
  // The app never rendered: the splash screen is still up.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, backgroundColor: colors.background }}>
      <LoadError onRetry={onRetry} />
    </View>
  );
}
