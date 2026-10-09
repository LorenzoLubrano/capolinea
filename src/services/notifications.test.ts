/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('notifications service', () => {
  it('never imports the root of expo-notifications, which throws on Android inside Expo Go', () => {
    const source = readFileSync(join(__dirname, 'notifications.ts'), 'utf8');

    expect(source).not.toMatch(/from 'expo-notifications'/);
    expect(source).toMatch(/from 'expo-notifications\/build\/scheduleNotificationAsync'/);
  });
});
