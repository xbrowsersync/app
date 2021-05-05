const Path = require('path');
const WebExtConfig = require('./webext.config');

module.exports = (env, argv) => {
  const webExtConfig = WebExtConfig(env, argv);
  return {
    ...webExtConfig,
    entry: {
      ...webExtConfig.entry,
      app: Path.resolve(__dirname, '../src/modules/webext/firefox/firefox-app/firefox-app.module.ts'),
      background: Path.resolve(
        __dirname,
        '../src/modules/webext/firefox/firefox-background/firefox-background.module.ts'
      )
    },
    output: {
      path: Path.resolve(__dirname, '../build/firefox/assets')
    }
  };
};
