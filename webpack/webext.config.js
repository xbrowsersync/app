const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Path = require('path');
const BaseConfig = require('./base.config');

const convertI18nForWebExt = (i18n) => {
  return Object.keys(i18n).reduce((acc, val) => {
    if (!i18n[val].key) {
      return Object.assign(acc, convertI18nForWebExt(i18n[val]));
    }

    acc[i18n[val].key] = { message: i18n[val].message };
    return acc;
  }, {});
};

module.exports = Object.assign(BaseConfig, {
  plugins: BaseConfig.plugins.concat([
    new CopyWebpackPlugin({
      patterns: [
        {
          from: Path.resolve(__dirname, '../res/strings'),
          to: '../_locales/[name]/messages.json',
          toType: 'template',
          transform(buffer) {
            const i18n = JSON.parse(buffer.toString());
            const messages = convertI18nForWebExt(i18n);
            return JSON.stringify(messages, null, 2);
          }
        },
        {
          from: Path.resolve(__dirname, '../res/webext/images')
        },
        {
          from: Path.resolve(__dirname, '../res/webext/manifest.json'),
          to: '../manifest.json'
        }
      ]
    }),
    new HtmlWebpackPlugin({
      chunks: ['app'],
      filename: '../app.html',
      template: Path.resolve(__dirname, '../res/webext/app.html')
    }),
    new HtmlWebpackPlugin({
      chunks: ['background'],
      filename: '../background.html',
      template: Path.resolve(__dirname, '../res/webext/background.html')
    })
  ])
});
