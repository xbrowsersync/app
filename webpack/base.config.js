const autoprefixer = require('autoprefixer');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  devtool: 'inline-cheap-module-source-map',
  module: {
    rules: [
      { test: /\.ts$/, loader: 'ts-loader' },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: ''
            }
          },
          'css-loader',
          'resolve-url-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [autoprefixer]
              }
            }
          },
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
    extensions: ['.js', '.ts'],
    fallback: {
      buffer: 'buffer'
    }
  },
  stats: 'errors-only'
};
