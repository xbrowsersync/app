const Path = require('path');
const WebExtConfig = require('./webext.config');

module.exports = Object.assign(WebExtConfig, {
  entry: {
    app: Path.resolve(__dirname, '../src/modules/webext/firefox/firefox-app/firefox-app.module.ts'),
    background: Path.resolve(__dirname, '../src/modules/webext/firefox/firefox-background/firefox-background.module.ts')
  },
  output: {
    path: Path.resolve(__dirname, '../build/firefox/assets')
  }
});
