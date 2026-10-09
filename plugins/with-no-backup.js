// Nothing of the app leaves the phone: no Google Drive backup and, from Android 12, no transfer to
// a new phone either (`allowBackup: false` alone still allows that transfer). The database would
// arrive without its key, which stays in this phone's keystore, and the app would not open.
// Replaces the narrower rules of expo-secure-store, turned off in app.json.
const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const RULES = 'capolinea_data_extraction_rules';
const DOMAINS = ['root', 'file', 'database', 'sharedpref', 'external', 'device_root', 'device_file', 'device_database', 'device_sharedpref'];

const excludeAll = DOMAINS.map((domain) => `    <exclude domain="${domain}" path="." />`).join('\n');
const xml = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
${excludeAll}
  </cloud-backup>
  <device-transfer>
${excludeAll}
  </device-transfer>
</data-extraction-rules>
`;

module.exports = function withNoBackup(config) {
  config = withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    application.$['android:allowBackup'] = 'false';
    application.$['android:dataExtractionRules'] = `@xml/${RULES}`;
    delete application.$['android:fullBackupContent'];
    return config;
  });
  return withDangerousMod(config, [
    'android',
    (config) => {
      const dir = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${RULES}.xml`), xml);
      return config;
    },
  ]);
};
