const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 开发环境检测
const isDev = process.env.NODE_ENV === 'development';
const port = isDev ? 3000 : 3001; // 生产环境使用不同端口避免冲突

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
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/images/tmdb-helper-logo-new.png'),
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  // 设置 User-Agent 以标识为 Electron 应用
  const originalUA = mainWindow.webContents.getUserAgent();
  const newUA = originalUA + ' TMDB-Helper-Electron';
  mainWindow.webContents.setUserAgent(newUA);
  console.log('🔧 设置 User-Agent:', newUA);

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // 打开开发者工具以便调试
    mainWindow.webContents.openDevTools();
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
  const startUrl = `http://localhost:${port}`;
  console.log('🔗 加载 URL:', startUrl);

  const loadApp = async () => {
    try {
      await mainWindow.loadURL(startUrl);
      console.log('✅ 应用加载成功');
    } catch (error) {
      console.error('❌ 应用加载失败:', error);

      // 如果是生产环境，尝试重新加载
      if (!isDev) {
        console.log('🔄 3秒后重试加载...');
        setTimeout(() => {
          loadApp();
        }, 3000);
      }
    }
  };

  // 延迟加载，给服务器启动时间
  setTimeout(loadApp, isDev ? 1000 : 2000);

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
      const nextDir = path.join(appPath, '.next');

      console.log('📁 应用路径:', appPath);
      console.log('📁 Next.js 构建目录:', nextDir);

      // 检查 .next 目录是否存在
      if (!fs.existsSync(nextDir)) {
        console.error('❌ .next 目录不存在:', nextDir);
        reject(new Error(`Next.js 构建目录不存在: ${nextDir}`));
        return;
      }

      // 直接 require server.js 的逻辑
      const { createServer } = require('http');
      const next = require('next');
      const { parse } = require('url');

      const nextApp = next({
        dev: false,
        dir: appPath,
        conf: {
          distDir: '.next'
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
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' }
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
