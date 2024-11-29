module.exports = {
  // ... other config
  module: {
    rules: [
      // ... other rules
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext]',
        },
      },
    ],
  },
}
