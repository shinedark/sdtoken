module.exports = {
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
      },
      // ... other rules ...
    ],
  },
  ignoreWarnings: [/Failed to parse source map/],
}
