const packageJson = require('./package.json');

const isBrowser = process.env.ELECTRON_BROWSER_MODE === 'true';
const baseConfig = packageJson.build || {};
const suffix = isBrowser ? '-web' : '';

module.exports = {
  ...baseConfig,
  mac: {
    ...(baseConfig.mac || {}),
    artifactName: `\${productName}-\${version}-mac-\${arch}${suffix}.\${ext}`,
  },
  win: {
    ...(baseConfig.win || {}),
    artifactName: `\${productName}-\${version}-win-\${arch}${suffix}.\${ext}`,
  },
  linux: {
    ...(baseConfig.linux || {}),
    artifactName: `\${productName}-\${version}-linux-\${arch}${suffix}.\${ext}`,
  },
  extraMetadata: {
    ...(baseConfig.extraMetadata || {}),
    main: isBrowser
      ? 'electron/tray-browser.js'
      : (baseConfig.extraMetadata?.main ?? 'electron/main.js'),
  },
};
