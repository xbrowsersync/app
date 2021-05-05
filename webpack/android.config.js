const CopyWebpackPlugin = require('copy-webpack-plugin');
const Path = require('path');
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
      app: Path.resolve(__dirname, '../src/modules/android/android-app/android-app.module.ts')
    },
    output: {
      path: Path.resolve(__dirname, '../build/android/www/assets')
    },
    plugins: [
      ...baseConfig.plugins,
      new CopyWebpackPlugin({
        patterns: [
          {
            from: Path.resolve(__dirname, '../res/strings'),
            to: './strings_[name].json',
            toType: 'template',
            transform(buffer) {
              const i18n = JSON.parse(buffer.toString());
              const messages = generateI18nStrings(i18n);
              return JSON.stringify(messages, null, 2);
            }
          },
          {
            from: Path.resolve(__dirname, '../res/android'),
            to: '../../'
          }
        ]
      })
    ]
  };
};
