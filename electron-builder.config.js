const packageJson = require('./package.json');

module.exports = {
  ...packageJson.build,
  extraMetadata: {
    ...(packageJson.build?.extraMetadata || {}),
    main:
      process.env.ELECTRON_BROWSER_MODE === 'true'
        ? 'electron/tray-browser.js'
        : (packageJson.build?.extraMetadata?.main ?? 'electron/main.js'),
  },
};
