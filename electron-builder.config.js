const packageJson = require('./package.json');

const isBrowser = process.env.ELECTRON_BROWSER_MODE === 'true';
const baseConfig = packageJson.build || {};

module.exports = {
  ...baseConfig,
  artifactName: isBrowser
    ? '${productName}-${version}-${platform}-${arch}-web.${ext}'
    : '${productName}-${version}-${platform}-${arch}.${ext}',
  extraMetadata: {
    ...(baseConfig.extraMetadata || {}),
    main: isBrowser
      ? 'electron/tray-browser.js'
      : (baseConfig.extraMetadata?.main ?? 'electron/main.js'),
  },
};
