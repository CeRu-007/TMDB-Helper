const { app, BrowserWindow } = require('electron');
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
  });
  
  if (entryFile) {
    console.log('📄 加载静态文件:', entryFile);
    mainWindow.loadFile(entryFile);
  } else {
    console.log('🌐 尝试加载本地服务器');
    mainWindow.loadURL('http://localhost:3001');
  }
}

app.whenReady().then(createWindow);

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