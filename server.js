const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;

const appDataDir = process.env.TMDB_DATA_DIR || path.join(process.cwd(), 'data');

if (!fs.existsSync(appDataDir)) {
  fs.mkdirSync(appDataDir, { recursive: true });
}

process.env.TMDB_DATA_DIR = appDataDir;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      if (parsedUrl.pathname?.includes('/stream')) {
        res.shouldKeepAlive = true;
        res.useChunkedEncodingByDefault = true;
        res.setHeader('X-Accel-Buffering', 'no');
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
