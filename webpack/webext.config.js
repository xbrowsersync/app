const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require('fs');
const Path = require('path');
const BaseConfig = require('./base.config');

const convertI18nForWebExt = (i18n) => {
  return Object.keys(i18n).reduce((acc, val) => {
    if (!Object.keys(i18n[val]).includes('default')) {
      return Object.assign(acc, convertI18nForWebExt(i18n[val]));
    }

    acc[`${i18n[val].key}_Default`] = { message: i18n[val].default };
    if (Object.keys(i18n[val]).includes('brave')) {
      acc[`${i18n[val].key}_Brave`] = { message: i18n[val].brave };
    }
    if (Object.keys(i18n[val]).includes('chromium')) {
      acc[`${i18n[val].key}_Chromium`] = { message: i18n[val].chromium };
    }
    if (Object.keys(i18n[val]).includes('edge')) {
      acc[`${i18n[val].key}_Edge`] = { message: i18n[val].edge };
    }
    if (Object.keys(i18n[val]).includes('firefox')) {
      acc[`${i18n[val].key}_Firefox`] = { message: i18n[val].firefox };
    }

    return acc;
  }, {});
};

module.exports = (env, argv) => {
  const baseConfig = BaseConfig(env, argv);
  return {
    ...baseConfig,
    entry: {
      'webpage-metadata-collecter': {
        import: './src/modules/webext/webpage-metadata-collecter/webpage-metadata-collecter.ts',
        library: {
          name: 'WebpageMetadataCollecter',
          type: 'var',
          export: 'default'
        }
      }
    },
    plugins: [
      ...baseConfig.plugins,
      new CopyWebpackPlugin({
        patterns: [
          {
            from: './res/strings',
            to: '../_locales/[name]/messages.json',
            toType: 'template',
            transform: (buffer) => {
              // Convert strings to proper webext messages format
              const i18n = JSON.parse(buffer.toString());
              const messages = convertI18nForWebExt(i18n);
              return JSON.stringify(messages, null, 2);
            }
          },
          {
            from: './res/webext/app.html',
            to: '..'
          },
          {
            from: './res/webext/background.html',
            to: '..'
          },
          {
            from: './res/webext/images'
          },
          {
            from: './res/webext/manifest.json',
            to: '../manifest.json',
            transform: (buffer) => {
              // Set version in webext manifest
              const appPackage = JSON.parse(fs.readFileSync(Path.resolve(__dirname, '../package.json')));
              const manifest = JSON.parse(buffer.toString());
              manifest.version = appPackage.version;
              manifest.version_name = appPackage.version;
              return JSON.stringify(manifest, null, 2);
            }
          }
        ]
      })
    ]
  };
};
