const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require('fs');
const Path = require('path');
const xml2js = require('xml2js');
const { getAndroidVersionCode } = require('../scripts/android-utils');
const BaseConfig = require('./base.config');

const generateI18nStrings = (i18n) => {
  return Object.keys(i18n).reduce((acc, val) => {
    if (!Object.keys(i18n[val]).includes('default')) {
      return Object.assign(acc, generateI18nStrings(i18n[val]));
    }
    const value = Object.keys(i18n[val]).includes('android') ? i18n[val].android : i18n[val].default;
    acc[`${i18n[val].key}`] = value;
    return acc;
  }, {});
};

module.exports = (env, argv) => {
  const baseConfig = BaseConfig(env, argv);
  return {
    ...baseConfig,
    entry: {
      app: './src/modules/android/android-app/android-app.module.ts'
    },
    output: {
      ...baseConfig.output,
      path: Path.resolve(__dirname, '../build/android/www/assets')
    },
    plugins: [
      ...baseConfig.plugins,
      new CopyWebpackPlugin({
        patterns: [
          {
            from: './res/strings',
            to: './strings_[name].json',
            toType: 'template',
            transform: (buffer) => {
              // Convert strings to proper webext messages format
              const i18n = JSON.parse(buffer.toString());
              const messages = generateI18nStrings(i18n);
              return JSON.stringify(messages, null, 2);
            }
          },
          {
            from: './res/android',
            to: '../../'
          },
          {
            from: './res/android/config.xml',
            to: '../../',
            transform: (buffer) => {
              // Set version in android config
              const appPackage = JSON.parse(fs.readFileSync(Path.resolve(__dirname, '../package.json')));
              const parser = new xml2js.Parser();
              const builder = new xml2js.Builder();
              let xml = '';
              parser.parseString(buffer.toString(), (err, result) => {
                result.widget.$.version = appPackage.version;
                result.widget.$['android-versionCode'] = getAndroidVersionCode(`${appPackage.version}.0`);
                xml = builder.buildObject(result);
              });
              return xml;
            }
          }
        ]
      })
    ]
  };
};
