const path = require('path')
const webpack = require('webpack')
const HtmlPlugin = require('html-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const LiveReloadPlugin = require('webpack-livereload-plugin')

const PRODUCTION = process.env.NODE_ENV === 'production'

const DEFAULT_THEME = 'heroku'
const THEMES = ['salesforce', DEFAULT_THEME]
const THEME = THEMES.includes(process.env.THEME)
  ? process.env.THEME
  : DEFAULT_THEME

const htmlPlugin = (options) =>
  new HtmlPlugin({
    production: PRODUCTION,
    minify: PRODUCTION ? { collapseWhitespace: true } : false,
    filename: 'index.html',
    title: 'Product Analytics',
    inject: false,
    template: path.join(__dirname, 'views', 'index.pug'),
    ...options
  })

module.exports = {
  devtool: PRODUCTION ? 'source-map' : 'cheap-module-source-map',
  mode: PRODUCTION ? 'production' : 'development',
  entry: path.join(__dirname, 'src', 'index.js'),
  output: {
    path: path.join(__dirname, 'dist'),
    filename: `app${PRODUCTION ? '.[hash]' : ''}.js`
  },
  stats: 'minimal',
  module: {
    rules: [
      {
        test: /.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: ['lodash'],
              presets: ['@babel/preset-env']
            }
          }
        ]
      },
      {
        test: /.pug$/,
        use: ['pug-loader']
      },
      {
        test: /\.css$/,
        use: [
          PRODUCTION
            ? {
                loader: MiniCssExtractPlugin.loader
              }
            : 'style-loader',
          { loader: 'css-loader', options: { importLoaders: 1 } },
          {
            loader: 'postcss-loader',
            options: {
              ident: 'postcss',
              plugins: (loader) => [
                require('postcss-import')({ root: loader.resourcePath }),
                require('postcss-preset-env')(),
                require('precss')()
              ]
            }
          }
        ]
      }
    ]
  },
  optimization: {
    minimizer: [
      new UglifyJsPlugin({
        parallel: true,
        sourceMap: true,
        uglifyOptions: {
          output: {
            comments: false
          }
        }
      }),
      new OptimizeCSSAssetsPlugin({})
    ]
  },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(
      /\/logger\.js/,
      './clientLogger.js'
    ),
    htmlPlugin({
      bodyClass: THEME
    }),
    htmlPlugin({
      filename: 'audience.html',
      title: 'Audience',
      template: path.join(__dirname, 'views', 'audience.pug'),
      bodyClass: `${THEME} audience`
    }),
    htmlPlugin({
      filename: 'connect.html',
      title: 'Heroku Connect',
      template: path.join(__dirname, 'views', 'connect.pug'),
      bodyClass: `${THEME} connect`
    }),
    htmlPlugin({
      filename: 'ordercontrol.html',
      title: 'Heroku Connect Order Control',
      template: path.join(__dirname, 'views', 'ordercontrol.pug'),
      bodyClass: `ordercontrol`
    }),
    htmlPlugin({
      filename: 'presentation.html',
      title: 'Presentation',
      header: 'Kafka AWS',
      template: path.join(__dirname, 'views', 'presentation.pug'),
      bodyClass: `${THEME} presentation`
    }),
    htmlPlugin({
      filename: 'booth.html',
      title: 'Booth',
      template: path.join(__dirname, 'views', 'booth.pug'),
      bodyClass: `${THEME} booth`
    }),
    new CleanWebpackPlugin(),
    new webpack.DefinePlugin(
      [
        'KAFKA_PREFIX',
        'KAFKA_TOPIC',
        'KAFKA_CMD_TOPIC',
        'KAFKA_WEIGHT_TOPIC',
        'KAFKA_QUEUE_TOPIC',
        'KAFKA_QUEUE_WORKER'
      ].reduce((acc, key) => {
        acc[`process.env.${key}`] = JSON.stringify(process.env[key])
        return acc
      }, {})
    ),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    }),
    // Add other themes in dev mode for easier viewing
    ...(PRODUCTION
      ? []
      : THEMES.map((theme) =>
          htmlPlugin({
            filename: `${theme}.html`,
            bodyClass: theme
          })
        )),
    !PRODUCTION && new LiveReloadPlugin({ quiet: true })
  ].filter(Boolean)
}
