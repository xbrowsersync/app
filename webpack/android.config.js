const CopyWebpackPlugin = require('copy-webpack-plugin');
const Path = require('path');
const BaseConfig = require('./base.config');

const generateI18nStrings = (i18n) => {
  return Object.keys(i18n).reduce((acc, val) => {
    if (!i18n[val].key) {
      return Object.assign(acc, generateI18nStrings(i18n[val]));
    }

    acc[i18n[val].key] = i18n[val].message;
    return acc;
  }, {});
};

module.exports = Object.assign(BaseConfig, {
  plugins: BaseConfig.plugins.concat([
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
  ])
});
