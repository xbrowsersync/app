const Path = require('path');
const WebExtConfig = require('./webext.config');

module.exports = (env, argv) => {
  const webExtConfig = WebExtConfig(env, argv);
  return {
    ...webExtConfig,
    entry: {
      ...webExtConfig.entry,
      app: Path.resolve(__dirname, '../src/modules/webext/chromium/chromium-app/chromium-app.module.ts'),
      background: Path.resolve(
        __dirname,
        '../src/modules/webext/chromium/chromium-background/chromium-background.module.ts'
      )
    },
    output: {
      path: Path.resolve(__dirname, '../build/chromium/assets')
    }
  };
};
