import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const native = Platform.OS === 'ios' || Platform.OS === 'android';

/** Exports wait here, in the app's private cache, only until the next export or the next launch. */
function exportsDirectory(): Directory {
  return new Directory(Paths.cache, 'exports');
}

/**
 * Deletes every export left behind. A shared file cannot be deleted right after the share sheet:
 * the receiving app (an e-mail draft, for example) may still be reading it.
 */
export function clearExports(): void {
  if (!native) return;
  try {
    const directory = exportsDirectory();
    if (directory.exists) directory.delete();
  } catch {
    // Nothing to clear, or the system already did.
  }
}

/** Hands a text file to the system share sheet (a download on the web). */
export async function shareTextFile(name: string, content: string, mimeType: string): Promise<void> {
  if (!native) {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  clearExports();
  const directory = exportsDirectory();
  directory.create({ intermediates: true, idempotent: true });
  const file = new File(directory, name);
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name, UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json' });
}
