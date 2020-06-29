const autoprefixer = require('autoprefixer');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const Path = require('path');

module.exports = {
  devtool: 'inline-cheap-module-source-map',
  module: {
    rules: [
      { test: /\.ts$/, loader: 'ts-loader' },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              plugins: () => [autoprefixer()]
            }
          },
          'resolve-url-loader',
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.(eot|gif|jpg|otf|png|svg|ttf|woff|woff2)$/,
        use: 'file-loader'
      },
      {
        test: /\.html$/i,
        loader: 'html-loader'
      }
    ]
  },
  optimization: {
    minimize: false
  },
  output: {
    filename: '[name].js'
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: '[name].css' }),
    new CopyWebpackPlugin({
      patterns: [
        Path.resolve(__dirname, '../src/modules/app/alert.html'),
        Path.resolve(__dirname, '../src/modules/app/bookmark.html'),
        Path.resolve(__dirname, '../src/modules/app/help.html'),
        Path.resolve(__dirname, '../src/modules/app/login.html'),
        Path.resolve(__dirname, '../src/modules/app/permissions.html'),
        Path.resolve(__dirname, '../src/modules/app/qr.html'),
        Path.resolve(__dirname, '../src/modules/app/scan.html'),
        Path.resolve(__dirname, '../src/modules/app/search.html'),
        Path.resolve(__dirname, '../src/modules/app/settings.html'),
        Path.resolve(__dirname, '../src/modules/app/support.html'),
        Path.resolve(__dirname, '../src/modules/app/updated.html'),
        Path.resolve(__dirname, '../src/modules/app/working.html')
      ]
    })
  ],
  resolve: {
    extensions: ['.js', '.ts']
  },
  stats: 'errors-only'
};
