import { File } from 'expo-file-system';
import { Platform } from 'react-native';

export type PickedText = { name: string; text: string } | { error: 'too-big' | 'read' } | null;

/**
 * Lets the user pick a text file and reads it. Too big a file is refused before it is read, so a
 * wrong pick cannot fill the memory. `null` when the user cancels.
 */
export async function pickTextFile(maxBytes: number): Promise<PickedText> {
  if (Platform.OS === 'web') return pickOnWeb(maxBytes);
  try {
    const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'application/octet-stream', 'text/plain'] });
    if (picked.canceled) return null;
    const file = picked.result;
    if (file.size > maxBytes) return { error: 'too-big' };
    return { name: file.name, text: await file.text() };
  } catch {
    return { error: 'read' };
  }
}

function pickOnWeb(maxBytes: number): Promise<PickedText> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      if (file.size > maxBytes) return resolve({ error: 'too-big' });
      try {
        resolve({ name: file.name, text: await file.text() });
      } catch {
        resolve({ error: 'read' });
      }
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
