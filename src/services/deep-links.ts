/**
 * Links that open the app from outside (`capolinea://…`, from a web page, a QR code or another
 * app). The app needs none, and a link arriving while it is locked would open its screen on top of
 * the lock screen. So a link only starts the app, on its first screen; while it runs, links are
 * ignored. Used by `src/app/+native-intent.tsx`.
 */
export function redirectSystemPath({ initial }: { path: string; initial: boolean }): string | null {
  return initial ? '/' : null;
}
