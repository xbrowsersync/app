const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
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

module.exports = Object.assign(BaseConfig, {
  entry: {
    webpagemetadatacollecter: Path.resolve(
      __dirname,
      '../src/modules/webext/webpage-metadata-collecter/webpage-metadata-collecter.ts'
    )
  },
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
