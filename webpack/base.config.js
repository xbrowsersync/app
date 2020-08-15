const autoprefixer = require('autoprefixer');
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
  plugins: [new MiniCssExtractPlugin({ filename: '[name].css' })],
  resolve: {
    extensions: ['.js', '.ts']
  },
  stats: 'errors-only'
};
