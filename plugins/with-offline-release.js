// The installed app has no network permission: no account, no server, and Android itself makes
// sure of it. Only the release build: a development build talks to the Metro server on the PC.
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const manifest = `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <uses-permission android:name="android.permission.INTERNET" tools:node="remove" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" tools:node="remove" />
</manifest>
`;

module.exports = function withOfflineRelease(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const dir = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'release');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'AndroidManifest.xml'), manifest);
      return config;
    },
  ]);
};
