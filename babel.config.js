module.exports = function (api) {
  api.cache(true)

  return {
    presets: [
      [
        "@babel/preset-env",
        {
          useBuiltIns: "entry",
          corejs: 3
        }
      ],
      "@babel/preset-typescript",
    ],
    plugins: [
      'lodash',
      "@babel/proposal-class-properties",
      "@babel/plugin-proposal-object-rest-spread",
    ]
  }
}
