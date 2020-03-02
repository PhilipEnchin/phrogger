const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/js/engine',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Phrogger',
    }),
  ],
};
