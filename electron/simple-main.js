const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/images/tmdb-helper-logo-new.png'),
    show: false
  });

  // 查找入口文件
  const appPath = app.getAppPath();
  const possibleEntries = [
    path.join(appPath, '.next', 'server', 'pages', 'index.html'),
    path.join(appPath, 'out', 'index.html'),
    path.join(appPath, 'public', 'index.html')
  ];
  
  let entryFile = null;
  for (const entry of possibleEntries) {
    if (fs.existsSync(entry)) {
      entryFile = entry;
      break;
    }
  }
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 禁用拼写检查，避免语言代码问题
    if (mainWindow.webContents.session) {
      mainWindow.webContents.session.setSpellCheckerEnabled(false);
    }
  });
  
  if (entryFile) {
    
    mainWindow.loadFile(entryFile);
  } else {
    
    mainWindow.loadURL('http://localhost:3000');
  }

  // 安全配置
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:3000') {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const { shell } = require('electron');
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 创建应用菜单
function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
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
              detail: '版本 0.3.7\
\
一个强大的 TMDB 媒体管理助手桌面应用'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 在应用准备就绪时创建菜单
app.whenReady().then(() => {
  createWindow();
  createMenu();
});