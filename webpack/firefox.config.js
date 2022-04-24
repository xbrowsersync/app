const Path = require('path');
const WebExtConfig = require('./webext.config');

module.exports = (env, argv) => {
  const webExtConfig = WebExtConfig(env, argv);

  // Add Firefox browser_specific_settings entry to manifest
  const copyPlugin = webExtConfig.plugins.find((p) => p.constructor.name === 'CopyPlugin');
  const manifestPattern = copyPlugin.patterns.find((p) => p.from.indexOf('manifest.json') > -1);
  const webExtTransfrom = manifestPattern.transform;
  manifestPattern.transform = (buffer) => {
    const webExtTransfromResult = webExtTransfrom(buffer);
    const manifest = JSON.parse(webExtTransfromResult);
    manifest.browser_specific_settings = {
      gecko: {
        id: '{019b606a-6f61-4d01-af2a-cea528f606da}',
        strict_min_version: '75.0',
        update_url: 'https://xbrowsersync.github.io/app/firefox-versions.json'
      }
    };
    return JSON.stringify(manifest, null, 2);
  };

  return {
    ...webExtConfig,
    entry: {
      ...webExtConfig.entry,
      app: './src/modules/webext/firefox/firefox-app/firefox-app.module.ts',
      background: './src/modules/webext/firefox/firefox-background/firefox-background.module.ts'
    },
    output: {
      ...webExtConfig.output,
      path: Path.resolve(__dirname, '../build/firefox/assets')
    }
  };
};
