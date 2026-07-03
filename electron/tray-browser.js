const { app, Menu, shell, Tray, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev =
  process.env.NODE_ENV === 'development' ||
  process.defaultApp ||
  /[\\/]electron/.test(process.execPath);
const port = 4949;

function electronLog(message, type = 'info') {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const prefix = type === 'error' ? '[ERROR]' : '[INFO]';
  const line = `[${timestamp}] ${prefix} ${message}`;
  if (type === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
  if (appDataDir) {
    try {
      const logDir = path.join(appDataDir, 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(path.join(logDir, 'electron-tray.log'), line + '\n');
    } catch (e) {
    }
  }
}

let appDataDir = null;

function initDataDir() {
  if (isDev) {
    appDataDir = path.join(process.cwd(), 'data');
  } else {
    const exeDir = path.dirname(app.getPath('exe'));
    appDataDir = path.join(exeDir, 'data');
  }

  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
  }

  process.env.TMDB_DATA_DIR = appDataDir;
  process.env.ELECTRON_BUILD = 'true';
  process.env.COOKIE_SECURE = 'false';

  const logDir = path.join(appDataDir, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  if (!process.env.JWT_SECRET) {
    const crypto = require('crypto');
    const machineId = crypto.createHash('sha256').update(app.getPath('exe')).digest('hex');
    process.env.JWT_SECRET = 'tmdb-helper-electron-' + machineId.substring(0, 32);
  }

  electronLog(`数据目录: ${appDataDir}`);
  electronLog(`exe 路径: ${app.getPath('exe')}`);
  electronLog(`app 路径: ${app.getAppPath()}`);

  initDatabase();
}

function initDatabase() {
  try {
    const dbPath = path.join(appDataDir, 'tmdb-helper.db');
    electronLog(`初始化数据库: ${dbPath}`);

    if (fs.existsSync(dbPath)) {
      electronLog('数据库已存在，跳过初始化');
      return;
    }

    electronLog('尝试加载 better-sqlite3...');
    const Database = require('better-sqlite3');
    electronLog('better-sqlite3 加载成功');
    const db = new Database(dbPath);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');

    db.exec(`CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY, tmdbId TEXT, imdbId TEXT, title TEXT NOT NULL,
      originalTitle TEXT, overview TEXT, year INTEGER, releaseDate TEXT,
      genres TEXT, runtime INTEGER, voteAverage REAL, mediaType TEXT DEFAULT 'tv',
      posterPath TEXT, posterUrl TEXT, backdropPath TEXT, backdropUrl TEXT,
      logoPath TEXT, logoUrl TEXT, networkId INTEGER, networkName TEXT,
      networkLogoUrl TEXT, status TEXT, completed INTEGER DEFAULT 0,
      platformUrl TEXT, totalEpisodes INTEGER, manuallySetEpisodes INTEGER DEFAULT 0,
      weekday INTEGER, secondWeekday INTEGER, airTime TEXT, category TEXT,
      tmdbUrl TEXT, notes TEXT, isDailyUpdate INTEGER DEFAULT 0,
      blurIntensity TEXT, rating INTEGER, createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL, deletedAt TEXT
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS seasons (
      id TEXT PRIMARY KEY, itemId TEXT NOT NULL, seasonNumber INTEGER NOT NULL,
      name TEXT, totalEpisodes INTEGER NOT NULL, currentEpisode INTEGER,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
      FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY, itemId TEXT NOT NULL, seasonId TEXT,
      seasonNumber INTEGER, number INTEGER NOT NULL, completed INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
      FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (seasonId) REFERENCES seasons(id) ON DELETE CASCADE
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL, createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL, lastLoginAt TEXT, sessionExpiryDays INTEGER DEFAULT 15,
      deletedAt TEXT
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS chatHistories (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL, deletedAt TEXT
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, chatId TEXT NOT NULL, role TEXT NOT NULL,
      content TEXT NOT NULL, timestamp TEXT NOT NULL, type TEXT DEFAULT 'text',
      fileName TEXT, fileContent TEXT, isStreaming INTEGER DEFAULT 0,
      suggestions TEXT, rating TEXT, isEdited INTEGER DEFAULT 0,
      canContinue INTEGER DEFAULT 0, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
      FOREIGN KEY (chatId) REFERENCES chatHistories(id) ON DELETE CASCADE
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS image_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT, tmdbId TEXT NOT NULL, itemId TEXT,
      imageType TEXT NOT NULL, imagePath TEXT, imageUrl TEXT, sizeType TEXT DEFAULT 'original',
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, lastVerifiedAt TEXT,
      isPermanent INTEGER DEFAULT 1, sourceType TEXT DEFAULT 'tmdb',
      UNIQUE(tmdbId, imageType, sizeType)
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS schedule_tasks (
      id TEXT PRIMARY KEY, itemId TEXT NOT NULL, cron TEXT NOT NULL,
      enabled INTEGER DEFAULT 1, headless INTEGER DEFAULT 1, incremental INTEGER DEFAULT 1,
      autoImport INTEGER DEFAULT 0, tmdbSeason INTEGER DEFAULT 1, tmdbLanguage TEXT DEFAULT 'zh-CN',
      tmdbAutoResponse TEXT DEFAULT 'w', fieldCleanup TEXT DEFAULT '{}',
      lastRunAt TEXT, nextRunAt TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS schedule_logs (
      id TEXT PRIMARY KEY, taskId TEXT NOT NULL, status TEXT NOT NULL,
      startAt TEXT NOT NULL, endAt TEXT, message TEXT NOT NULL, details TEXT,
      FOREIGN KEY (taskId) REFERENCES schedule_tasks(id) ON DELETE CASCADE
    )`);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_tmdbId ON items(tmdbId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_weekday ON items(weekday)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_deletedAt ON items(deletedAt)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_episodes_itemId ON episodes(itemId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_seasons_itemId ON seasons(itemId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_chatId ON messages(chatId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_chatHistories_deletedAt ON chatHistories(deletedAt)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_users_deletedAt ON users(deletedAt)`);

    db.exec(`PRAGMA user_version = 10`);

    db.close();
    electronLog('数据库初始化完成');
  } catch (error) {
    electronLog(
      `数据库初始化失败: ${error instanceof Error ? error.message : String(error)}`,
      'error'
    );
    electronLog(`错误详情: ${error instanceof Error ? error.stack : String(error)}`, 'error');
    try {
      dialog.showErrorBox(
        '数据库初始化失败',
        `无法初始化数据库，请检查 better-sqlite3 是否正确安装。\n\n错误信息: ${error instanceof Error ? error.message : String(error)}`
      );
    } catch (e) {
    }
  }
}

let tray = null;
let isQuitting = false;

function startNextServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      resolve();
      return;
    }

    electronLog('启动 Next.js 服务器...');
    try {
      process.env.NODE_ENV = 'production';

      const appPath = app.getAppPath();
      const exeDir = path.dirname(app.getPath('exe'));

      const possibleNextDirs = [
        path.join(appPath, '.next'),
        path.join(path.dirname(appPath), 'app.asar.unpacked', '.next'),
        path.join(exeDir, 'resources', 'app.asar.unpacked', '.next'),
        path.join(exeDir, 'resources', 'app', '.next'),
        path.join(process.resourcesPath, 'app.asar.unpacked', '.next'),
      ];

      let nextDir = null;
      for (const dir of possibleNextDirs) {
        electronLog(`检查 .next 目录: ${dir} 存在: ${fs.existsSync(dir)}`);
        if (fs.existsSync(dir)) {
          nextDir = dir;
          break;
        }
      }

      if (!nextDir) {
        electronLog('未找到 .next 目录', 'error');
        reject(new Error('Next.js 构建目录不存在'));
        return;
      }

      electronLog(`使用 .next 目录: ${nextDir}`);

      const { createServer } = require('http');
      const next = require('next');
      const { parse } = require('url');

      const appRoot = path.dirname(nextDir);
      electronLog(`应用根目录: ${appRoot}`);

      const nextApp = next({
        dev: false,
        dir: appRoot,
        conf: {
          distDir: '.next',
        },
      });

      const handle = nextApp.getRequestHandler();

      nextApp
        .prepare()
        .then(async () => {
          electronLog('Next.js 准备完成');

          const server = createServer(async (req, res) => {
            try {
              const parsedUrl = parse(req.url, true);
              await handle(req, res, parsedUrl);
            } catch (err) {
              electronLog(`请求处理失败: ${err.message}`, 'error');
              res.statusCode = 500;
              res.end('Internal Server Error');
            }
          });

          server.listen(port, (err) => {
            if (err) {
              electronLog(`服务器启动失败: ${err.message}`, 'error');
              reject(err);
            } else {
              electronLog(`Next.js 服务器已启动 (端口 ${port})`);
              resolve();
            }
          });

          server.on('error', (error) => {
            electronLog(`服务器错误: ${error.message}`, 'error');
            reject(error);
          });
        })
        .catch((error) => {
          electronLog(`Next.js prepare 失败: ${error.message}`, 'error');
          reject(error);
        });
    } catch (error) {
      electronLog(`启动 Next.js 服务器异常: ${error.message}`, 'error');
      reject(error);
    }
  });
}

function openBrowser() {
  const url = `http://localhost:${port}`;
  electronLog(`在浏览器中打开: ${url}`);
  shell.openExternal(url).catch((error) => {
    electronLog(`打开浏览器失败: ${error.message}`, 'error');
    dialog.showErrorBox('打开浏览器失败', `无法在浏览器中打开应用。\n\n错误信息: ${error.message}`);
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/images/tmdb-helper-logo-new.png');

  tray = new Tray(iconPath);
  tray.setToolTip('TMDB Helper');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '在浏览器中打开',
      click: () => {
        openBrowser();
      },
    },
    {
      label: `访问地址: http://localhost:${port}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    openBrowser();
  });

  if (process.platform === 'win32') {
    tray.displayBalloon({
      iconType: 'info',
      title: 'TMDB Helper',
      content: '应用已启动，点击托盘图标可在浏览器中打开',
    });
  }
}

let singleInstanceLock = null;

app.whenReady().then(async () => {
  try {
    singleInstanceLock = app.requestSingleInstanceLock();

    if (!singleInstanceLock) {
      electronLog('检测到应用已在运行，打开现有窗口');
      openBrowser();
      app.quit();
      return;
    }

    app.on('second-instance', () => {
      openBrowser();
    });

    initDataDir();

    if (!isDev) {
      app.commandLine.appendSwitch('max_old_space_size', '1024');
      app.commandLine.appendSwitch('js-flags', '--max-old_space_size=1024');
      app.commandLine.appendSwitch('expose-gc');
      app.commandLine.appendSwitch('optimize-for-size');
      app.commandLine.appendSwitch('disable-background-timer-throttling');
      app.commandLine.appendSwitch('disable-renderer-backgrounding');
      app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
    }

    electronLog(`应用路径: ${app.getAppPath()}`);
    electronLog(`用户数据路径: ${app.getPath('userData')}`);

    await startNextServer();

    createTray();

    setTimeout(() => {
      openBrowser();
    }, isDev ? 1000 : 2000);
  } catch (error) {
    electronLog(`启动失败: ${error.message}`, 'error');
    const errorMessage = `启动失败: ${error.message}\n\n详细信息:\n${error.stack}`;
    dialog.showErrorBox('启动错误', errorMessage);
    app.quit();
  }
});

app.on('window-all-closed', () => {});

app.on('activate', () => {});

app.on('before-quit', () => {
  isQuitting = true;
  if (tray) {
    tray.destroy();
    tray = null;
  }
});