const { app, BrowserWindow, Menu, shell, dialog, ipcMain, Tray } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 开发环境检测
const isDev = process.env.NODE_ENV === 'development' || process.defaultApp || /[\\/]electron/.test(process.execPath);
const port = 3000; // 统一使用3000端口，与Next.js开发服务器保持一致

// 数据目录（在 app.whenReady 后重新计算）
let appDataDir = null;

/**
 * 初始化数据目录和数据库
 * 必须在 app.whenReady() 之后调用
 */
function initDataDir() {
  if (isDev) {
    // 开发环境：使用项目目录下的 data 文件夹
    appDataDir = path.join(process.cwd(), 'data');
  } else {
    // 生产环境：使用应用 exe 所在目录下的 data 文件夹
    // 这样用户可以在安装目录下找到数据文件
    const exeDir = path.dirname(app.getPath('exe'));
    appDataDir = path.join(exeDir, 'data');
  }

  // 确保数据目录存在
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
  }

  // 设置环境变量
  process.env.TMDB_DATA_DIR = appDataDir;
  process.env.ELECTRON_BUILD = 'true';

  console.log('[Electron] 数据目录:', appDataDir);
  console.log('[Electron] exe 路径:', app.getPath('exe'));
  console.log('[Electron] app 路径:', app.getAppPath());
  
  // 初始化数据库
  initDatabase();
}

/**
 * 初始化数据库
 * 使用 better-sqlite3 创建数据库和表（Electron 使用 Node.js 20，不支持 node:sqlite）
 */
function initDatabase() {
  try {
    const dbPath = path.join(appDataDir, 'tmdb-helper.db');
    console.log('[Electron] 初始化数据库:', dbPath);
    
    // 检查数据库是否已存在
    if (fs.existsSync(dbPath)) {
      console.log('[Electron] 数据库已存在，跳过初始化');
      return;
    }
    
    // 使用 better-sqlite3 初始化数据库（Electron 33 使用 Node.js 20，不支持 node:sqlite）
    const Database = require('better-sqlite3');
    console.log('[Electron] 使用 better-sqlite3');
    const db = new Database(dbPath);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    
    // 创建 items 表
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
    
    // 创建 seasons 表
    db.exec(`CREATE TABLE IF NOT EXISTS seasons (
      id TEXT PRIMARY KEY, itemId TEXT NOT NULL, seasonNumber INTEGER NOT NULL,
      name TEXT, totalEpisodes INTEGER NOT NULL, currentEpisode INTEGER,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
      FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE
    )`);
    
    // 创建 episodes 表
    db.exec(`CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY, itemId TEXT NOT NULL, seasonId TEXT,
      seasonNumber INTEGER, number INTEGER NOT NULL, completed INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
      FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (seasonId) REFERENCES seasons(id) ON DELETE CASCADE
    )`);
    
    // 创建 adminUsers 表
    db.exec(`CREATE TABLE IF NOT EXISTS adminUsers (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL, createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL, lastLoginAt TEXT, sessionExpiryDays INTEGER DEFAULT 7,
      deletedAt TEXT
    )`);
    
    // 创建 config 表
    db.exec(`CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    )`);
    
    // 创建 chatHistories 表
    db.exec(`CREATE TABLE IF NOT EXISTS chatHistories (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL, deletedAt TEXT
    )`);
    
    // 创建 messages 表
    db.exec(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, chatId TEXT NOT NULL, role TEXT NOT NULL,
      content TEXT NOT NULL, timestamp TEXT NOT NULL, type TEXT DEFAULT 'text',
      fileName TEXT, fileContent TEXT, isStreaming INTEGER DEFAULT 0,
      suggestions TEXT, rating TEXT, isEdited INTEGER DEFAULT 0,
      canContinue INTEGER DEFAULT 0, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
      FOREIGN KEY (chatId) REFERENCES chatHistories(id) ON DELETE CASCADE
    )`);
    
    // 创建 image_cache 表
    db.exec(`CREATE TABLE IF NOT EXISTS image_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT, tmdbId TEXT NOT NULL, itemId TEXT,
      imageType TEXT NOT NULL, imagePath TEXT, imageUrl TEXT, sizeType TEXT DEFAULT 'original',
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, lastVerifiedAt TEXT,
      isPermanent INTEGER DEFAULT 1, sourceType TEXT DEFAULT 'tmdb',
      UNIQUE(tmdbId, imageType, sizeType)
    )`);
    
    // 创建 schedule_tasks 表
    db.exec(`CREATE TABLE IF NOT EXISTS schedule_tasks (
      id TEXT PRIMARY KEY, itemId TEXT NOT NULL, cron TEXT NOT NULL,
      enabled INTEGER DEFAULT 1, headless INTEGER DEFAULT 1, incremental INTEGER DEFAULT 1,
      autoImport INTEGER DEFAULT 0, tmdbSeason INTEGER DEFAULT 1, tmdbLanguage TEXT DEFAULT 'zh-CN',
      tmdbAutoResponse TEXT DEFAULT 'w', fieldCleanup TEXT DEFAULT '{}',
      lastRunAt TEXT, nextRunAt TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    )`);
    
    // 创建 schedule_logs 表
    db.exec(`CREATE TABLE IF NOT EXISTS schedule_logs (
      id TEXT PRIMARY KEY, taskId TEXT NOT NULL, status TEXT NOT NULL,
      startAt TEXT NOT NULL, endAt TEXT, message TEXT NOT NULL, details TEXT,
      FOREIGN KEY (taskId) REFERENCES schedule_tasks(id) ON DELETE CASCADE
    )`);
    
    // 创建索引
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_tmdbId ON items(tmdbId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_weekday ON items(weekday)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_items_deletedAt ON items(deletedAt)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_episodes_itemId ON episodes(itemId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_seasons_itemId ON seasons(itemId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_chatId ON messages(chatId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_chatHistories_deletedAt ON chatHistories(deletedAt)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_adminUsers_deletedAt ON adminUsers(deletedAt)`);
    
    // 设置 schema 版本
    db.exec(`PRAGMA user_version = 9`);
    
    db.close();
    console.log('[Electron] 数据库初始化完成');
  } catch (error) {
    console.error('[Electron] 数据库初始化失败:', error);
  }
}

let mainWindow;
let tray = null;
let isQuitting = false;

// 创建主窗口
function createWindow() {
  // 获取屏幕尺寸以设置合适的窗口大小
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // 设置窗口尺寸为屏幕的80%，但不超过最大限制
  const windowWidth = Math.min(Math.floor(width * 0.8), 1400);
  const windowHeight = Math.min(Math.floor(height * 0.8), 900);
  
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 1024,  // 降低最小宽度要求至1024px
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      devTools: isDev, // 只在开发环境启用
      webSecurity: true, // 始终启用web安全
      backgroundThrottling: true, // 启用后台节流以节省内存
      spellcheck: false, // 禁用拼写检查
      enableWebSQL: false, // 禁用WebSQL
      experimentalFeatures: false, // 禁用实验性功能
      v8CacheOptions: 'code', // 启用V8代码缓存
      sandbox: true // 启用进程沙盒提升安全性
    },
    icon: path.join(__dirname, '../public/images/tmdb-helper-logo-new.png'),
    show: false,
    // 性能优化选项
    useContentSize: true,
    enableLargerThanScreen: false
  });

  // 添加窗口大小变化监听
  mainWindow.on('resize', () => {
    if (mainWindow) {
      const [width, height] = mainWindow.getSize();
      
      // 发送窗口大小变化事件到渲染进程
      mainWindow.webContents.send('window-resize', { width, height });
    }
  });

  // 添加全屏状态变化监听
  mainWindow.on('enter-full-screen', () => {
    
    // 发送全屏状态变化事件到渲染进程
    mainWindow.webContents.send('fullscreen-change', true);
  });

  mainWindow.on('leave-full-screen', () => {
    
    // 发送全屏状态变化事件到渲染进程
    mainWindow.webContents.send('fullscreen-change', false);
  });

  // 设置 User-Agent 以标识为 Electron 应用
  const originalUA = mainWindow.webContents.getUserAgent();
  const newUA = originalUA + ' TMDB-Helper-Electron';
  mainWindow.webContents.setUserAgent(newUA);
  
  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 禁用拼写检查，避免语言代码问题
    if (mainWindow.webContents.session) {
      mainWindow.webContents.session.setSpellCheckerEnabled(false);
    }

    // 只在开发环境下打开开发者工具
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }

    // 生产环境性能优化
    if (!isDev) {
      // 禁用不必要的功能以节省资源
      mainWindow.webContents.setAudioMuted(true); // 如果不需要音频

      // 优化内存使用
      setInterval(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.session.clearCache();
        }
      }, 300000); // 每5分钟清理一次缓存
    }
  });

  // 添加页面加载事件监听
  mainWindow.webContents.on('did-finish-load', () => {

  });

  // 添加内容安全策略（CSP）
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: blob: https:; " +
          "font-src 'self' data:; " +
          "connect-src 'self' http://localhost:* ws://localhost:*;"
        ]
      }
    });
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    
  });

  mainWindow.webContents.on('dom-ready', () => {
    
  });

  // 加载应用
  const loadApp = async () => {
    try {
      if (isDev) {
        // 开发环境使用本地服务器
        const startUrl = `http://localhost:${port}`;
        
        await mainWindow.loadURL(startUrl);
      } else {
        // 生产环境尝试使用本地服务器，如果失败则使用静态文件
        try {
          const startUrl = `http://localhost:${port}`;
          
          await mainWindow.loadURL(startUrl);
        } catch (serverError) {
          
          // 查找静态HTML文件
          const appPath = app.getAppPath();
          const possiblePaths = [
            path.join(appPath, '.next', 'standalone', 'index.html'),
            path.join(appPath, '.next', 'server', 'pages', 'index.html'),
            path.join(appPath, '.next', 'static', 'index.html'),
            path.join(appPath, 'out', 'index.html'),
            path.join(appPath, 'public', 'index.html'),
            // 添加更多可能的路径
            path.join(appPath, '.next', 'server', 'app', 'index.html'),
            path.join(appPath, '.next', 'server', 'app', 'page.html'),
            path.join(process.resourcesPath, '.next', 'server', 'pages', 'index.html'),
            path.join(process.resourcesPath, '.next', 'standalone', 'index.html'),
            path.join(process.resourcesPath, 'out', 'index.html')
          ];

          let htmlPath = null;
          for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
              htmlPath = p;
              break;
            }
          }

          if (htmlPath) {
            
            await mainWindow.loadFile(htmlPath);
          } else {
            throw new Error('无法找到应用文件');
          }
        }
      }
      
    } catch (error) {
      
      // 显示错误页面
      const errorHtml = `
        <html>
          <head><title>启动错误</title></head>
          <body style="font-family: Arial; padding: 20px; text-align: center;">
            <h1>应用启动失败</h1>
            <p>错误信息: ${error.message}</p>
            <p>请检查应用是否正确构建</p>
            <button onclick="location.reload()">重试</button>
          </body>
        </html>
      `;
      await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    }
  };

  // 延迟加载，给服务器启动时间
  setTimeout(loadApp, isDev ? 1000 : 2000);

  // 处理导航安全
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== `http://localhost:${port}`) {
      event.preventDefault();
    }
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 窗口关闭事件 - 修改为最小化到托盘
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();  // 阻止默认关闭行为
      mainWindow.hide();       // 隐藏窗口到托盘

      // Windows 系统下可以显示托盘提示
      if (process.platform === 'win32' && tray) {
        tray.displayBalloon({
          iconType: 'info',
          title: 'TMDB Helper',
          content: '应用已最小化到系统托盘，点击托盘图标可重新打开'
        });
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    // 注意：这里不销毁 tray，因为应用还在运行
  });
  
  // 添加定期垃圾回收（仅生产环境）
  if (!isDev) {
    setInterval(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.executeJavaScript('if (window.gc) window.gc()');
      }
    }, 300000); // 每5分钟执行一次垃圾回收
  }
}

// 启动 Next.js 服务器
function startNextServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      // 开发环境下，假设 Next.js 已经在运行
      resolve();
      return;
    }

    // 生产环境下直接在当前进程中启动 Next.js
    
    try {
      // 设置 NODE_ENV（TMDB_DATA_DIR 和 ELECTRON_BUILD 已在 initDataDir 中设置）
      process.env.NODE_ENV = 'production';

      // 获取正确的应用路径
      const appPath = app.getAppPath();
      const exeDir = path.dirname(app.getPath('exe'));
      
      // 尝试多个可能的 .next 目录位置
      const possibleNextDirs = [
        path.join(appPath, '.next'),                    // app.asar/.next
        path.join(path.dirname(appPath), 'app.asar.unpacked', '.next'),  // app.asar.unpacked/.next
        path.join(exeDir, 'resources', 'app.asar.unpacked', '.next'),    // exe目录下的 unpacked
        path.join(exeDir, 'resources', 'app', '.next'),                  // exe目录下的 app
        path.join(process.resourcesPath, 'app.asar.unpacked', '.next'),  // resourcesPath 下的 unpacked
      ];

      let nextDir = null;
      for (const dir of possibleNextDirs) {
        console.log('[Electron] 检查 .next 目录:', dir, '存在:', fs.existsSync(dir));
        if (fs.existsSync(dir)) {
          nextDir = dir;
          break;
        }
      }

      if (!nextDir) {
        console.error('[Electron] 未找到 .next 目录');
        reject(new Error('Next.js 构建目录不存在'));
        return;
      }

      console.log('[Electron] 使用 .next 目录:', nextDir);

      // 直接 require server.js 的逻辑
      const { createServer } = require('http');
      const next = require('next');
      const { parse } = require('url');

      // 确定应用根目录（.next 的父目录）
      const appRoot = path.dirname(nextDir);
      console.log('[Electron] 应用根目录:', appRoot);

      const nextApp = next({
        dev: false,
        dir: appRoot,
        conf: {
          distDir: '.next'
        }
      });

      const handle = nextApp.getRequestHandler();

      nextApp.prepare().then(async () => {
        console.log('[Electron] Next.js 准备完成');

        const server = createServer(async (req, res) => {
          try {
            
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
          } catch (err) {
            
            res.statusCode = 500;
            res.end('Internal Server Error');
          }
        });

        server.listen(port, (err) => {
          if (err) {
            
            reject(err);
          } else {

            resolve();
          }
        });

        server.on('error', (error) => {
          
          reject(error);
        });

      }).catch((error) => {
        console.error('[Electron] Next.js prepare 失败:', error);
        reject(error);
      });

    } catch (error) {
      
      reject(error);
    }
  });
}

// 创建应用菜单
function createMenu() {
  // 只在开发环境创建菜单，生产环境隐藏菜单栏
  if (!isDev) {
    Menu.setApplicationMenu(null);
    return;
  }

  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '导入数据',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow.webContents.send('menu-import-data');
          }
        },
        {
          label: '导出数据',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu-export-data');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: '视图',
      submenu: [
        ...(process.env.NODE_ENV === 'development' ? [
          { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
          { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
          { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
          { type: 'separator' }
        ] : []),
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: '开发',
      submenu: [
        {
          label: '打开开发者工具',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        },
        {
          label: '重新加载页面',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.reload();
            }
          }
        },
        {
          label: '强制重新加载',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.reloadIgnoringCache();
            }
          }
        },
        { type: 'separator' },
        {
          label: '清除缓存',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.session.clearCache();
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: '缓存清除',
                message: '缓存已清除',
                detail: '应用缓存已成功清除'
              });
            }
          }
        },
        {
          label: '清除存储数据',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.session.clearStorageData();
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: '存储数据清除',
                message: '存储数据已清除',
                detail: '本地存储、会话存储等数据已清除'
              });
            }
          }
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 TMDB Helper',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于 TMDB Helper',
              message: 'TMDB Helper',
              detail: '版本 0.3.7\n\n一个强大的 TMDB 媒体管理助手桌面应用'
            });
          }
        }
      ]
    }
  ];

  // macOS 特殊处理
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { label: '关于 ' + app.getName(), role: 'about' },
        { type: 'separator' },
        { label: '服务', role: 'services', submenu: [] },
        { type: 'separator' },
        { label: '隐藏 ' + app.getName(), accelerator: 'Command+H', role: 'hide' },
        { label: '隐藏其他', accelerator: 'Command+Shift+H', role: 'hideothers' },
        { label: '显示全部', role: 'unhide' },
        { type: 'separator' },
        { label: '退出', accelerator: 'Command+Q', click: () => app.quit() }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 创建系统托盘
function createTray() {
  // 使用应用图标作为托盘图标
  const iconPath = path.join(__dirname, '../public/images/tmdb-helper-logo-new.png');

  // 创建托盘实例
  tray = new Tray(iconPath);

  // 设置托盘提示文字
  tray.setToolTip('TMDB Helper');

  // 创建托盘右键菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // 点击托盘图标显示/隐藏窗口
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });
}

// 应用事件处理
app.whenReady().then(async () => {
  try {
    // 初始化数据目录（必须在 app.whenReady 之后，startNextServer 之前）
    initDataDir();

    // 生产环境性能优化
    if (!isDev) {
      // 提高内存限制到1024MB，避免内存不足导致崩溃
      app.commandLine.appendSwitch('max_old_space_size', '1024');
      app.commandLine.appendSwitch('js-flags', '--max-old_space_size=1024');

      // 添加垃圾回收优化
      app.commandLine.appendSwitch('expose-gc'); // 暴露垃圾回收
      app.commandLine.appendSwitch('optimize-for-size'); // 优化内存占用

      // 禁用不必要的功能
      app.commandLine.appendSwitch('disable-background-timer-throttling');
      app.commandLine.appendSwitch('disable-renderer-backgrounding');
      app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
    }

    console.log('📁 应用路径:', app.getAppPath());
    console.log('📁 用户数据路径:', app.getPath('userData'));

    // 启动 Next.js 服务器
    
    await startNextServer();
    
    // 创建窗口和菜单
    
    createWindow();

    // 始终创建菜单（包含开发菜单）

    createMenu();

    // 创建系统托盘
    createTray();

  } catch (error) {

    // 显示更详细的错误信息
    const errorMessage = `启动失败: ${error.message}\n\n详细信息:\n${error.stack}`;
    dialog.showErrorBox('启动错误', errorMessage);
  }
});

// 所有窗口关闭时不再自动退出应用（最小化到托盘）
app.on('window-all-closed', () => {
  // 不再自动退出，让应用在后台运行
  // 用户需要通过托盘菜单退出
  if (process.platform === 'darwin') {
    // macOS 特殊处理
    app.quit();
  }
});

// macOS 重新激活应用
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  isQuitting = true;
  // 销毁托盘图标
  if (tray) {
    tray.destroy();
    tray = null;
  }
  // Next.js 服务器在同一进程中，会随应用一起退出
});

// IPC 处理
ipcMain.handle('get-app-data-path', () => {
  return appDataDir;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// 窗口控制
ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    mainWindow.maximize();
  }
});

ipcMain.on('window-unmaximize', () => {
  if (mainWindow) {
    mainWindow.unmaximize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) {
    // 使用 hide() 代替 close()，让窗口最小化到托盘
    mainWindow.hide();
  }
});

ipcMain.handle('window-is-maximized', () => {
  if (mainWindow) {
    return mainWindow.isMaximized();
  }
  return false;
});

// 托盘相关 IPC 接口
ipcMain.handle('get-tray-status', () => {
  return {
    hasTray: !!tray,
    isWindowVisible: mainWindow ? mainWindow.isVisible() : false
  };
});

ipcMain.on('show-window', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.on('hide-window', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});
