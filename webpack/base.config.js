const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const devMode = argv.mode === 'development';
  const createBundleReport = false;
  return {
    devtool: devMode ? 'inline-source-map' : 'source-map',
    externals: ['fs'],
    mode: devMode ? 'development' : 'production',
    module: {
      rules: [
        { test: /\.ts$/, loader: 'ts-loader' },
        {
          test: /\.js$/,
          use: ['source-map-loader'],
          enforce: 'pre'
        },
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
              loader: 'sass-loader',
              options: {
                sourceMap: true
              }
            }
          ]
        },
        {
          test: /\.svg$/,
          loader: 'svg-inline-loader',
          issuer: /\.ts$/
        },
        {
          test: /\.(eot|gif|jpg|otf|png|ttf|woff|woff2)$/,
          type: 'asset/resource',
          generator: {
            filename: '[name][ext][query]'
          }
        },
        {
          test: /\.html$/i,
          loader: 'html-loader',
          options: {
            esModule: false
          }
        }
      ]
    },
    optimization: !devMode
      ? {
          minimizer: [
            new TerserPlugin({
              parallel: true,
              terserOptions: {
                keep_classnames: true
              }
            })
          ],
          splitChunks: {
            cacheGroups: {
              vendor: {
                chunks: 'all',
                name: 'vendor',
                test: /node_modules/
              }
            }
          }
        }
      : {},
    output: {
      chunkFilename: '[name].js',
      clean: true,
      filename: '[name].js'
    },
    plugins: [
      new MiniCssExtractPlugin({ filename: '[name].css' }),
      new BundleAnalyzerPlugin({
        analyzerMode: createBundleReport ? 'static' : 'disabled'
      })
    ],
    resolve: {
      extensions: ['.js', '.ts']
    }
  };
};
