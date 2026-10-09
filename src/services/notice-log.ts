import type { NoticeLog } from '@/features/notifications/sync';

import { settingsStorage } from './device-storage';

const KEY = 'capolinea.notices';

// The web preview has no storage: the log lives for the session there.
let session: string[] | null = null;

/** The events already true at the last check, kept with the settings so a restart sends nothing old. */
export const noticeLog: NoticeLog = {
  read: () => {
    if (!settingsStorage) return session;
    try {
      const saved = settingsStorage.getItem(KEY);
      return saved === null ? null : (JSON.parse(saved) as string[]);
    } catch {
      return null;
    }
  },
  write: (keys) => {
    session = keys;
    settingsStorage?.setItem(KEY, JSON.stringify(keys));
  },
};

/** After the data is replaced (a restore, a wipe): what is true then is not news. */
export function forgetNotices() {
  session = null;
  settingsStorage?.removeItem(KEY);
}
