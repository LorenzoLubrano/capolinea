/**
 * The copy of the database made before a migration, next to it: the way back if a migration goes
 * wrong. Copies go when the data is deleted or replaced by a backup, so no old data stays behind.
 */
export function migrationCopyName(fromVersion: number, now: number): string {
  return `capolinea-v${fromVersion}-${now}.db`;
}

export function isMigrationCopy(name: string): boolean {
  return /^capolinea-v\d+-\d+\.db$/.test(name);
}
