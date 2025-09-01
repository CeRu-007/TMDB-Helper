const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 开发环境检测
const isDev = process.env.NODE_ENV === 'development';
const port = 3000; // 统一使用3000端口，与Next.js开发服务器保持一致

// 应用数据目录
const userDataPath = app.getPath('userData');
const appDataDir = path.join(userDataPath, 'tmdb-helper-data');

// 确保数据目录存在
if (!fs.existsSync(appDataDir)) {
  fs.mkdirSync(appDataDir, { recursive: true });
}

let mainWindow;

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
      webSecurity: !isDev, // 生产环境启用web安全
      backgroundThrottling: false, // 禁用后台节流以提高性能
      spellcheck: false, // 禁用拼写检查
      enableWebSQL: false, // 禁用WebSQL
      experimentalFeatures: false, // 禁用实验性功能
      v8CacheOptions: 'code', // 启用V8代码缓存
      sandbox: false // 生产环境可考虑启用沙盒
    },
    icon: path.join(__dirname, '../public/images/tmdb-helper-logo-new.png'),
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    // 性能优化选项
    useContentSize: true,
    enableLargerThanScreen: false
  });

  // 添加窗口大小变化监听
  mainWindow.on('resize', () => {
    if (mainWindow) {
      const [width, height] = mainWindow.getSize();
      console.log(`窗口大小变化: ${width} x ${height}`);
      // 发送窗口大小变化事件到渲染进程
      mainWindow.webContents.send('window-resize', { width, height });
    }
  });

  // 添加全屏状态变化监听
  mainWindow.on('enter-full-screen', () => {
    console.log('进入全屏模式');
    // 发送全屏状态变化事件到渲染进程
    mainWindow.webContents.send('fullscreen-change', true);
  });

  mainWindow.on('leave-full-screen', () => {
    console.log('退出全屏模式');
    // 发送全屏状态变化事件到渲染进程
    mainWindow.webContents.send('fullscreen-change', false);
  });

  // 设置 User-Agent 以标识为 Electron 应用
  const originalUA = mainWindow.webContents.getUserAgent();
  const newUA = originalUA + ' TMDB-Helper-Electron';
  mainWindow.webContents.setUserAgent(newUA);
  console.log('🔧 设置 User-Agent:', newUA);

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
    console.log('✅ 页面加载完成');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ 页面加载失败:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.webContents.on('dom-ready', () => {
    console.log('✅ DOM 准备完成');
  });

  // 加载应用
  const loadApp = async () => {
    try {
      if (isDev) {
        // 开发环境使用本地服务器
        const startUrl = `http://localhost:${port}`;
        console.log('🔗 开发环境加载 URL:', startUrl);
        await mainWindow.loadURL(startUrl);
      } else {
        // 生产环境尝试使用本地服务器，如果失败则使用静态文件
        try {
          const startUrl = `http://localhost:${port}`;
          console.log('🔗 尝试加载本地服务器:', startUrl);
          await mainWindow.loadURL(startUrl);
        } catch (serverError) {
          console.log('⚠️ 本地服务器启动失败，尝试加载静态文件');

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
            console.log('📄 加载静态文件:', htmlPath);
            await mainWindow.loadFile(htmlPath);
          } else {
            throw new Error('无法找到应用文件');
          }
        }
      }
      console.log('✅ 应用加载成功');
    } catch (error) {
      console.error('❌ 应用加载失败:', error);

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

  // 窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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
    console.log('🌐 在当前进程中启动 Next.js 服务器...');

    try {
      // 设置环境变量
      process.env.NODE_ENV = 'production';
      process.env.TMDB_DATA_DIR = appDataDir;
      process.env.ELECTRON_BUILD = 'true';

      // 获取正确的应用路径
      const appPath = app.getAppPath();
      let nextDir = path.join(appPath, '.next');

      // 在打包后的应用中，.next 可能在不同位置
      if (!fs.existsSync(nextDir)) {
        // 尝试在 resources/app.asar/.next
        nextDir = path.join(appPath, '.next');
        if (!fs.existsSync(nextDir)) {
          // 尝试在 resources/.next
          nextDir = path.join(path.dirname(appPath), '.next');
          if (!fs.existsSync(nextDir)) {
            // 尝试在应用根目录
            nextDir = path.join(process.cwd(), '.next');
          }
        }
      }

      console.log('📁 应用路径:', appPath);
      console.log('📁 Next.js 构建目录:', nextDir);
      console.log('📁 .next 目录存在:', fs.existsSync(nextDir));

      // 检查 .next 目录是否存在
      if (!fs.existsSync(nextDir)) {
        console.error('❌ .next 目录不存在，尝试的路径:');
        console.error('  -', path.join(appPath, '.next'));
        console.error('  -', path.join(path.dirname(appPath), '.next'));
        console.error('  -', path.join(process.cwd(), '.next'));
        reject(new Error(`Next.js 构建目录不存在: ${nextDir}`));
        return;
      }

      // 直接 require server.js 的逻辑
      const { createServer } = require('http');
      const next = require('next');
      const { parse } = require('url');

      const nextApp = next({
        dev: false,
        dir: path.dirname(nextDir), // 使用 .next 目录的父目录作为应用目录
        conf: {
          distDir: path.basename(nextDir) // 使用相对路径
        }
      });

      const handle = nextApp.getRequestHandler();

      nextApp.prepare().then(() => {
        const server = createServer(async (req, res) => {
          try {
            console.log(`📥 请求: ${req.method} ${req.url}`);
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
          } catch (err) {
            console.error('请求处理错误:', err);
            res.statusCode = 500;
            res.end('Internal Server Error');
          }
        });

        server.listen(port, (err) => {
          if (err) {
            console.error('服务器启动失败:', err);
            reject(err);
          } else {
            console.log(`✅ Next.js 服务器已启动在端口 ${port}`);
            console.log(`🔗 服务器地址: http://localhost:${port}`);
            resolve();
          }
        });

        server.on('error', (error) => {
          console.error('服务器错误:', error);
          reject(error);
        });

      }).catch((error) => {
        console.error('Next.js 准备失败:', error);
        reject(error);
      });

    } catch (error) {
      console.error('启动 Next.js 失败:', error);
      reject(error);
    }
  });
}

// 创建应用菜单
function createMenu() {
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

// 应用事件处理
app.whenReady().then(async () => {
  try {
    // 生产环境性能优化
    if (!isDev) {
      // 禁用硬件加速（如果遇到GPU问题）
      // app.disableHardwareAcceleration();

      // 限制子进程数量
      app.commandLine.appendSwitch('max_old_space_size', '512'); // 限制V8内存
      app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');

      // 禁用不必要的功能
      app.commandLine.appendSwitch('disable-background-timer-throttling');
      app.commandLine.appendSwitch('disable-renderer-backgrounding');
      app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
    }

    console.log('🚀 开始启动 TMDB Helper 桌面应用');
    console.log('📁 应用路径:', app.getAppPath());
    console.log('📁 用户数据路径:', app.getPath('userData'));
    console.log('🌐 环境:', isDev ? '开发' : '生产');
    console.log('🔗 端口:', port);

    // 启动 Next.js 服务器
    console.log('🌐 启动 Next.js 服务器...');
    await startNextServer();
    console.log('✅ Next.js 服务器启动成功');

    // 创建窗口和菜单
    console.log('🖥️ 创建应用窗口...');
    createWindow();

    // 始终创建菜单（包含开发菜单）
    console.log('🔧 创建应用菜单');
    createMenu();

    console.log('🎉 TMDB Helper 桌面应用启动成功');
  } catch (error) {
    console.error('❌ 应用启动失败:', error);
    console.error('错误堆栈:', error.stack);

    // 显示更详细的错误信息
    const errorMessage = `启动失败: ${error.message}\n\n详细信息:\n${error.stack}`;
    dialog.showErrorBox('启动错误', errorMessage);
  }
});

// 所有窗口关闭时退出应用（除了 macOS）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
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
  // Next.js 服务器在同一进程中，会随应用一起退出
});

// IPC 处理
ipcMain.handle('get-app-data-path', () => {
  return appDataDir;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});
