import { randomUUID } from 'expo-crypto';
import * as SplashScreen from 'expo-splash-screen';
import { defaultDatabaseDirectory, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { LoadError } from '@/components/load-state';
import { toLocalDate } from '@/domain/dates';
import { usePrototype } from '@/state/prototype';
import { spacing, useTheme } from '@/theme';

import type { Repositories } from './repositories';
import { createSqliteRepositories, initialiseDatabase } from './sqlite/repositories';
import { oneConnectionAtATime } from './sqlite/one-connection';
import { copyDatabaseTo } from './sqlite/schema';

const DATABASE = 'capolinea.db';
const connections = oneConnectionAtATime(() => openDatabaseAsync(DATABASE));

/** Today on the phone's clock; in development the prototype panel can move it. */
const today = () => (__DEV__ && usePrototype.getState().today) || toLocalDate(new Date());

async function openAndPrepare(db: SQLiteDatabase) {
  await initialiseDatabase(db, {
    // Next to the database, named after the version it had: the way back if a migration goes wrong.
    backup: (from) => copyDatabaseTo(db, `${defaultDatabaseDirectory}/capolinea-v${from}-${Date.now()}.db`),
  });
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
    opened
      .then(async (db) => {
        await openAndPrepare(db);
        if (!cancelled) setOpening({ attempt, repos: createSqliteRepositories(db, { today, newId: randomUUID }) });
      })
      .catch((error: unknown) => {
        if (__DEV__) console.error('Database not opened', error);
        if (!cancelled) setOpening({ attempt, failed: true });
      });
    return () => {
      cancelled = true;
      connections.close(opened);
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
