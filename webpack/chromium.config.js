const Path = require('path');
const WebExtConfig = require('./webext.config');

module.exports = Object.assign(WebExtConfig, {
  entry: {
    app: Path.resolve(__dirname, '../src/modules/webext/chromium/chromium-app/chromium-app.module.ts'),
    background: Path.resolve(
      __dirname,
      '../src/modules/webext/chromium/chromium-background/chromium-background.module.ts'
    )
  },
  output: {
    path: Path.resolve(__dirname, '../build/chromium/assets')
  }
});
