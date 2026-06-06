module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./park-control'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@app': './park-control/app',
          '@ui': './park-control/ui',
          '@ctx': './park-control/ctx',
          '@api': './park-control/api',
          '@img': './park-control/img',
        },
      },
    ],
  ],
};
