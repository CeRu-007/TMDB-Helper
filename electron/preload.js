const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露安全的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用数据路径
  getAppDataPath: () => ipcRenderer.invoke('get-app-data-path'),

  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // 窗口控制
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  unmaximizeWindow: () => ipcRenderer.send('window-unmaximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // 监听菜单事件
  onMenuImportData: (callback) => {
    ipcRenderer.on('menu-import-data', callback);
  },

  onMenuExportData: (callback) => {
    ipcRenderer.on('menu-export-data', callback);
  },

  // 监听窗口大小变化事件
  onWindowResize: (callback) => {
    ipcRenderer.on('window-resize', (event, size) => callback(size));
  },

  // 监听全屏状态变化事件
  onFullscreenChange: (callback) => {
    ipcRenderer.on('fullscreen-change', (event, isFullscreen) => callback(isFullscreen));
  },

  // 移除监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // 平台信息
  platform: process.platform,

  // 是否为桌面应用
  isElectron: true
});

// 在页面加载完成后注入桌面应用标识
window.addEventListener('DOMContentLoaded', () => {
  // 添加桌面应用的 CSS 类
  document.body.classList.add('electron-app');
  
  // 设置全局变量
  window.isElectronApp = true;
});